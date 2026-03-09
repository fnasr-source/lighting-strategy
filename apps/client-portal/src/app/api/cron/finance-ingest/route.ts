import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAdminDb } from '@/lib/firebase-admin';
import { fetchLabeledFinanceMessages, parseFinanceMessage } from '@/lib/finance-gmail';
import { getFinanceSettings } from '@/lib/finance-admin';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'admireworks-cron-2026';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDb();
    const settings = await getFinanceSettings();
    const messages = await fetchLabeledFinanceMessages(settings, 10);
    let created = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const message of messages) {
      try {
        const existing = await db.collection('financeInboxItems').where('gmailMessageId', '==', message.id).limit(1).get();
        if (!existing.empty) {
          skipped += 1;
          continue;
        }

        const parsed = parseFinanceMessage(message, settings.watchedLabels);
        await db.collection('financeInboxItems').add({
          ...parsed,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        created += 1;
      } catch (error) {
        failed += 1;
        errors.push(`message ${message.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return NextResponse.json({ success: true, created, skipped, failed, polled: messages.length, errors });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
