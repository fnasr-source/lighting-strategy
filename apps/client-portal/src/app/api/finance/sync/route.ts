import { NextRequest, NextResponse } from 'next/server';
import { verifyApiUser } from '@/lib/api-auth';
import { syncFinanceEntries } from '@/lib/finance-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await verifyApiUser(req.headers.get('authorization'));
  if (!user || !['owner', 'admin', 'team'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const entries = await syncFinanceEntries();
  return NextResponse.json({ success: true, count: entries.length });
}
