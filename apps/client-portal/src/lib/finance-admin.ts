import admin from 'firebase-admin';
import { getAdminDb } from '@/lib/firebase-admin';
import { buildFinanceAlerts, buildFinanceEntries, computeFinanceOverview, DEFAULT_FINANCE_LABELS } from '@/lib/finance';
import type {
  CashAccount,
  Expense,
  FinanceAlert,
  FinanceInboxItem,
  FinanceSettings,
  Invoice,
  Payment,
  Proposal,
  RecurringExpense,
  RecurringInvoice,
} from '@/lib/firestore';

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const db = getAdminDb();
  const snap = await db.collection('systemConfig').doc('finance').get();
  const data = snap.exists ? snap.data() : {};
  return {
    id: snap.id,
    gmailConnectedEmail: data?.gmailConnectedEmail || '',
    watchedLabels: Array.isArray(data?.watchedLabels) && data.watchedLabels.length > 0 ? data.watchedLabels : DEFAULT_FINANCE_LABELS,
    pollingMinutes: typeof data?.pollingMinutes === 'number' ? data.pollingMinutes : 15,
    digestRecipients: Array.isArray(data?.digestRecipients) ? data.digestRecipients : [],
    baseCurrency: data?.baseCurrency || 'AED',
    forecastHorizons: Array.isArray(data?.forecastHorizons) && data.forecastHorizons.length > 0 ? data.forecastHorizons : [30, 90, 180],
    dailyDigestHourDubai: typeof data?.dailyDigestHourDubai === 'number' ? data.dailyDigestHourDubai : 9,
  };
}

export async function setFinanceSettings(data: Partial<FinanceSettings>) {
  const db = getAdminDb();
  await db.collection('systemConfig').doc('finance').set({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function getCollection<T>(name: string): Promise<T[]> {
  const db = getAdminDb();
  const snap = await db.collection(name).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
}

export async function loadFinanceSnapshot() {
  const [settings, invoices, payments, expenses, recurringExpenses, recurringInvoices, proposals, financeInbox, financeAlerts, cashAccounts] = await Promise.all([
    getFinanceSettings(),
    getCollection<Invoice>('invoices'),
    getCollection<Payment>('payments'),
    getCollection<Expense>('expenses'),
    getCollection<RecurringExpense>('recurringExpenses'),
    getCollection<RecurringInvoice>('recurringInvoices'),
    getCollection<Proposal>('proposals'),
    getCollection<FinanceInboxItem>('financeInboxItems'),
    getCollection<FinanceAlert>('financeAlerts'),
    getCollection<CashAccount>('cashAccounts'),
  ]);

  return {
    settings,
    invoices,
    payments,
    expenses,
    recurringExpenses,
    recurringInvoices,
    proposals,
    financeInbox,
    financeAlerts,
    cashAccounts,
  };
}

export async function syncFinanceEntries() {
  const db = getAdminDb();
  const snapshot = await loadFinanceSnapshot();
  const entries = buildFinanceEntries({
    invoices: snapshot.invoices,
    payments: snapshot.payments,
    expenses: snapshot.expenses,
    recurringExpenses: snapshot.recurringExpenses,
    proposals: snapshot.proposals,
    recurringInvoices: snapshot.recurringInvoices,
    baseCurrency: snapshot.settings.baseCurrency,
  });

  const existing = await db.collection('financeEntries').get();
  const batch = db.batch();
  existing.docs.forEach((doc) => batch.delete(doc.ref));
  entries.forEach((entry) => {
    const ref = db.collection('financeEntries').doc(entry.id || `${entry.entryType}_${entry.sourceId}_${entry.effectiveDate}`);
    batch.set(ref, {
      ...entry,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  return entries;
}

export async function syncFinanceAlerts() {
  const db = getAdminDb();
  const snapshot = await loadFinanceSnapshot();
  const overview = computeFinanceOverview({
    cashAccounts: snapshot.cashAccounts,
    invoices: snapshot.invoices,
    payments: snapshot.payments,
    expenses: snapshot.expenses,
    recurringExpenses: snapshot.recurringExpenses,
    recurringInvoices: snapshot.recurringInvoices,
    proposals: snapshot.proposals,
    financeInbox: snapshot.financeInbox,
    financeAlerts: snapshot.financeAlerts,
    baseCurrency: snapshot.settings.baseCurrency,
    horizonDays: Math.max(...snapshot.settings.forecastHorizons, 30),
  });
  const alerts = buildFinanceAlerts({
    invoices: snapshot.invoices,
    recurringExpenses: snapshot.recurringExpenses,
    expenses: snapshot.expenses,
    financeInbox: snapshot.financeInbox,
    overview,
  });

  const existing = await db.collection('financeAlerts').get();
  const batch = db.batch();
  existing.docs.forEach((doc) => batch.delete(doc.ref));
  alerts.forEach((alert) => {
    const ref = db.collection('financeAlerts').doc(alert.id || `${alert.type}_${alert.targetDate}`);
    batch.set(ref, {
      ...alert,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  return { alerts, overview, settings: snapshot.settings };
}
