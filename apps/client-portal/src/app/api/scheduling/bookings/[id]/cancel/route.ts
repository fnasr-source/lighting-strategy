import { NextRequest, NextResponse } from 'next/server';
import { cancelSchedulingBooking, resolveBookingFromManageToken } from '@/lib/scheduling';
import { isSchedulingManager, verifyApiUser } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const reason = body?.reason ? String(body.reason) : '';
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

    const cancelled = await cancelSchedulingBooking({
      bookingId: id,
      reason,
      actorType: isInternal ? 'host' : 'invitee',
      actorId: user?.uid,
    });

    return NextResponse.json({
      success: true,
      bookingId: cancelled.id,
      status: cancelled.status,
      cancelledAt: cancelled.cancelledAt,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to cancel booking' }, { status: 500 });
  }
}
