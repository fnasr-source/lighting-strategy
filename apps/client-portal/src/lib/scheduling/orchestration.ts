import admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import {
  checkHostAvailabilityForExactSlot,
  computeAvailableSlots,
  getEventHosts,
  getEventTypeByReference,
} from '@/lib/scheduling/availability';
import {
  cancelGoogleCalendarEvent,
  createGoogleCalendarEvent,
  patchGoogleCalendarEvent,
} from '@/lib/scheduling/google';
import {
  sendBookingCancellationEmail,
  sendBookingConfirmationEmail,
  sendBookingReminderEmail,
  sendBookingRescheduledEmail,
  sendInternalBookingAlert,
} from '@/lib/scheduling/emails';
import {
  createManageToken,
  decryptSensitive,
  encryptSensitive,
  isManageTokenValid,
  parseManageToken,
  sha256Hex,
} from '@/lib/scheduling/security';
import type {
  BookingRequestInput,
  SchedulingBooking,
  SchedulingEventType,
  SchedulingHost,
  SchedulingReminderQueueItem,
} from '@/lib/scheduling/types';

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone?: string): string {
  return String(phone || '').replace(/[^\d+]/g, '');
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function mapHostsByUid(hosts: SchedulingHost[]): Record<string, SchedulingHost> {
  return hosts.reduce<Record<string, SchedulingHost>>((acc, host) => {
    acc[host.uid] = host;
    return acc;
  }, {});
}

async function appendBookingEvent(args: {
  bookingId: string;
  eventType: 'created' | 'rescheduled' | 'cancelled' | 'reminder_sent' | 'updated';
  actorType: 'invitee' | 'host' | 'system';
  actorId?: string;
  details?: Record<string, unknown>;
}) {
  await adminDb.collection('schedulingBookingEvents').add({
    bookingId: args.bookingId,
    eventType: args.eventType,
    actorType: args.actorType,
    actorId: args.actorId || '',
    details: args.details || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function queueBookingReminders(booking: SchedulingBooking, eventType: SchedulingEventType) {
  const reminders: Array<{ type: '24h' | '1h'; minutes: number }> = [
    { type: '24h', minutes: eventType.reminderPolicy?.firstMinutesBefore || 24 * 60 },
    { type: '1h', minutes: eventType.reminderPolicy?.secondMinutesBefore || 60 },
  ];

  const updates: Promise<unknown>[] = [];

  for (const reminder of reminders) {
    const scheduledFor = new Date(new Date(booking.startAt).getTime() - reminder.minutes * 60_000);
    if (scheduledFor.getTime() <= Date.now()) continue;

    const id = `${booking.id}_${reminder.type}`;
    const payload: SchedulingReminderQueueItem = {
      bookingId: booking.id!,
      reminderType: reminder.type,
      scheduledFor: scheduledFor.toISOString(),
      status: 'pending',
      idempotencyKey: `${booking.id}_${reminder.type}_${scheduledFor.toISOString()}`,
      attempts: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    updates.push(adminDb.collection('schedulingReminderQueue').doc(id).set(payload, { merge: true }));
  }

  await Promise.all(updates);
}

async function cancelPendingReminders(bookingId: string) {
  const snap = await adminDb
    .collection('schedulingReminderQueue')
    .where('bookingId', '==', bookingId)
    .where('status', '==', 'pending')
    .get();

  if (snap.empty) return;

  const updates = snap.docs.map((doc) =>
    doc.ref.set(
      {
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
  );

  await Promise.all(updates);
}

async function applyWorkflowLinking(booking: SchedulingBooking, eventType: SchedulingEventType) {
  const email = normalizeEmail(booking.invitee.email);
  const phone = normalizePhone(booking.invitee.phone);

  let linkedClientId = booking.linkedClientId;
  let linkedLeadId = booking.linkedLeadId;

  const clientByEmail = await adminDb.collection('clients').where('email', '==', email).limit(1).get();
  let clientDoc = clientByEmail.docs[0];

  if (!clientDoc && phone) {
    const byPhone = await adminDb.collection('clients').where('phone', '==', phone).limit(1).get();
    clientDoc = byPhone.docs[0];
  }

  if (clientDoc) {
    linkedClientId = clientDoc.id;
    await clientDoc.ref.set(
      {
        nextMeetingAt: booking.startAt,
        lastMeetingAt: booking.startAt,
        meetingCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  if (!linkedClientId) {
    const leadByEmail = await adminDb.collection('leads').where('email', '==', email).limit(1).get();
    let leadDoc = leadByEmail.docs[0];

    if (!leadDoc && phone) {
      const byPhone = await adminDb.collection('leads').where('phone', '==', phone).limit(1).get();
      leadDoc = byPhone.docs[0];
    }

    if (leadDoc) {
      linkedLeadId = leadDoc.id;
      const existing = leadDoc.data() as { status?: string };
      const shouldPromote = eventType.slug === 'discovery-call' && existing.status === 'new';

      await leadDoc.ref.set(
        {
          ...(shouldPromote ? { status: 'contacted' } : {}),
          nextMeetingAt: booking.startAt,
          lastMeetingAt: booking.startAt,
          meetingCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } else if (eventType.audienceCase === 'lead' || eventType.slug === 'discovery-call') {
      const created = await adminDb.collection('leads').add({
        name: booking.invitee.name,
        email,
        phone: phone || '',
        company: booking.invitee.company || '',
        source: booking.source?.type === 'campaign' ? 'inbound' : 'inbound',
        priority: 'B',
        status: 'contacted',
        notes: `Auto-created from scheduling booking ${booking.id}`,
        nextMeetingAt: booking.startAt,
        lastMeetingAt: booking.startAt,
        meetingCount: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      linkedLeadId = created.id;
    }
  }

  if (linkedClientId || linkedLeadId) {
    await adminDb.collection('schedulingBookings').doc(booking.id!).set(
      {
        linkedClientId: linkedClientId || '',
        linkedLeadId: linkedLeadId || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await adminDb.collection('tasks').add({
    bookingId: booking.id,
    title: `Follow-up: ${booking.eventName} with ${booking.invitee.name}`,
    description: `Prepare for scheduled meeting (${booking.startAt}) and confirm owner handoff if needed.`,
    assignedToUid: booking.primaryHostUserId,
    dueAt: booking.startAt,
    status: 'open',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function attachGoogleEvents(args: {
  booking: SchedulingBooking;
  eventType: SchedulingEventType;
  hosts: SchedulingHost[];
}) {
  const googleEventIds: Record<string, string> = {};
  let meetLink = args.booking.googleMeetLink || '';

  for (const host of args.hosts) {
    if (!args.booking.hostUserIds.includes(host.uid)) continue;

    const event = await createGoogleCalendarEvent({
      host,
      summary: `${args.eventType.name} — ${args.booking.invitee.name}`,
      description: `Booking ID: ${args.booking.id}\nInvitee: ${args.booking.invitee.email}`,
      startAt: args.booking.startAt,
      endAt: args.booking.endAt,
      inviteeEmail: args.booking.invitee.email,
      inviteeName: args.booking.invitee.name,
      timezone: args.booking.invitee.timezone || args.eventType.timezone,
    });

    if (!event) continue;
    googleEventIds[host.uid] = event.eventId;
    if (!meetLink && event.meetLink) meetLink = event.meetLink;
  }

  await adminDb.collection('schedulingBookings').doc(args.booking.id!).set(
    {
      googleEventIds,
      googleMeetLink: meetLink || '',
      locationText:
        meetLink ||
        (args.eventType.locationType === 'custom' ? args.eventType.locationDetails || '' : 'Google Meet'),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { googleEventIds, meetLink };
}

function getHostEmails(hosts: SchedulingHost[], hostIds: string[]): string[] {
  return hosts.filter((h) => hostIds.includes(h.uid)).map((h) => h.email).filter(Boolean);
}

export async function createSchedulingBooking(args: {
  input: BookingRequestInput;
  ipAddress: string;
  userAgent?: string;
}) {
  const eventType = await getEventTypeByReference({
    eventTypeId: args.input.eventTypeId,
    slug: args.input.slug,
  });

  if (!eventType || !eventType.id || !eventType.isActive) {
    throw new Error('Event type unavailable');
  }

  const inviteeEmail = normalizeEmail(args.input.invitee.email);
  if (!inviteeEmail) throw new Error('Invitee email is required');

  const { slots } = await computeAvailableSlots({
    eventTypeId: eventType.id,
    timezone: args.input.invitee.timezone || eventType.timezone,
    dateRange: {
      start: addMinutes(args.input.slot.startAt, -60),
      end: addMinutes(args.input.slot.startAt, 60),
    },
  });

  const selectedSlot = slots.find((s) => s.startAt === new Date(args.input.slot.startAt).toISOString());
  if (!selectedSlot) {
    throw new Error('Selected slot is no longer available');
  }

  const { hosts } = await getEventHosts(eventType.id);
  const hostMap = mapHostsByUid(hosts);

  const manageToken = createManageToken(adminDb.collection('schedulingBookings').doc().id);
  const bookingId = manageToken.bookingId;

  const bookingRef = adminDb.collection('schedulingBookings').doc(bookingId);
  const lockId = `${eventType.id}_${new Date(selectedSlot.startAt).getTime()}_${selectedSlot.primaryHostUserId}`;
  const lockRef = adminDb.collection('schedulingSlotLocks').doc(lockId);

  const baseBooking: SchedulingBooking = {
    id: bookingId,
    eventTypeId: eventType.id,
    eventSlug: eventType.slug,
    eventName: eventType.name,
    audienceCase: eventType.audienceCase,
    routingMode: eventType.routingMode,
    invitee: {
      name: args.input.invitee.name,
      email: inviteeEmail,
      phone: normalizePhone(args.input.invitee.phone),
      company: args.input.invitee.company || '',
      timezone: args.input.invitee.timezone || eventType.timezone,
    },
    intakeResponses: args.input.intakeResponses || {},
    hostUserIds: selectedSlot.hostUserIds,
    primaryHostUserId: selectedSlot.primaryHostUserId,
    startAt: selectedSlot.startAt,
    endAt: selectedSlot.endAt,
    status: 'confirmed',
    googleEventIds: {},
    googleMeetLink: '',
    locationText: eventType.locationType === 'custom' ? eventType.locationDetails || '' : 'Google Meet',
    manageTokenHash: manageToken.hash,
    manageTokenExpiresAt: manageToken.expiresAt,
    manageTokenEnc: encryptSensitive(manageToken.token),
    source: {
      type: args.input.source?.type || 'public',
      ...(args.input.source?.campaignId ? { campaignId: args.input.source.campaignId } : {}),
      ...(args.input.source?.utm ? { utm: args.input.source.utm } : {}),
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as SchedulingBooking;

  const eventTypeDocId = eventType.id || args.input.eventTypeId || '';

  await adminDb.runTransaction(async (tx) => {
    const existingLock = await tx.get(lockRef);
    if (existingLock.exists) {
      const lockData = existingLock.data() as { expiresAt?: string };
      const expiresAt = lockData?.expiresAt ? new Date(lockData.expiresAt).getTime() : 0;
      if (expiresAt > Date.now()) {
        throw new Error('Slot just got booked. Please pick another slot.');
      }
    }

    tx.set(lockRef, {
      bookingId,
      eventTypeId: eventType.id,
      slotStartAt: selectedSlot.startAt,
      hostUserIds: selectedSlot.hostUserIds,
      expiresAt: new Date(Date.now() + 2 * 60_000).toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.set(bookingRef, baseBooking);

    if (eventType.routingMode === 'round_robin_weighted' && eventTypeDocId) {
      tx.set(
        adminDb.collection('schedulingEventTypes').doc(eventTypeDocId),
        {
          roundRobinCursor: (eventType.roundRobinCursor || 0) + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  const selectedHosts = selectedSlot.hostUserIds
    .map((uid) => hostMap[uid])
    .filter(Boolean);

  const { meetLink } = await attachGoogleEvents({
    booking: { ...baseBooking, id: bookingId },
    eventType,
    hosts: selectedHosts,
  });

  const finalBookingSnap = await bookingRef.get();
  const finalBooking = { id: finalBookingSnap.id, ...finalBookingSnap.data() } as SchedulingBooking;
  if (meetLink) finalBooking.googleMeetLink = meetLink;

  await queueBookingReminders(finalBooking, eventType);
  await applyWorkflowLinking(finalBooking, eventType);

  await appendBookingEvent({
    bookingId,
    eventType: 'created',
    actorType: 'invitee',
    details: {
      ipAddress: args.ipAddress,
      userAgent: args.userAgent || '',
      source: finalBooking.source,
    },
  });

  const hostEmails = getHostEmails(selectedHosts, selectedSlot.hostUserIds);

  await sendBookingConfirmationEmail({
    booking: finalBooking,
    eventType,
    manageToken: manageToken.token,
  });

  await sendInternalBookingAlert({
    subject: `New booking: ${eventType.name}`,
    booking: finalBooking,
    eventType,
    hostEmails,
  });

  return {
    booking: finalBooking,
    eventType,
    manageToken: manageToken.token,
  };
}

export async function resolveBookingFromManageToken(token: string): Promise<{
  booking: SchedulingBooking;
  eventType: SchedulingEventType;
}> {
  const parsed = parseManageToken(token);
  if (!parsed) throw new Error('Invalid manage token format');

  const bookingSnap = await adminDb.collection('schedulingBookings').doc(parsed.bookingId).get();
  if (!bookingSnap.exists) throw new Error('Booking not found');

  const booking = { id: bookingSnap.id, ...bookingSnap.data() } as SchedulingBooking;

  if (!isManageTokenValid({
    providedNonce: parsed.nonce,
    storedHash: booking.manageTokenHash,
    expiresAt: booking.manageTokenExpiresAt,
  })) {
    throw new Error('Manage token expired or invalid');
  }

  const eventType = await getEventTypeByReference({ eventTypeId: booking.eventTypeId });
  if (!eventType) throw new Error('Event type not found');

  return { booking, eventType };
}

export async function cancelSchedulingBooking(args: {
  bookingId: string;
  reason?: string;
  actorType: 'invitee' | 'host' | 'system';
  actorId?: string;
}) {
  const bookingRef = adminDb.collection('schedulingBookings').doc(args.bookingId);
  const snap = await bookingRef.get();
  if (!snap.exists) throw new Error('Booking not found');

  const booking = { id: snap.id, ...snap.data() } as SchedulingBooking;
  if (booking.status === 'cancelled') return booking;

  const eventType = await getEventTypeByReference({ eventTypeId: booking.eventTypeId });
  if (!eventType) throw new Error('Event type missing');

  const cutoffMs = (eventType.cancelCutoffHours || 4) * 60 * 60 * 1000;
  if (new Date(booking.startAt).getTime() - Date.now() < cutoffMs) {
    throw new Error('Cancellation window has passed');
  }

  await bookingRef.set(
    {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledReason: args.reason || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const hostDocs = await Promise.all(
    booking.hostUserIds.map((uid) => adminDb.collection('schedulingHosts').doc(uid).get()),
  );

  const hosts = hostDocs
    .filter((d) => d.exists)
    .map((d) => ({ id: d.id, ...d.data() } as SchedulingHost));

  for (const host of hosts) {
    const eventId = booking.googleEventIds?.[host.uid];
    if (eventId) {
      await cancelGoogleCalendarEvent({ host, eventId });
    }
  }

  await cancelPendingReminders(booking.id!);

  await appendBookingEvent({
    bookingId: booking.id!,
    eventType: 'cancelled',
    actorType: args.actorType,
    actorId: args.actorId,
    details: { reason: args.reason || '' },
  });

  const finalSnap = await bookingRef.get();
  const finalBooking = { id: finalSnap.id, ...finalSnap.data() } as SchedulingBooking;

  await sendBookingCancellationEmail({ booking: finalBooking, eventType });
  await sendInternalBookingAlert({
    subject: `Booking cancelled: ${eventType.name}`,
    booking: finalBooking,
    eventType,
    hostEmails: getHostEmails(hosts, booking.hostUserIds),
  });

  return finalBooking;
}

export async function rescheduleSchedulingBooking(args: {
  bookingId: string;
  newStartAt: string;
  actorType: 'invitee' | 'host' | 'system';
  actorId?: string;
}) {
  const bookingRef = adminDb.collection('schedulingBookings').doc(args.bookingId);
  const snap = await bookingRef.get();
  if (!snap.exists) throw new Error('Booking not found');

  const booking = { id: snap.id, ...snap.data() } as SchedulingBooking;
  if (booking.status !== 'confirmed') {
    throw new Error('Only confirmed bookings can be rescheduled');
  }

  const eventType = await getEventTypeByReference({ eventTypeId: booking.eventTypeId });
  if (!eventType || !eventType.id) throw new Error('Event type missing');

  const cutoffMs = (eventType.cancelCutoffHours || 4) * 60 * 60 * 1000;
  if (new Date(booking.startAt).getTime() - Date.now() < cutoffMs) {
    throw new Error('Reschedule window has passed');
  }

  const newEndAt = addMinutes(args.newStartAt, eventType.durationMin);

  const stillAvailable = await checkHostAvailabilityForExactSlot({
    eventType,
    hostIds: booking.hostUserIds,
    startAt: new Date(args.newStartAt).toISOString(),
    endAt: new Date(newEndAt).toISOString(),
  });

  if (!stillAvailable) {
    throw new Error('Selected time is not available for assigned host(s)');
  }

  await bookingRef.set(
    {
      previousStartAt: booking.startAt,
      previousEndAt: booking.endAt,
      startAt: new Date(args.newStartAt).toISOString(),
      endAt: new Date(newEndAt).toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const hostDocs = await Promise.all(
    booking.hostUserIds.map((uid) => adminDb.collection('schedulingHosts').doc(uid).get()),
  );

  const hosts = hostDocs
    .filter((d) => d.exists)
    .map((d) => ({ id: d.id, ...d.data() } as SchedulingHost));

  for (const host of hosts) {
    const eventId = booking.googleEventIds?.[host.uid];
    if (!eventId) continue;

    await patchGoogleCalendarEvent({
      host,
      eventId,
      startAt: new Date(args.newStartAt).toISOString(),
      endAt: new Date(newEndAt).toISOString(),
      timezone: booking.invitee.timezone || eventType.timezone,
    });
  }

  await cancelPendingReminders(booking.id!);

  const updatedSnap = await bookingRef.get();
  const updated = { id: updatedSnap.id, ...updatedSnap.data() } as SchedulingBooking;
  await queueBookingReminders(updated, eventType);

  await appendBookingEvent({
    bookingId: booking.id!,
    eventType: 'rescheduled',
    actorType: args.actorType,
    actorId: args.actorId,
    details: {
      previousStartAt: booking.startAt,
      newStartAt: updated.startAt,
    },
  });

  let manageToken = '';
  if (updated.manageTokenEnc) {
    try {
      manageToken = decryptSensitive(updated.manageTokenEnc);
    } catch {
      manageToken = `${updated.id}_${sha256Hex(updated.id || '').slice(0, 8)}`;
    }
  }

  await sendBookingRescheduledEmail({
    booking: updated,
    eventType,
    manageToken,
  });

  await sendInternalBookingAlert({
    subject: `Booking rescheduled: ${eventType.name}`,
    booking: updated,
    eventType,
    hostEmails: getHostEmails(hosts, booking.hostUserIds),
  });

  return updated;
}

export async function dispatchSchedulingReminders(limit = 100) {
  const nowIso = new Date().toISOString();

  const reminderSnap = await adminDb
    .collection('schedulingReminderQueue')
    .where('status', '==', 'pending')
    .where('scheduledFor', '<=', nowIso)
    .orderBy('scheduledFor', 'asc')
    .limit(limit)
    .get();

  const result = {
    processed: 0,
    sent: 0,
    failed: 0,
  };

  for (const doc of reminderSnap.docs) {
    result.processed += 1;
    const reminder = { id: doc.id, ...doc.data() } as SchedulingReminderQueueItem;

    try {
      const bookingSnap = await adminDb.collection('schedulingBookings').doc(reminder.bookingId).get();
      if (!bookingSnap.exists) {
        await doc.ref.set(
          { status: 'failed', lastError: 'Booking not found', attempts: admin.firestore.FieldValue.increment(1), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true },
        );
        result.failed += 1;
        continue;
      }

      const booking = { id: bookingSnap.id, ...bookingSnap.data() } as SchedulingBooking;

      if (booking.status !== 'confirmed') {
        await doc.ref.set(
          { status: 'cancelled', updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true },
        );
        continue;
      }

      const eventType = await getEventTypeByReference({ eventTypeId: booking.eventTypeId });
      if (!eventType) {
        await doc.ref.set(
          { status: 'failed', lastError: 'Event type missing', attempts: admin.firestore.FieldValue.increment(1), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true },
        );
        result.failed += 1;
        continue;
      }

      let manageToken = '';
      if (booking.manageTokenEnc) {
        manageToken = decryptSensitive(booking.manageTokenEnc);
      }

      await sendBookingReminderEmail({
        booking,
        eventType,
        manageToken,
        reminderType: reminder.reminderType,
      });

      await doc.ref.set(
        {
          status: 'sent',
          sentAt: new Date().toISOString(),
          attempts: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      await appendBookingEvent({
        bookingId: booking.id!,
        eventType: 'reminder_sent',
        actorType: 'system',
        details: { reminderType: reminder.reminderType },
      });

      result.sent += 1;
    } catch (err: unknown) {
      await doc.ref.set(
        {
          status: 'failed',
          lastError: err instanceof Error ? err.message : 'Reminder send failed',
          attempts: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      result.failed += 1;
    }
  }

  return result;
}
