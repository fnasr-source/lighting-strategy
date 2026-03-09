import { NextRequest, NextResponse } from 'next/server';
import { syncFinanceEntries } from '@/lib/finance-admin';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'admireworks-cron-2026';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entries = await syncFinanceEntries();
  return NextResponse.json({ success: true, count: entries.length });
}
