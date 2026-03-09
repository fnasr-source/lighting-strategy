import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyApiUser } from '@/lib/api-auth';
import {
  buildFinanceFingerprint,
  findBestInvoiceMatch,
  findBestRecurringExpenseMatch,
  inferFinanceClassification,
  inferFinancePostingTarget,
} from '@/lib/finance-matching';
import type { FinanceInboxItem, Invoice, RecurringExpense } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

function isCronAuthorized(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'admireworks-cron-2026';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest) {
  try {
    const cronAuthorized = isCronAuthorized(req);
    const user = cronAuthorized ? null : await verifyApiUser(req.headers.get('authorization'));
    if (!cronAuthorized && (!user || !['owner', 'admin', 'team'].includes(user.role || ''))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDb();
    const [inboxSnap, recurringSnap, invoiceSnap] = await Promise.all([
      db.collection('financeInboxItems').get(),
      db.collection('recurringExpenses').get(),
      db.collection('invoices').get(),
    ]);

    const recurringExpenses = recurringSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RecurringExpense));
    const invoices = invoiceSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Invoice));
    const items = inboxSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FinanceInboxItem))
      .sort((left, right) => {
        const leftApproved = left.reviewStatus === 'approved' ? 1 : 0;
        const rightApproved = right.reviewStatus === 'approved' ? 1 : 0;
        if (leftApproved !== rightApproved) return rightApproved - leftApproved;
        const leftDate = String(left.receivedAt || '');
        const rightDate = String(right.receivedAt || '');
        return leftDate.localeCompare(rightDate);
      });

    const seenFingerprints = new Map<string, string>();
    let updated = 0;
    let deduped = 0;
    let rematched = 0;

    for (const item of items) {
      if (!item.id) continue;

      const recurringMatch = findBestRecurringExpenseMatch({
        extractedVendor: item.extractedVendor,
        sender: item.sender,
        subject: item.subject,
        bodyText: item.extractedDescription || item.rawSnippet,
        amount: item.extractedAmount,
        currency: item.extractedCurrency,
        recurringExpenses,
      });
      const invoiceMatch = findBestInvoiceMatch({
        sender: item.sender,
        subject: item.subject,
        bodyText: item.extractedDescription || item.rawSnippet,
        invoiceNumber: item.extractedInvoiceNumber,
        amount: item.extractedAmount,
        currency: item.extractedCurrency,
        invoices,
      });
      const parsedType = inferFinanceClassification({
        subject: item.subject,
        bodyText: item.extractedDescription || item.rawSnippet,
        labelNames: item.labelNames,
        aiClassification: item.parsedType,
        heuristicClassification: item.parsedType,
      });
      const suggestedPostingTarget = inferFinancePostingTarget({
        classification: parsedType,
        labelNames: item.labelNames,
        subject: item.subject,
        bodyText: item.extractedDescription || item.rawSnippet,
        recurringMatch,
        invoiceMatch,
        aiTarget: item.suggestedPostingTarget || item.postingTarget,
        recurrenceHint: item.recurrenceHint,
      });
      const financeFingerprint = buildFinanceFingerprint({
        classification: parsedType,
        vendor: item.extractedVendor,
        sender: item.sender,
        invoiceNumber: item.extractedInvoiceNumber,
        amount: item.extractedAmount,
        currency: item.extractedCurrency,
        invoiceDate: item.extractedInvoiceDate,
        subject: item.subject,
        recurringExpenseId: recurringMatch?.recurringExpenseId || item.linkedRecurringExpenseId || null,
        invoiceId: invoiceMatch?.invoiceId || item.suggestedInvoiceId || null,
      });

      const updates: Record<string, unknown> = {
        parsedType,
        suggestedPostingTarget,
        suggestedRecurringExpenseId: recurringMatch?.recurringExpenseId || admin.firestore.FieldValue.delete(),
        suggestedRecurringExpenseName: recurringMatch?.recurringExpenseName || admin.firestore.FieldValue.delete(),
        suggestedInvoiceId: invoiceMatch?.invoiceId || admin.firestore.FieldValue.delete(),
        suggestedInvoiceNumber: invoiceMatch?.invoiceNumber || admin.firestore.FieldValue.delete(),
        financeFingerprint,
        duplicateOfInboxItemId: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (item.reviewStatus !== 'approved') {
        updates.postingTarget = suggestedPostingTarget;
      }

      const existingFingerprintOwner = seenFingerprints.get(financeFingerprint);
      if (existingFingerprintOwner && existingFingerprintOwner !== item.id) {
        updates.duplicateOfInboxItemId = existingFingerprintOwner;
        if (item.reviewStatus === 'pending') {
          updates.reviewStatus = 'rejected';
        }
        deduped += 1;
      } else if (financeFingerprint) {
        seenFingerprints.set(financeFingerprint, item.id);
      }

      if (
        item.suggestedRecurringExpenseId !== recurringMatch?.recurringExpenseId
        || item.suggestedInvoiceId !== invoiceMatch?.invoiceId
        || item.financeFingerprint !== financeFingerprint
        || item.suggestedPostingTarget !== suggestedPostingTarget
        || (item.reviewStatus === 'pending' && item.postingTarget !== suggestedPostingTarget)
        || Boolean(existingFingerprintOwner && existingFingerprintOwner !== item.id)
      ) {
        rematched += 1;
      }

      await db.collection('financeInboxItems').doc(item.id).set(updates, { merge: true });
      updated += 1;
    }

    return NextResponse.json({ success: true, updated, rematched, deduped, total: items.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
