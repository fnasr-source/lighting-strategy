import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { verifyApiUser } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { fetchLabeledFinanceMessages, parseFinanceMessage } from '@/lib/finance-gmail';
import { getFinanceSettings } from '@/lib/finance-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await verifyApiUser(req.headers.get('authorization'));
  if (!user || !['owner', 'admin', 'team'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const settings = await getFinanceSettings();
  const messages = await fetchLabeledFinanceMessages(settings, 20);
  let created = 0;

  for (const message of messages) {
    const existing = await db.collection('financeInboxItems').where('gmailMessageId', '==', message.id).limit(1).get();
    if (!existing.empty) continue;
    const parsed = parseFinanceMessage(message, settings.watchedLabels);
    await db.collection('financeInboxItems').add({
      ...parsed,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    created += 1;
  }

  return NextResponse.json({ success: true, created });
}
