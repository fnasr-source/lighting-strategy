import { NextRequest, NextResponse } from 'next/server';
import { computeAvailableSlots, getEventTypeByReference } from '@/lib/scheduling';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const timezone = req.nextUrl.searchParams.get('timezone') || 'UTC';

    const eventType = await getEventTypeByReference({ slug });
    if (!eventType || !eventType.isActive || !eventType.id) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
    }

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + Math.min(30, eventType.bookingWindowDays || 30));

    const { slots } = await computeAvailableSlots({
      eventTypeId: eventType.id,
      timezone,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });

    return NextResponse.json({
      eventType: {
        id: eventType.id,
        slug: eventType.slug,
        name: eventType.name,
        description: eventType.description || '',
        audienceCase: eventType.audienceCase,
        durationMin: eventType.durationMin,
        cancelCutoffHours: eventType.cancelCutoffHours,
        timezone: eventType.timezone,
        intakeQuestions: eventType.intakeQuestions || [],
        reminderPolicy: eventType.reminderPolicy,
        locationType: eventType.locationType,
        locationDetails: eventType.locationDetails || '',
      },
      slots,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load event type' }, { status: 500 });
  }
}
