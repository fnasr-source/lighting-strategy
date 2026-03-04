import { NextRequest, NextResponse } from 'next/server';
import { resolveBookingFromManageToken } from '@/lib/scheduling';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const resolved = await resolveBookingFromManageToken(token);

    const booking = resolved.booking;
    const eventType = resolved.eventType;

    const cutoffMs = (eventType.cancelCutoffHours || 4) * 60 * 60 * 1000;
    const now = Date.now();
    const canEdit =
      booking.status === 'confirmed' &&
      new Date(booking.startAt).getTime() - now >= cutoffMs;

    const payload = {
      booking: {
        id: booking.id,
        eventName: booking.eventName,
        eventSlug: booking.eventSlug,
        status: booking.status,
        startAt: booking.startAt,
        endAt: booking.endAt,
        timezone: booking.invitee.timezone,
        invitee: booking.invitee,
        locationText: booking.googleMeetLink || booking.locationText || '',
        canReschedule: canEdit,
        canCancel: canEdit,
      },
      eventType: {
        id: eventType.id,
        slug: eventType.slug,
        name: eventType.name,
        durationMin: eventType.durationMin,
        timezone: eventType.timezone,
      },
    };

    if (req.nextUrl.searchParams.get('redirect') === '1') {
      const target = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/book/${eventType.slug}/confirm?bookingId=${booking.id}&manage=1`;
      return NextResponse.redirect(target);
    }

    return NextResponse.json(payload);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid manage token' }, { status: 400 });
  }
}
