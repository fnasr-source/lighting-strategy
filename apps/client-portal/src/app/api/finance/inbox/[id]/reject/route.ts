import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyApiUser } from '@/lib/api-auth';
import { syncFinanceAlerts } from '@/lib/finance-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyApiUser(req.headers.get('authorization'));
  if (!user || !['owner', 'admin', 'team'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const db = getAdminDb();
  await db.collection('financeInboxItems').doc(id).set({
    reviewStatus: 'rejected',
    postingTarget: 'ignore',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await syncFinanceAlerts();
  return NextResponse.json({ success: true });
}
