import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyApiUser } from '@/lib/api-auth';
import { syncFinanceAlerts, syncFinanceEntries } from '@/lib/finance-admin';
import { addMonthsToISODate } from '@/lib/billing';
import {
  buildFinanceFingerprint,
  findBestRecurringExpenseMatch,
  sanitizeInvoiceReference,
} from '@/lib/finance-matching';
import type { RecurringExpense } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

async function resolveRecurringExpenseId(params: {
  db: FirebaseFirestore.Firestore;
  requestedId?: string;
  item: FirebaseFirestore.DocumentData;
  body: Record<string, unknown>;
}) {
  if (params.requestedId) return params.requestedId;

  const recurringSnap = await params.db.collection('recurringExpenses').get();
  const recurringExpenses = recurringSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RecurringExpense));
  const match = findBestRecurringExpenseMatch({
    extractedVendor: String(params.body.vendor || params.item.extractedVendor || ''),
    sender: String(params.item.sender || ''),
    subject: String(params.item.subject || ''),
    bodyText: String(params.body.description || params.item.extractedDescription || ''),
    amount: Number(params.body.amount ?? params.item.extractedAmount ?? 0),
    currency: String(params.body.currency || params.item.extractedCurrency || ''),
    recurringExpenses,
  });
  return match?.recurringExpenseId || '';
}

async function findDuplicateExpense(params: {
  db: FirebaseFirestore.Firestore;
  financeFingerprint: string;
  invoiceReference: string;
  recurringExpenseId: string;
  amount: number;
  currency: string;
}) {
  if (params.financeFingerprint) {
    const byFingerprint = await params.db.collection('expenses').where('financeFingerprint', '==', params.financeFingerprint).limit(1).get();
    if (!byFingerprint.empty) return byFingerprint.docs[0];
  }

  if (params.invoiceReference) {
    const byInvoiceReference = await params.db.collection('expenses').where('invoiceReference', '==', params.invoiceReference).limit(10).get();
    const exact = byInvoiceReference.docs.find((doc) => {
      const data = doc.data();
      return Number(data.amount || 0) === params.amount
        && String(data.currency || '').toUpperCase() === params.currency.toUpperCase()
        && String(data.recurringExpenseId || '') === params.recurringExpenseId;
    });
    if (exact) return exact;
  }

  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyApiUser(req.headers.get('authorization'));
  if (!user || !['owner', 'admin', 'team'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getAdminDb();
  const ref = db.collection('financeInboxItems').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Inbox item not found' }, { status: 404 });

  const item = snap.data()!;
  const postingTarget = body.postingTarget || item.postingTarget || 'ignore';
  const now = new Date().toISOString();
  const linkedRecurringExpenseId = await resolveRecurringExpenseId({
    db,
    requestedId: body.linkedRecurringExpenseId || item.suggestedRecurringExpenseId || '',
    item,
    body,
  });
  const linkedInvoiceId = body.invoiceId || item.suggestedInvoiceId || '';
  const financeFingerprint = item.financeFingerprint || buildFinanceFingerprint({
    classification: item.parsedType,
    vendor: String(body.vendor || item.extractedVendor || ''),
    sender: item.sender,
    invoiceNumber: String(body.invoiceNumber || item.extractedInvoiceNumber || ''),
    amount: Number(body.amount ?? item.extractedAmount ?? 0),
    currency: String(body.currency || item.extractedCurrency || ''),
    invoiceDate: String(body.date || item.extractedInvoiceDate || ''),
    subject: item.subject,
    recurringExpenseId: linkedRecurringExpenseId || null,
    invoiceId: linkedInvoiceId || null,
  });
  const invoiceReference = sanitizeInvoiceReference(String(body.invoiceNumber || item.extractedInvoiceNumber || ''));
  const updates: Record<string, unknown> = {
    reviewStatus: 'approved',
    postingTarget,
    linkedRecurringExpenseId: linkedRecurringExpenseId || item.linkedRecurringExpenseId || '',
    financeFingerprint,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (postingTarget === 'expense') {
    const amount = Number(body.amount ?? item.extractedAmount ?? 0);
    const currency = String(body.currency || item.extractedCurrency || 'AED');
    const duplicateExpense = await findDuplicateExpense({
      db,
      financeFingerprint,
      invoiceReference,
      recurringExpenseId: linkedRecurringExpenseId,
      amount,
      currency,
    });

    if (duplicateExpense) {
      updates.linkedExpenseId = duplicateExpense.id;
      updates.duplicateOfInboxItemId = duplicateExpense.get('financeInboxItemId') || '';
    } else {
      const expenseRef = await db.collection('expenses').add({
        description: body.description || item.extractedDescription || item.subject || 'Imported finance expense',
        amount,
        currency,
        category: body.category || 'other',
        date: body.date || item.extractedInvoiceDate || now.slice(0, 10),
        dueDate: body.dueDate || item.extractedDueDate || item.extractedInvoiceDate || now.slice(0, 10),
        vendor: body.vendor || item.extractedVendor || '',
        notes: body.notes || item.rawSnippet || '',
        source: 'email',
        financeInboxItemId: id,
        financeFingerprint,
        invoiceReference: invoiceReference || undefined,
        recurringExpenseId: linkedRecurringExpenseId || undefined,
        paymentAccount: body.paymentAccount || '',
        status: body.status || 'approved',
        approvalState: 'approved',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updates.linkedExpenseId = expenseRef.id;
    }
    if (linkedRecurringExpenseId) {
      const recurringRef = db.collection('recurringExpenses').doc(linkedRecurringExpenseId);
      const recurringSnap = await recurringRef.get();
      if (recurringSnap.exists) {
        const recurring = recurringSnap.data()!;
        const baseDate = body.nextChargeDate || item.extractedDueDate || item.extractedInvoiceDate || recurring.nextChargeDate || now.slice(0, 10);
        const intervalMonths = Number(recurring.intervalMonths || 1);
        await recurringRef.set({
          lastChargedAt: body.date || item.extractedInvoiceDate || now.slice(0, 10),
          lastInvoiceAmount: Number(body.amount ?? item.extractedAmount ?? recurring.amount ?? 0),
          lastEmailSubject: item.subject || '',
          status: recurring.status === 'cancelled' ? 'active' : recurring.status || 'active',
          nextChargeDate: addMonthsToISODate(baseDate, intervalMonths),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }
  } else if (postingTarget === 'recurring_expense') {
    const cadence = body.cadence || item.recurrenceHint || 'monthly';
    const intervalMonths = Number(body.intervalMonths || (cadence === 'quarterly' ? 3 : cadence === 'semiannual' ? 6 : cadence === 'annual' ? 12 : 1));
    if (linkedRecurringExpenseId) {
      await db.collection('recurringExpenses').doc(linkedRecurringExpenseId).set({
        name: body.name || item.suggestedRecurringExpenseName || item.extractedVendor || item.subject || 'Imported recurring expense',
        vendor: body.vendor || item.extractedVendor || '',
        category: body.category || 'Other',
        utilizedBy: body.utilizedBy || '',
        cadence,
        intervalMonths,
        nextChargeDate: body.nextChargeDate || item.extractedDueDate || item.extractedInvoiceDate || now.slice(0, 10),
        amount: Number(body.amount ?? item.extractedAmount ?? 0),
        currency: body.currency || item.extractedCurrency || 'AED',
        paymentAccount: body.paymentAccount || '',
        status: body.status || 'active',
        source: 'email',
        remarks: body.remarks || item.rawSnippet || '',
        financeInboxItemId: id,
        lastChargedAt: body.date || item.extractedInvoiceDate || now.slice(0, 10),
        lastInvoiceAmount: Number(body.amount ?? item.extractedAmount ?? 0),
        lastEmailSubject: item.subject || '',
        aliases: admin.firestore.FieldValue.arrayUnion(
          String(body.name || item.extractedVendor || item.subject || '').trim(),
          String(body.vendor || item.extractedVendor || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      updates.linkedRecurringExpenseId = linkedRecurringExpenseId;
    } else {
      const recurringRef = await db.collection('recurringExpenses').add({
        name: body.name || item.extractedVendor || item.subject || 'Imported recurring expense',
        vendor: body.vendor || item.extractedVendor || '',
        category: body.category || 'Other',
        utilizedBy: body.utilizedBy || '',
        cadence,
        intervalMonths,
        nextChargeDate: body.nextChargeDate || item.extractedDueDate || item.extractedInvoiceDate || now.slice(0, 10),
        amount: Number(body.amount ?? item.extractedAmount ?? 0),
        currency: body.currency || item.extractedCurrency || 'AED',
        paymentAccount: body.paymentAccount || '',
        status: body.status || 'active',
        source: 'email',
        remarks: body.remarks || item.rawSnippet || '',
        financeInboxItemId: id,
        lastChargedAt: body.date || item.extractedInvoiceDate || now.slice(0, 10),
        lastInvoiceAmount: Number(body.amount ?? item.extractedAmount ?? 0),
        lastEmailSubject: item.subject || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updates.linkedRecurringExpenseId = recurringRef.id;
    }
  } else if (postingTarget === 'payment') {
    const amount = Number(body.amount ?? item.extractedAmount ?? 0);
    const invoiceNumber = body.invoiceNumber || item.suggestedInvoiceNumber || '';
    let invoiceId = linkedInvoiceId;
    let invoiceData: FirebaseFirestore.DocumentData | undefined;
    if (!invoiceId && invoiceNumber) {
      const invoiceSnap = await db.collection('invoices').where('invoiceNumber', '==', invoiceNumber).limit(1).get();
      if (!invoiceSnap.empty) {
        invoiceId = invoiceSnap.docs[0].id;
        invoiceData = invoiceSnap.docs[0].data();
      }
    } else if (invoiceId) {
      const invoiceSnap = await db.collection('invoices').doc(invoiceId).get();
      if (invoiceSnap.exists) invoiceData = invoiceSnap.data();
    }

    const paymentRef = await db.collection('payments').add({
      clientId: body.clientId || invoiceData?.clientId || '',
      clientName: body.clientName || invoiceData?.clientName || item.extractedVendor || '',
      invoiceId,
      invoiceNumber: body.invoiceNumber || invoiceData?.invoiceNumber || '',
      amount,
      currency: body.currency || item.extractedCurrency || invoiceData?.currency || 'AED',
      method: body.method || 'bank_transfer',
      status: body.status || 'succeeded',
      paidAt: body.paidAt || now,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (invoiceId) {
      await db.collection('invoices').doc(invoiceId).set({ status: 'paid', paidAt: body.paidAt || now }, { merge: true });
    }
    updates.linkedPaymentId = paymentRef.id;
  }

  await ref.set(updates, { merge: true });
  await syncFinanceEntries();
  await syncFinanceAlerts();
  return NextResponse.json({ success: true });
}
