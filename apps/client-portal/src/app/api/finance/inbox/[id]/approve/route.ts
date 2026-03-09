import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyApiUser } from '@/lib/api-auth';
import { syncFinanceAlerts, syncFinanceEntries } from '@/lib/finance-admin';

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
      paymentAccount: body.paymentAccount || '',
      status: body.status || 'approved',
      approvalState: 'approved',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    updates.linkedExpenseId = expenseRef.id;
  } else if (postingTarget === 'recurring_expense') {
    const recurringRef = await db.collection('recurringExpenses').add({
      name: body.name || item.extractedVendor || item.subject || 'Imported recurring expense',
      vendor: body.vendor || item.extractedVendor || '',
      category: body.category || 'Other',
      utilizedBy: body.utilizedBy || '',
      cadence: body.cadence || item.recurrenceHint || 'monthly',
      intervalMonths: Number(body.intervalMonths || (body.cadence === 'quarterly' ? 3 : body.cadence === 'semiannual' ? 6 : body.cadence === 'annual' ? 12 : 1)),
      nextChargeDate: body.nextChargeDate || item.extractedDueDate || item.extractedInvoiceDate || now.slice(0, 10),
      amount: Number(body.amount ?? item.extractedAmount ?? 0),
      currency: body.currency || item.extractedCurrency || 'AED',
      paymentAccount: body.paymentAccount || '',
      status: body.status || 'active',
      source: 'email',
      remarks: body.remarks || item.rawSnippet || '',
      financeInboxItemId: id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    updates.linkedRecurringExpenseId = recurringRef.id;
  } else if (postingTarget === 'payment') {
    const amount = Number(body.amount ?? item.extractedAmount ?? 0);
    const invoiceNumber = body.invoiceNumber || '';
    let invoiceId = body.invoiceId || '';
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
