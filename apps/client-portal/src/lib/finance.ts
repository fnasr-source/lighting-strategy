import type {
  CashAccount,
  Expense,
  FinanceAlert,
  FinanceEntry,
  FinanceInboxItem,
  Invoice,
  Payment,
  Proposal,
  RecurringExpense,
  RecurringInvoice,
} from '@/lib/firestore';
import { addMonthsToISODate, getServicePeriodMonths, type BillingCadence } from '@/lib/billing';

export const DEFAULT_FINANCE_LABELS = [
  'Invoices',
  '@Invoices',
];

const STATIC_USD_RATES: Record<string, number> = {
  AED: 0.2723,
  EGP: 0.0202,
  SAR: 0.2666,
  USD: 1,
};

const pad = (value: number) => String(value).padStart(2, '0');
const todayIso = () => new Date().toISOString().slice(0, 10);
const toDate = (iso: string) => new Date(`${iso}T12:00:00`);

export function addDaysToIsoDate(iso: string, days: number) {
  const date = toDate(iso);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function normalizeAmount(amount: number, fromCurrency: string, toCurrency: string) {
  const from = STATIC_USD_RATES[(fromCurrency || '').toUpperCase()] ?? 1;
  const to = STATIC_USD_RATES[(toCurrency || '').toUpperCase()] ?? 1;
  if (!from || !to) return amount;
  const usd = amount * from;
  return usd / to;
}

export function deriveServicePeriod(invoice: Pick<Invoice, 'issuedAt' | 'servicePeriodStart' | 'servicePeriodMonths' | 'servicePeriodEnd' | 'billingPolicy'>) {
  const start = invoice.servicePeriodStart || invoice.issuedAt || todayIso();
  const months = typeof invoice.servicePeriodMonths === 'number'
    ? invoice.servicePeriodMonths
    : getServicePeriodMonths(invoice.billingPolicy?.billingCadence, invoice.billingPolicy?.intervalMonths);
  const end = invoice.servicePeriodEnd || (months > 0 ? addMonthsToISODate(start, months) : start);
  return { start, months, end };
}

export function deriveRecurringServicePeriod(recurring: Pick<RecurringInvoice, 'nextSendDate' | 'servicePeriodStart' | 'servicePeriodMonths' | 'servicePeriodEnd' | 'billingCadence' | 'intervalMonths'>) {
  const start = recurring.servicePeriodStart || recurring.nextSendDate || todayIso();
  const months = typeof recurring.servicePeriodMonths === 'number'
    ? recurring.servicePeriodMonths
    : getServicePeriodMonths(recurring.billingCadence, recurring.intervalMonths);
  const end = recurring.servicePeriodEnd || (months > 0 ? addMonthsToISODate(start, months) : start);
  return { start, months, end };
}

function entryId(prefix: string, sourceId: string, suffix?: string) {
  return [prefix, sourceId, suffix].filter(Boolean).join('_').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function buildDeferredRevenueEntries(params: {
  invoice: Invoice;
  payment: Payment;
  baseCurrency: string;
}): FinanceEntry[] {
  const { invoice, payment, baseCurrency } = params;
  const period = deriveServicePeriod(invoice);
  if (!invoice.id || period.months <= 1) return [];

  const entries: FinanceEntry[] = [];
  const normalizedAmount = normalizeAmount(payment.amount, payment.currency, baseCurrency);
  const reserveAmount = normalizedAmount * ((period.months - 1) / period.months);

  entries.push({
    id: entryId('reserve_hold', invoice.id),
    entryType: 'deferred_revenue_hold',
    direction: 'reserve',
    amount: payment.amount * ((period.months - 1) / period.months),
    currency: payment.currency,
    normalizedAmount: reserveAmount,
    normalizedCurrency: baseCurrency,
    effectiveDate: payment.paidAt?.slice(0, 10) || invoice.paidAt?.slice(0, 10) || invoice.issuedAt || todayIso(),
    sourceType: 'invoice',
    sourceId: invoice.id,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    status: 'posted',
    notes: `Deferred reserve hold for ${period.months}-month prepaid invoice`,
  });

  const releaseBase = reserveAmount / period.months;
  const releaseAmount = (payment.amount * ((period.months - 1) / period.months)) / period.months;
  for (let index = 0; index < period.months; index++) {
    const effectiveDate = addMonthsToISODate(period.start, index);
    entries.push({
      id: entryId('reserve_release', invoice.id, String(index + 1)),
      entryType: 'deferred_revenue_release',
      direction: 'reserve',
      amount: releaseAmount,
      currency: payment.currency,
      normalizedAmount: releaseBase,
      normalizedCurrency: baseCurrency,
      effectiveDate,
      sourceType: 'invoice',
      sourceId: invoice.id,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      status: effectiveDate <= todayIso() ? 'posted' : 'scheduled',
      notes: `Deferred reserve release ${index + 1}/${period.months}`,
    });
  }

  return entries;
}

export function buildFinanceEntries(params: {
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  recurringExpenses: RecurringExpense[];
  proposals: Proposal[];
  recurringInvoices: RecurringInvoice[];
  baseCurrency: string;
}): FinanceEntry[] {
  const entries: FinanceEntry[] = [];
  const baseCurrency = params.baseCurrency || 'AED';

  params.invoices.forEach((invoice) => {
    if (!invoice.id) return;
    entries.push({
      id: entryId('invoice_due', invoice.id),
      entryType: 'receivable_due',
      direction: 'inflow',
      amount: invoice.totalDue,
      currency: invoice.currency,
      normalizedAmount: normalizeAmount(invoice.totalDue, invoice.currency, baseCurrency),
      normalizedCurrency: baseCurrency,
      effectiveDate: invoice.dueDate || invoice.issuedAt || todayIso(),
      sourceType: 'invoice',
      sourceId: invoice.id,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      status: invoice.status === 'paid' ? 'cleared' : invoice.status === 'overdue' ? 'scheduled' : 'scheduled',
      notes: invoice.invoiceNumber,
    });
  });

  params.payments.forEach((payment) => {
    if (!payment.id) return;
    entries.push({
      id: entryId('payment', payment.id),
      entryType: 'receivable_paid',
      direction: 'inflow',
      amount: payment.amount,
      currency: payment.currency,
      normalizedAmount: normalizeAmount(payment.amount, payment.currency, baseCurrency),
      normalizedCurrency: baseCurrency,
      effectiveDate: payment.paidAt?.slice(0, 10) || todayIso(),
      sourceType: 'payment',
      sourceId: payment.id,
      clientId: payment.clientId,
      clientName: payment.clientName,
      status: payment.status === 'succeeded' ? 'posted' : 'scheduled',
      notes: payment.invoiceNumber,
    });

    if (payment.status === 'succeeded' && payment.invoiceId) {
      const invoice = params.invoices.find((candidate) => candidate.id === payment.invoiceId);
      if (invoice) entries.push(...buildDeferredRevenueEntries({ invoice, payment, baseCurrency }));
    }
  });

  params.expenses.forEach((expense) => {
    if (!expense.id) return;
    entries.push({
      id: entryId('expense', expense.id),
      entryType: expense.status === 'paid' ? 'payable_paid' : 'payable_due',
      direction: 'outflow',
      amount: expense.amount,
      currency: expense.currency,
      normalizedAmount: normalizeAmount(expense.amount, expense.currency, baseCurrency),
      normalizedCurrency: baseCurrency,
      effectiveDate: expense.dueDate || expense.date,
      sourceType: 'expense',
      sourceId: expense.id,
      clientId: expense.clientId,
      clientName: expense.clientName,
      vendor: expense.vendor,
      status: expense.status === 'paid' ? 'posted' : 'scheduled',
      notes: expense.description,
    });
  });

  params.recurringExpenses.forEach((expense) => {
    if (!expense.id) return;
    entries.push({
      id: entryId('recurring_expense', expense.id),
      entryType: 'payable_due',
      direction: 'outflow',
      amount: expense.amount,
      currency: expense.currency,
      normalizedAmount: normalizeAmount(expense.amount, expense.currency, baseCurrency),
      normalizedCurrency: baseCurrency,
      effectiveDate: expense.nextChargeDate,
      sourceType: 'recurring_expense',
      sourceId: expense.id,
      vendor: expense.vendor || expense.name,
      status: expense.status === 'cancelled' ? 'cleared' : 'scheduled',
      notes: expense.name,
    });
  });

  params.proposals.forEach((proposal) => {
    if (!proposal.id || !proposal.totalValue || !proposal.currency || !['ready', 'sent', 'accepted'].includes(proposal.status)) return;
    entries.push({
      id: entryId('proposal', proposal.id),
      entryType: 'manual_adjustment',
      direction: 'inflow',
      amount: proposal.totalValue,
      currency: proposal.currency,
      normalizedAmount: normalizeAmount(proposal.totalValue, proposal.currency, baseCurrency),
      normalizedCurrency: baseCurrency,
      effectiveDate: proposal.validUntil || proposal.sentDate || todayIso(),
      sourceType: 'proposal',
      sourceId: proposal.id,
      clientName: proposal.clientName,
      status: 'scheduled',
      notes: `Pipeline only: ${proposal.proposalNumber}`,
    });
  });

  params.recurringInvoices.forEach((recurring) => {
    if (!recurring.id || !recurring.active) return;
    entries.push({
      id: entryId('recurring_invoice', recurring.id),
      entryType: 'receivable_due',
      direction: 'inflow',
      amount: recurring.totalDue,
      currency: recurring.currency,
      normalizedAmount: normalizeAmount(recurring.totalDue, recurring.currency, baseCurrency),
      normalizedCurrency: baseCurrency,
      effectiveDate: recurring.nextDueDate || recurring.nextSendDate || todayIso(),
      sourceType: 'invoice',
      sourceId: recurring.id,
      clientId: recurring.clientId,
      clientName: recurring.clientName,
      status: 'scheduled',
      notes: recurring.templateName,
    });
  });

  return entries.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
}

export type FinanceTimelinePoint = {
  date: string;
  receivables: number;
  payables: number;
  reserves: number;
  freeCash: number;
  currentCash: number;
};

export type FinanceOverview = {
  currentCash: number;
  committedOutflows: number;
  receivables: number;
  deferredRevenueReserve: number;
  freeCash: number;
  expectedPipeline: number;
  dueTomorrow: {
    invoices: Invoice[];
    recurringExpenses: RecurringExpense[];
    expenses: Expense[];
  };
  overdueInvoices: Invoice[];
  pendingInboxCount: number;
  openAlerts: number;
  timeline: FinanceTimelinePoint[];
};

export function computeFinanceOverview(params: {
  cashAccounts: CashAccount[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  recurringExpenses: RecurringExpense[];
  recurringInvoices: RecurringInvoice[];
  proposals: Proposal[];
  financeInbox: FinanceInboxItem[];
  financeAlerts: FinanceAlert[];
  baseCurrency: string;
  horizonDays: number;
}): FinanceOverview {
  const baseCurrency = params.baseCurrency || 'AED';
  const today = todayIso();
  const tomorrow = addDaysToIsoDate(today, 1);
  const entries = buildFinanceEntries({
    invoices: params.invoices,
    payments: params.payments,
    expenses: params.expenses,
    recurringExpenses: params.recurringExpenses,
    proposals: params.proposals,
    recurringInvoices: params.recurringInvoices,
    baseCurrency,
  });

  const currentCash = params.cashAccounts
    .filter((account) => account.includeInAvailableCash)
    .reduce((sum, account) => sum + normalizeAmount(account.currentBalance, account.currency, baseCurrency), 0);

  const committedOutflows = entries
    .filter((entry) => entry.direction === 'outflow' && entry.status !== 'posted' && entry.status !== 'cleared')
    .reduce((sum, entry) => sum + (entry.normalizedAmount || 0), 0);

  const receivables = entries
    .filter((entry) => entry.entryType === 'receivable_due' && entry.status !== 'cleared')
    .reduce((sum, entry) => sum + (entry.normalizedAmount || 0), 0);

  const reserveHold = entries
    .filter((entry) => entry.entryType === 'deferred_revenue_hold')
    .reduce((sum, entry) => sum + (entry.normalizedAmount || 0), 0);
  const reserveRelease = entries
    .filter((entry) => entry.entryType === 'deferred_revenue_release' && entry.effectiveDate <= today)
    .reduce((sum, entry) => sum + (entry.normalizedAmount || 0), 0);
  const deferredRevenueReserve = Math.max(0, reserveHold - reserveRelease);

  const freeCash = currentCash - committedOutflows - deferredRevenueReserve;
  const expectedPipeline = entries
    .filter((entry) => entry.sourceType === 'proposal')
    .reduce((sum, entry) => sum + (entry.normalizedAmount || 0), 0);

  const timeline: FinanceTimelinePoint[] = [];
  for (let dayIndex = 0; dayIndex <= params.horizonDays; dayIndex += 1) {
    const date = addDaysToIsoDate(today, dayIndex);
    const receivablesToDate = entries
      .filter((entry) => entry.direction === 'inflow' && entry.sourceType !== 'proposal' && entry.effectiveDate <= date)
      .reduce((sum, entry) => sum + (entry.normalizedAmount || 0), 0);
    const payablesToDate = entries
      .filter((entry) => entry.direction === 'outflow' && entry.effectiveDate <= date)
      .reduce((sum, entry) => sum + (entry.normalizedAmount || 0), 0);
    const reserveToDate = Math.max(0, entries
      .filter((entry) => entry.entryType === 'deferred_revenue_hold' && entry.effectiveDate <= date)
      .reduce((sum, entry) => sum + (entry.normalizedAmount || 0), 0)
      - entries
        .filter((entry) => entry.entryType === 'deferred_revenue_release' && entry.effectiveDate <= date)
        .reduce((sum, entry) => sum + (entry.normalizedAmount || 0), 0));

    timeline.push({
      date,
      receivables: receivablesToDate,
      payables: payablesToDate,
      reserves: reserveToDate,
      currentCash,
      freeCash: currentCash + receivablesToDate - payablesToDate - reserveToDate,
    });
  }

  return {
    currentCash,
    committedOutflows,
    receivables,
    deferredRevenueReserve,
    freeCash,
    expectedPipeline,
    dueTomorrow: {
      invoices: params.invoices.filter((invoice) => invoice.status !== 'paid' && (invoice.dueDate || '') === tomorrow),
      recurringExpenses: params.recurringExpenses.filter((expense) => expense.status === 'active' && expense.nextChargeDate === tomorrow),
      expenses: params.expenses.filter((expense) => expense.status !== 'paid' && (expense.dueDate || expense.date) === tomorrow),
    },
    overdueInvoices: params.invoices.filter((invoice) => invoice.status !== 'paid' && !!invoice.dueDate && invoice.dueDate < today),
    pendingInboxCount: params.financeInbox.filter((item) => item.reviewStatus === 'pending').length,
    openAlerts: params.financeAlerts.filter((alert) => alert.status === 'open').length,
    timeline,
  };
}

export function buildFinanceAlerts(params: {
  invoices: Invoice[];
  recurringExpenses: RecurringExpense[];
  expenses: Expense[];
  financeInbox: FinanceInboxItem[];
  overview: FinanceOverview;
}): FinanceAlert[] {
  const today = todayIso();
  const tomorrow = addDaysToIsoDate(today, 1);
  const alerts: FinanceAlert[] = [];

  params.invoices
    .filter((invoice) => invoice.status !== 'paid' && invoice.dueDate === tomorrow)
    .forEach((invoice) => {
      alerts.push({
        id: entryId('alert_invoice_tomorrow', invoice.id || invoice.invoiceNumber),
        type: 'invoice_due_tomorrow',
        severity: 'medium',
        targetDate: tomorrow,
        status: 'open',
        title: `Invoice due tomorrow: ${invoice.invoiceNumber}`,
        description: `${invoice.clientName} owes ${invoice.totalDue.toLocaleString()} ${invoice.currency}`,
        relatedId: invoice.id,
      });
    });

  params.recurringExpenses
    .filter((item) => item.status === 'active' && item.nextChargeDate === tomorrow)
    .forEach((item) => {
      alerts.push({
        id: entryId('alert_subscription_tomorrow', item.id || item.name),
        type: 'subscription_due_tomorrow',
        severity: 'medium',
        targetDate: tomorrow,
        status: 'open',
        title: `Subscription renews tomorrow: ${item.name}`,
        description: `${item.amount.toLocaleString()} ${item.currency} via ${item.paymentAccount || 'unassigned account'}`,
        relatedId: item.id,
      });
    });

  params.expenses
    .filter((expense) => expense.status !== 'paid' && (expense.dueDate || expense.date) === tomorrow)
    .forEach((expense) => {
      alerts.push({
        id: entryId('alert_payable_tomorrow', expense.id || expense.description),
        type: 'payable_due_tomorrow',
        severity: 'medium',
        targetDate: tomorrow,
        status: 'open',
        title: `Expense due tomorrow: ${expense.description}`,
        description: `${expense.amount.toLocaleString()} ${expense.currency}`,
        relatedId: expense.id,
      });
    });

  params.invoices
    .filter((invoice) => invoice.status !== 'paid' && !!invoice.dueDate && invoice.dueDate < today)
    .forEach((invoice) => {
      alerts.push({
        id: entryId('alert_invoice_overdue', invoice.id || invoice.invoiceNumber),
        type: 'overdue_invoice',
        severity: 'high',
        targetDate: invoice.dueDate!,
        status: 'open',
        title: `Overdue invoice: ${invoice.invoiceNumber}`,
        description: `${invoice.clientName} invoice is overdue since ${invoice.dueDate}`,
        relatedId: invoice.id,
      });
    });

  if (params.financeInbox.some((item) => item.reviewStatus === 'pending')) {
    alerts.push({
      id: 'alert_inbox_review_pending',
      type: 'inbox_review_pending',
      severity: 'low',
      targetDate: today,
      status: 'open',
      title: 'Finance inbox review pending',
      description: `${params.financeInbox.filter((item) => item.reviewStatus === 'pending').length} finance email item(s) waiting for review`,
    });
  }

  if (params.overview.freeCash < 0) {
    alerts.push({
      id: 'alert_low_free_cash',
      type: 'low_free_cash',
      severity: 'high',
      targetDate: today,
      status: 'open',
      title: 'Free cash is negative',
      description: `Projected free cash is ${params.overview.freeCash.toFixed(0)} in the reporting currency.`,
    });
  }

  const shortfallPoint = params.overview.timeline.find((point) => point.freeCash < 0);
  if (shortfallPoint) {
    alerts.push({
      id: 'alert_forecast_shortfall',
      type: 'forecast_shortfall',
      severity: 'high',
      targetDate: shortfallPoint.date,
      status: 'open',
      title: 'Forecast shortfall detected',
      description: `Free cash turns negative on ${shortfallPoint.date}.`,
    });
  }

  return alerts;
}

export function billingCadenceToServiceMonths(cadence?: BillingCadence, intervalMonths?: number) {
  return getServicePeriodMonths(cadence, intervalMonths);
}
