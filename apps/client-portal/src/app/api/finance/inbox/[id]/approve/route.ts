import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyApiUser } from '@/lib/api-auth';
import { syncFinanceAlerts, syncFinanceEntries } from '@/lib/finance-admin';
import { addMonthsToISODate } from '@/lib/billing';

export const dynamic = 'force-dynamic';

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
  const linkedRecurringExpenseId = body.linkedRecurringExpenseId || item.suggestedRecurringExpenseId || '';
  const linkedInvoiceId = body.invoiceId || item.suggestedInvoiceId || '';
  const updates: Record<string, unknown> = {
    reviewStatus: 'approved',
    postingTarget,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (postingTarget === 'expense') {
    const expenseRef = await db.collection('expenses').add({
      description: body.description || item.extractedDescription || item.subject || 'Imported finance expense',
      amount: Number(body.amount ?? item.extractedAmount ?? 0),
      currency: body.currency || item.extractedCurrency || 'AED',
      category: body.category || 'other',
      date: body.date || item.extractedInvoiceDate || now.slice(0, 10),
      dueDate: body.dueDate || item.extractedDueDate || item.extractedInvoiceDate || now.slice(0, 10),
      vendor: body.vendor || item.extractedVendor || '',
      notes: body.notes || item.rawSnippet || '',
      source: 'email',
      financeInboxItemId: id,
      recurringExpenseId: linkedRecurringExpenseId || undefined,
      paymentAccount: body.paymentAccount || '',
      status: body.status || 'approved',
      approvalState: 'approved',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    updates.linkedExpenseId = expenseRef.id;
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
