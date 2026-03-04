import { NextRequest, NextResponse } from 'next/server';
import { dispatchSchedulingReminders } from '@/lib/scheduling';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'admireworks-cron-2026';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await dispatchSchedulingReminders(100);
    return NextResponse.json({ success: true, ...result, executedAt: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process reminders' }, { status: 500 });
  }
}
