import { NextRequest, NextResponse } from 'next/server';
import { verifyApiUser } from '@/lib/api-auth';
import { getFinanceSettings, setFinanceSettings } from '@/lib/finance-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await verifyApiUser(req.headers.get('authorization'));
  if (!user || !['owner', 'admin'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, settings: await getFinanceSettings() });
}

export async function PATCH(req: NextRequest) {
  const user = await verifyApiUser(req.headers.get('authorization'));
  if (!user || !['owner', 'admin'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  await setFinanceSettings(body);
  return NextResponse.json({ success: true, settings: await getFinanceSettings() });
}
