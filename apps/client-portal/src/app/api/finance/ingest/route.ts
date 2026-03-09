import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { verifyApiUser } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { buildFinanceInboxItem, fetchLabeledFinanceMessages } from '@/lib/finance-gmail';
import { getFinanceSettings, loadFinanceSnapshot } from '@/lib/finance-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiUser(req.headers.get('authorization'));
    if (!user || !['owner', 'admin', 'team'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDb();
    const settings = await getFinanceSettings();
    const snapshot = await loadFinanceSnapshot();
    const messages = await fetchLabeledFinanceMessages(settings, 10);
    let created = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const message of messages) {
      try {
        const existing = await db.collection('financeInboxItems').where('gmailMessageId', '==', message.message.id).limit(1).get();
        if (!existing.empty) {
          skipped += 1;
          continue;
        }
        const parsed = await buildFinanceInboxItem(message, {
          recurringExpenses: snapshot.recurringExpenses,
          invoices: snapshot.invoices,
        });
        if (!parsed) {
          skipped += 1;
          continue;
        }
        const sanitized = JSON.parse(JSON.stringify(parsed));
        await db.collection('financeInboxItems').add({
          ...sanitized,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        created += 1;
      } catch (error) {
        failed += 1;
        errors.push(`message ${message.message.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return NextResponse.json({ success: true, created, skipped, failed, polled: messages.length, errors });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
