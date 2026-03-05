import { getSecret } from '@/lib/secrets';
import type { SchedulingBooking, SchedulingEventType } from '@/lib/scheduling/types';
import type { CreateEmailOptions } from 'resend';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'hello@admireworks.com';
}

function buildBookingManageUrl(token: string): string {
  return `${getBaseUrl()}/api/scheduling/manage/${token}?redirect=1`;
}

function formatWhen(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function createIcsContent(args: {
  uid: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location?: string;
}) {
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const start = args.startAt.replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = args.endAt.replace(/[-:]/g, '').split('.')[0] + 'Z';
  const safe = (v: string) => v.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Admireworks//Scheduling//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${args.uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${safe(args.title)}`,
    `DESCRIPTION:${safe(args.description)}`,
    `LOCATION:${safe(args.location || 'Google Meet')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

async function sendEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  icsContent?: string;
  icsFilename?: string;
}) {
  const { Resend } = await import('resend');
  const apiKey = await getSecret('RESEND_API_KEY');
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');

  const resend = new Resend(apiKey);
  const to = Array.isArray(args.to) ? args.to : [args.to];
  const payload: CreateEmailOptions = {
    from: `Admireworks <${getFromEmail()}>`,
    to,
    subject: args.subject,
    html: args.html,
    ...(args.text ? { text: args.text } : {}),
    ...(args.icsContent
      ? {
          attachments: [
            {
              filename: args.icsFilename || 'meeting.ics',
              content: Buffer.from(args.icsContent, 'utf8').toString('base64'),
            },
          ],
        }
      : {}),
  };
  await resend.emails.send(payload);
}

function bookingEmailShell(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f0f2f8;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;">
        <tr>
          <td style="background:#001a70;padding:18px 24px;border-radius:12px 12px 0 0;">
            <span style="color:#cc9f53;font-weight:800;letter-spacing:0.6px;">ADMIREWORKS</span>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:26px;border-radius:0 0 12px 12px;">
            ${content}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendBookingConfirmationEmail(args: {
  booking: SchedulingBooking;
  eventType: SchedulingEventType;
  manageToken: string;
}) {
  const manageUrl = buildBookingManageUrl(args.manageToken);
  const whenText = formatWhen(args.booking.startAt, args.booking.invitee.timezone || 'UTC');

  const ics = createIcsContent({
    uid: `booking-${args.booking.id || Date.now()}@admireworks.com`,
    title: `${args.eventType.name} — Admireworks`,
    description: `Your booking with Admireworks is confirmed. Manage: ${manageUrl}`,
    startAt: args.booking.startAt,
    endAt: args.booking.endAt,
    location: args.booking.googleMeetLink || args.booking.locationText || 'Google Meet',
  });

  await sendEmail({
    to: args.booking.invitee.email,
    subject: `Confirmed: ${args.eventType.name}`,
    html: bookingEmailShell(`
      <h2 style="margin:0 0 12px;color:#001a70;">Booking Confirmed</h2>
      <p style="margin:0 0 10px;color:#334155;">Hi ${args.booking.invitee.name}, your ${args.eventType.name} is booked.</p>
      <p style="margin:0 0 8px;"><strong>When:</strong> ${whenText} (${args.booking.invitee.timezone})</p>
      <p style="margin:0 0 8px;"><strong>Location:</strong> ${args.booking.googleMeetLink || args.booking.locationText || 'Google Meet link will be shared shortly.'}</p>
      <p style="margin:16px 0 0;"><a href="${manageUrl}" style="display:inline-block;background:#001a70;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">Manage Booking</a></p>
    `),
    text: `Booking confirmed for ${whenText}. Manage booking: ${manageUrl}`,
    icsContent: ics,
    icsFilename: `admireworks-${args.eventType.slug}.ics`,
  });
}

export async function sendBookingReminderEmail(args: {
  booking: SchedulingBooking;
  eventType: SchedulingEventType;
  manageToken: string;
  reminderType: '24h' | '1h';
}) {
  const whenText = formatWhen(args.booking.startAt, args.booking.invitee.timezone || 'UTC');
  const manageUrl = buildBookingManageUrl(args.manageToken);
  const label = args.reminderType === '24h' ? 'Reminder: tomorrow' : 'Reminder: starting soon';

  await sendEmail({
    to: args.booking.invitee.email,
    subject: `${label} — ${args.eventType.name}`,
    html: bookingEmailShell(`
      <h2 style="margin:0 0 12px;color:#001a70;">${label}</h2>
      <p style="margin:0 0 10px;color:#334155;">Your meeting is scheduled for ${whenText}.</p>
      <p style="margin:0 0 10px;"><strong>Meeting link:</strong> ${args.booking.googleMeetLink || args.booking.locationText || 'Will be provided by host.'}</p>
      <p style="margin:16px 0 0;"><a href="${manageUrl}" style="display:inline-block;background:#001a70;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">Manage Booking</a></p>
    `),
  });
}

export async function sendBookingCancellationEmail(args: {
  booking: SchedulingBooking;
  eventType: SchedulingEventType;
}) {
  await sendEmail({
    to: args.booking.invitee.email,
    subject: `Cancelled: ${args.eventType.name}`,
    html: bookingEmailShell(`
      <h2 style="margin:0 0 12px;color:#001a70;">Booking Cancelled</h2>
      <p style="margin:0;color:#334155;">Your ${args.eventType.name} booking has been cancelled.</p>
    `),
  });
}

export async function sendBookingRescheduledEmail(args: {
  booking: SchedulingBooking;
  eventType: SchedulingEventType;
  manageToken: string;
}) {
  const whenText = formatWhen(args.booking.startAt, args.booking.invitee.timezone || 'UTC');
  const manageUrl = buildBookingManageUrl(args.manageToken);

  await sendEmail({
    to: args.booking.invitee.email,
    subject: `Rescheduled: ${args.eventType.name}`,
    html: bookingEmailShell(`
      <h2 style="margin:0 0 12px;color:#001a70;">Booking Rescheduled</h2>
      <p style="margin:0 0 8px;color:#334155;">Your updated time is ${whenText}.</p>
      <p style="margin:0 0 8px;"><strong>Meeting link:</strong> ${args.booking.googleMeetLink || args.booking.locationText || 'Will be provided by host.'}</p>
      <p style="margin:16px 0 0;"><a href="${manageUrl}" style="display:inline-block;background:#001a70;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">Manage Booking</a></p>
    `),
  });
}

export async function sendInternalBookingAlert(args: {
  subject: string;
  booking: SchedulingBooking;
  eventType: SchedulingEventType;
  hostEmails?: string[];
}) {
  const companyRecipient = process.env.RESEND_FROM_EMAIL || 'hello@admireworks.com';
  const recipients = Array.from(new Set([companyRecipient, ...(args.hostEmails || [])]));

  await sendEmail({
    to: recipients,
    subject: args.subject,
    html: bookingEmailShell(`
      <h2 style="margin:0 0 12px;color:#001a70;">${args.subject}</h2>
      <p style="margin:0 0 8px;"><strong>Event:</strong> ${args.eventType.name}</p>
      <p style="margin:0 0 8px;"><strong>Invitee:</strong> ${args.booking.invitee.name} (${args.booking.invitee.email})</p>
      <p style="margin:0 0 8px;"><strong>When (UTC):</strong> ${args.booking.startAt}</p>
      <p style="margin:0 0 8px;"><strong>Booking ID:</strong> ${args.booking.id}</p>
    `),
  });
}

export async function sendCampaignBookingFollowupEmail(args: {
  to: string;
  firstName: string;
  bookingUrl: string;
  campaignName: string;
}) {
  await sendEmail({
    to: args.to,
    subject: `Next step: book your call for ${args.campaignName}`,
    html: bookingEmailShell(`
      <h2 style="margin:0 0 12px;color:#001a70;">Thanks, ${args.firstName}</h2>
      <p style="margin:0 0 10px;color:#334155;">We received your submission. Please book your private briefing slot now.</p>
      <p style="margin:16px 0 0;">
        <a href="${args.bookingUrl}" style="display:inline-block;background:#001a70;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
          Book Your Call
        </a>
      </p>
    `),
    text: `We received your submission. Book your private briefing: ${args.bookingUrl}`,
  });
}

export async function sendCampaignBrochureFollowupEmail(args: {
  to: string;
  firstName: string;
  campaignName: string;
  brochureUrl: string;
  bookingUrl?: string;
}) {
  const ctaHtml = args.brochureUrl
    ? `<a href="${args.brochureUrl}" style="display:inline-block;background:#001a70;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">Download Brochure</a>`
    : '';
  const bookingHtml = args.bookingUrl
    ? `<a href="${args.bookingUrl}" style="display:inline-block;background:#cc9f53;color:#111827;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700;margin-left:8px;">Book a Private Briefing</a>`
    : '';

  await sendEmail({
    to: args.to,
    subject: `Your brochure: ${args.campaignName}`,
    html: bookingEmailShell(`
      <h2 style="margin:0 0 12px;color:#001a70;">Thanks, ${args.firstName}</h2>
      <p style="margin:0 0 10px;color:#334155;">Your brochure is ready. Use the button below to download it now.</p>
      <p style="margin:16px 0 0;">${ctaHtml}${bookingHtml}</p>
      <p style="margin:14px 0 0;color:#64748b;font-size:13px;">If you'd like, you can also book a 15-minute private briefing and we'll walk you through fit, pricing, and next steps.</p>
    `),
    text: args.brochureUrl
      ? `Your brochure is ready: ${args.brochureUrl}${args.bookingUrl ? `\nBook a private briefing: ${args.bookingUrl}` : ''}`
      : `Thanks for your interest in ${args.campaignName}.`,
  });
}
