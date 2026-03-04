import { NextRequest, NextResponse } from 'next/server';
import { computeAvailableSlots } from '@/lib/scheduling';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const timezone = String(body?.timezone || 'UTC');
    const eventTypeId = body?.eventTypeId ? String(body.eventTypeId) : undefined;
    const slug = body?.slug ? String(body.slug) : undefined;
    const start = String(body?.dateRange?.start || '');
    const end = String(body?.dateRange?.end || '');

    if ((!eventTypeId && !slug) || !start || !end) {
      return NextResponse.json({ error: 'eventTypeId/slug and dateRange are required' }, { status: 400 });
    }

    const { eventType, slots } = await computeAvailableSlots({
      eventTypeId,
      slug,
      timezone,
      dateRange: { start, end },
    });

    return NextResponse.json({
      eventTypeId: eventType.id,
      eventSlug: eventType.slug,
      timezone,
      slots,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to query slots' }, { status: 500 });
  }
}
