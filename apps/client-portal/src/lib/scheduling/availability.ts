import { adminDb } from '@/lib/firebase-admin';
import type {
  AvailableSlot,
  SchedulingAvailabilityRule,
  SchedulingEventType,
  SchedulingHost,
  SchedulingHostEventTypeMap,
  SlotQueryInput,
} from '@/lib/scheduling/types';
import { getGoogleBusyRanges } from '@/lib/scheduling/google';

const SLOT_STEP_MINUTES = 15;

interface TimeRange {
  start: Date;
  end: Date;
}

function toIsoDateInTz(date: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date);
}

function getWeekdayInTz(dateIso: string, timeZone: string): number {
  const date = zonedTimeToUtc(dateIso, '12:00', timeZone);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  });
  const day = fmt.format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day);
}

function getOffsetMinutes(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = fmt.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return (asUtc - date.getTime()) / 60000;
}

export function zonedTimeToUtc(dateIso: string, hhmm: string, timeZone: string): Date {
  const [year, month, day] = dateIso.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);

  let utcTs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const guess = new Date(utcTs);
  const offset = getOffsetMinutes(guess, timeZone);
  utcTs -= offset * 60000;

  return new Date(utcTs);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

function dedupeSlots(slots: AvailableSlot[]): AvailableSlot[] {
  const seen = new Set<string>();
  return slots.filter((slot) => {
    const key = `${slot.startAt}__${slot.primaryHostUserId}__${slot.hostUserIds.join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getEventTypeByReference(ref: { eventTypeId?: string; slug?: string }): Promise<SchedulingEventType | null> {
  if (ref.eventTypeId) {
    const snap = await adminDb.collection('schedulingEventTypes').doc(ref.eventTypeId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as SchedulingEventType;
  }

  if (!ref.slug) return null;
  const q = await adminDb
    .collection('schedulingEventTypes')
    .where('slug', '==', ref.slug)
    .limit(1)
    .get();

  if (q.empty) return null;
  const doc = q.docs[0];
  return { id: doc.id, ...doc.data() } as SchedulingEventType;
}

export async function getEventHosts(eventTypeId: string): Promise<{
  hosts: SchedulingHost[];
  hostMaps: SchedulingHostEventTypeMap[];
}> {
  const mapSnap = await adminDb
    .collection('schedulingHostEventTypeMap')
    .where('eventTypeId', '==', eventTypeId)
    .where('active', '==', true)
    .get();

  const hostMaps = mapSnap.docs.map((d) => ({ id: d.id, ...d.data() } as SchedulingHostEventTypeMap));
  if (hostMaps.length === 0) return { hosts: [], hostMaps: [] };

  const hostDocs = await Promise.all(
    hostMaps.map((m) => adminDb.collection('schedulingHosts').doc(m.hostUserId).get()),
  );

  const hosts = hostDocs
    .filter((d) => d.exists)
    .map((d) => ({ id: d.id, ...d.data() } as SchedulingHost))
    .filter((h) => h.active !== false);

  return { hosts, hostMaps };
}

async function getAvailabilityRules(hostIds: string[], eventTypeId: string): Promise<SchedulingAvailabilityRule[]> {
  if (hostIds.length === 0) return [];

  const batches: string[][] = [];
  for (let i = 0; i < hostIds.length; i += 10) batches.push(hostIds.slice(i, i + 10));

  const all: SchedulingAvailabilityRule[] = [];
  for (const batch of batches) {
    const snap = await adminDb
      .collection('schedulingAvailabilityRules')
      .where('hostUserId', 'in', batch)
      .get();

    all.push(
      ...snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as SchedulingAvailabilityRule))
        .filter((r) => !r.eventTypeId || r.eventTypeId === eventTypeId),
    );
  }

  return all;
}

async function getBusyRanges(args: {
  hosts: SchedulingHost[];
  timeMin: string;
  timeMax: string;
  eventTypeId: string;
}): Promise<Record<string, TimeRange[]>> {
  const map: Record<string, TimeRange[]> = {};

  for (const host of args.hosts) {
    const busy: TimeRange[] = [];

    // External calendar busy slots
    const googleBusy = await getGoogleBusyRanges({
      host,
      timeMin: args.timeMin,
      timeMax: args.timeMax,
    });
    busy.push(
      ...googleBusy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) })),
    );

    // Existing internal bookings
    const bookingSnap = await adminDb
      .collection('schedulingBookings')
      .where('hostUserIds', 'array-contains', host.uid)
      .where('status', '==', 'confirmed')
      .where('startAt', '>=', args.timeMin)
      .where('startAt', '<=', args.timeMax)
      .get();

    busy.push(
      ...bookingSnap.docs
        .map((d) => d.data())
        .map((b) => ({ start: new Date(b.startAt), end: new Date(b.endAt) })),
    );

    map[host.uid] = busy;
  }

  return map;
}

function buildHostWindowsForDay(args: {
  host: SchedulingHost;
  dateIso: string;
  weekday: number;
  rules: SchedulingAvailabilityRule[];
}): TimeRange[] {
  const hostTimezone = args.host.timezone || 'UTC';
  const weeklyDefaults = (args.host.defaultAvailability || [])
    .filter((w) => w.weekday === args.weekday)
    .map((w) => ({
      start: zonedTimeToUtc(args.dateIso, w.startTime, hostTimezone),
      end: zonedTimeToUtc(args.dateIso, w.endTime, hostTimezone),
    }));

  const dateRules = args.rules.filter((r) => r.ruleType === 'date_override' && r.date === args.dateIso);

  let windows = [...weeklyDefaults];

  for (const rule of dateRules) {
    if (!rule.startTime || !rule.endTime) continue;
    const range = {
      start: zonedTimeToUtc(args.dateIso, rule.startTime, hostTimezone),
      end: zonedTimeToUtc(args.dateIso, rule.endTime, hostTimezone),
    };

    if (rule.isAvailable) {
      windows.push(range);
    } else {
      windows = windows.filter((w) => !rangesOverlap(w, range));
    }
  }

  return windows.filter((w) => w.start < w.end);
}

function chooseRoundRobinHost(args: {
  availableHostIds: string[];
  hostMaps: SchedulingHostEventTypeMap[];
  cursor: number;
}): string {
  if (args.availableHostIds.length === 1) return args.availableHostIds[0];

  const weighted: string[] = [];
  for (const hostId of args.availableHostIds) {
    const weight = args.hostMaps.find((m) => m.hostUserId === hostId)?.weight || 1;
    for (let i = 0; i < Math.max(1, weight); i++) weighted.push(hostId);
  }

  const index = args.cursor % weighted.length;
  return weighted[index] || args.availableHostIds[0];
}

export async function computeAvailableSlots(input: SlotQueryInput): Promise<{
  eventType: SchedulingEventType;
  slots: AvailableSlot[];
}> {
  const eventType = await getEventTypeByReference({
    eventTypeId: input.eventTypeId,
    slug: input.slug,
  });

  if (!eventType || !eventType.isActive) {
    throw new Error('Event type not found or inactive');
  }

  if (!eventType.id) throw new Error('Event type id missing');

  const { hosts, hostMaps } = await getEventHosts(eventType.id);
  if (hosts.length === 0) return { eventType, slots: [] };

  const startDate = new Date(input.dateRange.start);
  const endDate = new Date(input.dateRange.end);

  const now = new Date();
  const minStart = new Date(now.getTime() + (eventType.minNoticeMinutes || 120) * 60_000);

  const maxWindow = new Date();
  maxWindow.setDate(maxWindow.getDate() + (eventType.bookingWindowDays || 30));

  const queryStart = new Date(Math.max(startDate.getTime(), minStart.getTime()));
  const queryEnd = new Date(Math.min(endDate.getTime(), maxWindow.getTime()));

  if (queryEnd <= queryStart) return { eventType, slots: [] };

  const hostIds = hosts.map((h) => h.uid);
  const rules = await getAvailabilityRules(hostIds, eventType.id);
  const busyMap = await getBusyRanges({
    hosts,
    timeMin: queryStart.toISOString(),
    timeMax: queryEnd.toISOString(),
    eventTypeId: eventType.id,
  });

  const slots: AvailableSlot[] = [];

  for (let dayCursor = new Date(queryStart); dayCursor <= queryEnd; dayCursor.setUTCDate(dayCursor.getUTCDate() + 1)) {
    const dateIso = toIsoDateInTz(dayCursor, eventType.timezone || input.timezone || 'UTC');

    const perHostWindows = new Map<string, TimeRange[]>();

    for (const host of hosts) {
      const weekday = getWeekdayInTz(dateIso, host.timezone || eventType.timezone || 'UTC');
      const hostRules = rules.filter((r) => r.hostUserId === host.uid);
      const windows = buildHostWindowsForDay({ host, dateIso, weekday, rules: hostRules });
      perHostWindows.set(host.uid, windows);
    }

    const candidateStarts = new Set<number>();

    for (const host of hosts) {
      const windows = perHostWindows.get(host.uid) || [];
      for (const window of windows) {
        for (
          let slotStart = new Date(window.start);
          addMinutes(slotStart, eventType.durationMin + eventType.bufferAfterMin) <= window.end;
          slotStart = addMinutes(slotStart, SLOT_STEP_MINUTES)
        ) {
          if (slotStart < queryStart || slotStart > queryEnd) continue;
          candidateStarts.add(slotStart.getTime());
        }
      }
    }

    const sortedStarts = Array.from(candidateStarts).sort((a, b) => a - b);

    for (const slotStartMs of sortedStarts) {
      const slotStart = new Date(slotStartMs);
      const slotEnd = addMinutes(slotStart, eventType.durationMin);
      const availabilityEnd = addMinutes(slotEnd, eventType.bufferAfterMin);
      const availabilityStart = addMinutes(slotStart, -eventType.bufferBeforeMin);

      const availableHostIds: string[] = [];

      for (const host of hosts) {
        const hostWindows = perHostWindows.get(host.uid) || [];
        const insideWindow = hostWindows.some((window) =>
          availabilityStart >= window.start && availabilityEnd <= window.end,
        );
        if (!insideWindow) continue;

        const busy = busyMap[host.uid] || [];
        const intersectsBusy = busy.some((b) =>
          rangesOverlap({ start: availabilityStart, end: availabilityEnd }, b),
        );

        if (!intersectsBusy) {
          availableHostIds.push(host.uid);
        }
      }

      if (eventType.routingMode === 'collective_required') {
        const collectiveHostIds = hostMaps.map((m) => m.hostUserId);
        const allFree = collectiveHostIds.length > 0 && collectiveHostIds.every((hostId) => availableHostIds.includes(hostId));
        if (!allFree) continue;

        const primary = collectiveHostIds[0];
        slots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          timezone: input.timezone,
          hostUserIds: collectiveHostIds,
          primaryHostUserId: primary,
        });
        continue;
      }

      if (eventType.routingMode === 'host_fixed') {
        const fixedHost = eventType.fixedHostUserId || hostMaps[0]?.hostUserId;
        if (!fixedHost || !availableHostIds.includes(fixedHost)) continue;

        slots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          timezone: input.timezone,
          hostUserIds: [fixedHost],
          primaryHostUserId: fixedHost,
        });
        continue;
      }

      if (availableHostIds.length === 0) continue;

      const primary = chooseRoundRobinHost({
        availableHostIds,
        hostMaps,
        cursor: (eventType.roundRobinCursor || 0) + Math.floor(slotStartMs / 60_000),
      });

      slots.push({
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        timezone: input.timezone,
        hostUserIds: [primary],
        primaryHostUserId: primary,
      });
    }
  }

  const deduped = dedupeSlots(slots).sort((a, b) => a.startAt.localeCompare(b.startAt));
  return { eventType, slots: deduped };
}

export async function checkHostAvailabilityForExactSlot(args: {
  eventType: SchedulingEventType;
  hostIds: string[];
  startAt: string;
  endAt: string;
}): Promise<boolean> {
  const hostsSnap = await Promise.all(
    args.hostIds.map((id) => adminDb.collection('schedulingHosts').doc(id).get()),
  );

  const hosts = hostsSnap
    .filter((s) => s.exists)
    .map((s) => ({ id: s.id, ...s.data() } as SchedulingHost));

  if (hosts.length !== args.hostIds.length) return false;

  const busy = await getBusyRanges({
    hosts,
    timeMin: args.startAt,
    timeMax: args.endAt,
    eventTypeId: args.eventType.id!,
  });

  const range = { start: new Date(args.startAt), end: new Date(args.endAt) };

  return args.hostIds.every((hostId) => {
    const hostBusy = busy[hostId] || [];
    return !hostBusy.some((b) => rangesOverlap(range, b));
  });
}
