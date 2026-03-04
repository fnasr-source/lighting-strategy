import { NextRequest, NextResponse } from 'next/server';
import { rescheduleSchedulingBooking, resolveBookingFromManageToken } from '@/lib/scheduling';
import { isSchedulingManager, verifyApiUser } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const newStartAt = String(body?.newStartAt || '');
    if (!newStartAt) {
      return NextResponse.json({ error: 'newStartAt is required' }, { status: 400 });
    }

    const token = body?.token ? String(body.token) : '';
    const user = await verifyApiUser(req.headers.get('authorization'));
    const isInternal = isSchedulingManager(user?.role);

    if (!isInternal) {
      if (!token) return NextResponse.json({ error: 'Invitee token required' }, { status: 401 });
      const resolved = await resolveBookingFromManageToken(token);
      if (resolved.booking.id !== id) {
        return NextResponse.json({ error: 'Token does not match booking' }, { status: 403 });
      }
    }

    const updated = await rescheduleSchedulingBooking({
      bookingId: id,
      newStartAt,
      actorType: isInternal ? 'host' : 'invitee',
      actorId: user?.uid,
    });

    return NextResponse.json({
      success: true,
      bookingId: updated.id,
      startAt: updated.startAt,
      endAt: updated.endAt,
      meetingLink: updated.googleMeetLink || updated.locationText || '',
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to reschedule booking' }, { status: 500 });
  }
}
