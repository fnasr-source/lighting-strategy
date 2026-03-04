import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, createSchedulingBooking } from '@/lib/scheduling';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.invitee?.name || !body?.invitee?.email || !body?.slot?.startAt) {
      return NextResponse.json({ error: 'Missing invitee or slot details' }, { status: 400 });
    }

    const eventRef = String(body?.eventTypeId || body?.slug || '');
    const ip = getClientIp(req);
    const normalizedEmail = String(body.invitee.email || '').trim().toLowerCase();

    const ipRate = await checkRateLimit({
      key: `scheduling:ip:${ip}:${eventRef}`,
      maxRequests: 30,
      windowMinutes: 15,
    });

    if (!ipRate.allowed) {
      return NextResponse.json({ error: 'Too many attempts from this IP. Please try again later.' }, { status: 429 });
    }

    const emailRate = await checkRateLimit({
      key: `scheduling:email:${normalizedEmail}:${eventRef}`,
      maxRequests: 8,
      windowMinutes: 60,
    });

    if (!emailRate.allowed) {
      return NextResponse.json({ error: 'Too many booking attempts for this email. Please try again later.' }, { status: 429 });
    }

    const created = await createSchedulingBooking({
      input: body,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      success: true,
      bookingId: created.booking.id,
      eventSlug: created.eventType.slug,
      startAt: created.booking.startAt,
      endAt: created.booking.endAt,
      manageUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/scheduling/manage/${created.manageToken}?redirect=1`,
      confirmationUrl: `/book/${created.eventType.slug}/confirm?bookingId=${created.booking.id}`,
      meetingLink: created.booking.googleMeetLink || created.booking.locationText || '',
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create booking' }, { status: 500 });
  }
}
