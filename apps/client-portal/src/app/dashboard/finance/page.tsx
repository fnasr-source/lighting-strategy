'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  cashAccountsService,
  clientsService,
  expensesService,
  financeAlertsService,
  financeInboxService,
  invoicesService,
  paymentsService,
  proposalsService,
  recurringExpensesService,
  recurringInvoicesService,
  type CashAccount,
  type Client,
  type Expense,
  type FinanceAlert,
  type FinanceInboxItem,
  type FinanceSettings,
  type Invoice,
  type Payment,
  type Proposal,
  type RecurringExpense,
  type RecurringInvoice,
} from '@/lib/firestore';
import { addDaysToIsoDate, computeFinanceOverview, DEFAULT_FINANCE_LABELS } from '@/lib/finance';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertTriangle,
  Banknote,
  Bell,
  CheckCircle2,
  DollarSign,
  Landmark,
  Link2,
  MailSearch,
  Pencil,
  RefreshCw,
  Save,
  TrendingUp,
  Upload,
  Wallet,
  XCircle,
  Trash2,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const DEFAULT_SETTINGS: FinanceSettings = {
  watchedLabels: DEFAULT_FINANCE_LABELS,
  pollingMinutes: 15,
  digestRecipients: [],
  baseCurrency: 'AED',
  forecastHorizons: [30, 90, 180],
  dailyDigestHourDubai: 9,
};

const TABS = ['overview', 'revenue', 'inbox', 'recurring', 'cash', 'settings'] as const;
type Tab = (typeof TABS)[number];

function fmtAmount(value: number, currency: string) {
  return `${Math.round(value || 0).toLocaleString()} ${currency}`;
}

function cadenceLabel(value?: string, intervalMonths?: number) {
  if (value === 'quarterly' || value === '3_months') return 'Quarterly';
  if (value === 'semiannual' || value === '6_months') return 'Semiannual';
  if (value === 'annual' || value === '12_months') return 'Annual';
  if (value === 'monthly' || value === '1_month' || value === 'month_to_month') return 'Monthly';
  if (value === 'custom_months' && intervalMonths) return `Every ${intervalMonths} months`;
  return value || 'Not set';
}

function isoWithinDays(date: string | undefined, days: number) {
  if (!date) return false;
  const today = new Date().toISOString().slice(0, 10);
  const end = addDaysToIsoDate(today, days);
  return date >= today && date <= end;
}

function byDateAsc<T extends { dueDate?: string; nextDueDate?: string; nextChargeDate?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const left = a.dueDate || a.nextDueDate || a.nextChargeDate || '9999-12-31';
    const right = b.dueDate || b.nextDueDate || b.nextChargeDate || '9999-12-31';
    return left.localeCompare(right);
  });
}

export default function FinancePage() {
  const { hasPermission, user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [horizon, setHorizon] = useState(90);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [financeInbox, setFinanceInbox] = useState<FinanceInboxItem[]>([]);
  const [financeAlerts, setFinanceAlerts] = useState<FinanceAlert[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [settings, setSettings] = useState<FinanceSettings>(DEFAULT_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [busyInboxId, setBusyInboxId] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [inboxFilter, setInboxFilter] = useState<'pending' | 'all'>('pending');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [editingRecurringId, setEditingRecurringId] = useState('');
  const [editingCashId, setEditingCashId] = useState('');
  const [cashForm, setCashForm] = useState({ name: '', accountType: 'bank' as CashAccount['accountType'], currency: 'AED', currentBalance: '', includeInAvailableCash: true, notes: '' });
  const [expenseForm, setExpenseForm] = useState({ name: '', vendor: '', aliases: '', category: 'Other', amount: '', currency: 'AED', nextChargeDate: '', paymentAccount: '', utilizedBy: '', cadence: 'monthly' as RecurringExpense['cadence'] });
  const [recurringDrafts, setRecurringDrafts] = useState<Record<string, Partial<RecurringExpense>>>({});
  const [cashDrafts, setCashDrafts] = useState<Record<string, Partial<CashAccount>>>({});

  useEffect(() => {
    const unsubs = [
      clientsService.subscribe(setClients),
      invoicesService.subscribe(setInvoices),
      paymentsService.subscribe(setPayments),
      expensesService.subscribe(setExpenses),
      recurringExpensesService.subscribe(setRecurringExpenses),
      recurringInvoicesService.subscribe(setRecurringInvoices),
      proposalsService.subscribe(setProposals),
      financeInboxService.subscribe(setFinanceInbox),
      financeAlertsService.subscribe(setFinanceAlerts),
      cashAccountsService.subscribe(setCashAccounts),
    ];
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const token = await user?.getIdToken();
      const response = await fetch('/api/finance/settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) return;
      const json = await response.json();
      if (json?.settings) setSettings({ ...DEFAULT_SETTINGS, ...json.settings });
    };
    void loadSettings();
  }, [user]);

  const overview = useMemo(() => computeFinanceOverview({
    cashAccounts,
    invoices,
    payments,
    expenses,
    recurringExpenses,
    recurringInvoices,
    proposals,
    financeInbox,
    financeAlerts,
    baseCurrency: settings.baseCurrency,
    horizonDays: horizon,
  }), [cashAccounts, invoices, payments, expenses, recurringExpenses, recurringInvoices, proposals, financeInbox, financeAlerts, settings.baseCurrency, horizon]);

  const openInvoices = useMemo(() => byDateAsc(invoices.filter((invoice) => invoice.status !== 'paid')), [invoices]);
  const revenueTemplates = useMemo(() => byDateAsc(recurringInvoices.filter((invoice) => invoice.active)), [recurringInvoices]);
  const upcomingReceivables = useMemo(() => {
    const invoiceRows = openInvoices.filter((invoice) => isoWithinDays(invoice.dueDate, 30));
    const recurringRows = revenueTemplates.filter((invoice) => isoWithinDays(invoice.nextDueDate || invoice.nextSendDate, 30));
    return { invoiceRows, recurringRows };
  }, [openInvoices, revenueTemplates]);
  const activeSubscriptions = useMemo(() => recurringExpenses.filter((item) => item.status === 'active'), [recurringExpenses]);
  const filteredRecurringExpenses = useMemo(() => {
    const query = expenseSearch.trim().toLowerCase();
    const base = recurringExpenses;
    if (!query) return base;
    return base.filter((item) => `${item.name} ${item.vendor || ''} ${item.category} ${item.paymentAccount || ''}`.toLowerCase().includes(query));
  }, [recurringExpenses, expenseSearch]);
  const inboxItems = useMemo(() => {
    const base = inboxFilter === 'pending' ? financeInbox.filter((item) => item.reviewStatus === 'pending') : financeInbox;
    return [...base].sort((a, b) => (b.receivedAt || '').localeCompare(a.receivedAt || ''));
  }, [financeInbox, inboxFilter]);
  const clientsMissingCadence = useMemo(() => {
    const recurringClientIds = new Set(revenueTemplates.map((item) => item.clientId));
    return clients.filter((client) => client.status === 'active' && !client.billingCadence && !recurringClientIds.has(client.id || ''));
  }, [clients, revenueTemplates]);
  const scheduledRevenueTotal = revenueTemplates.reduce((sum, item) => sum + item.totalDue, 0);
  const next30RevenueTotal = upcomingReceivables.invoiceRows.reduce((sum, item) => sum + item.totalDue, 0)
    + upcomingReceivables.recurringRows.reduce((sum, item) => sum + item.totalDue, 0);
  const next30PayablesTotal = recurringExpenses.filter((item) => item.status === 'active' && isoWithinDays(item.nextChargeDate, 30)).reduce((sum, item) => sum + item.amount, 0)
    + expenses.filter((item) => item.status !== 'paid' && isoWithinDays(item.dueDate || item.date, 30)).reduce((sum, item) => sum + item.amount, 0);

  if (!hasPermission('billing:read')) {
    return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
  }

  const withAuth = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = await user?.getIdToken();
    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  const flash = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const saveSettings = async () => {
    const response = await withAuth('/api/finance/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (response.ok) {
      setSettingsSaved(true);
      flash('Finance settings updated.');
      setTimeout(() => setSettingsSaved(false), 2500);
    }
  };

  const addCashAccount = async () => {
    if (!cashForm.name || !cashForm.currentBalance) return;
    await cashAccountsService.create({
      name: cashForm.name,
      accountType: cashForm.accountType,
      currency: cashForm.currency,
      currentBalance: Number(cashForm.currentBalance),
      includeInAvailableCash: cashForm.includeInAvailableCash,
      notes: cashForm.notes,
      lastUpdatedAt: new Date().toISOString(),
    });
    setCashForm({ name: '', accountType: 'bank', currency: 'AED', currentBalance: '', includeInAvailableCash: true, notes: '' });
    flash('Cash account added.');
  };

  const addRecurringExpense = async () => {
    if (!expenseForm.name || !expenseForm.amount || !expenseForm.nextChargeDate) return;
    const aliases = Array.from(new Set([
      expenseForm.name,
      expenseForm.vendor,
      ...expenseForm.aliases.split(',').map((value) => value.trim()),
      expenseForm.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
      expenseForm.vendor.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
    ].filter(Boolean)));
    await recurringExpensesService.create({
      name: expenseForm.name,
      vendor: expenseForm.vendor || expenseForm.name,
      category: expenseForm.category,
      utilizedBy: expenseForm.utilizedBy,
      cadence: expenseForm.cadence,
      intervalMonths: expenseForm.cadence === 'quarterly' ? 3 : expenseForm.cadence === 'semiannual' ? 6 : expenseForm.cadence === 'annual' ? 12 : 1,
      nextChargeDate: expenseForm.nextChargeDate,
      amount: Number(expenseForm.amount),
      currency: expenseForm.currency,
      paymentAccount: expenseForm.paymentAccount,
      status: 'active',
      source: 'manual',
      aliases,
    });
    setExpenseForm({ name: '', vendor: '', aliases: '', category: 'Other', amount: '', currency: 'AED', nextChargeDate: '', paymentAccount: '', utilizedBy: '', cadence: 'monthly' });
    flash('Recurring expense added.');
  };

  const approveInbox = async (item: FinanceInboxItem, postingTarget: NonNullable<FinanceInboxItem['postingTarget']>) => {
    if (!item.id) return;
    setBusyInboxId(item.id);
    try {
      await withAuth(`/api/finance/inbox/${item.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postingTarget,
          linkedRecurringExpenseId: item.suggestedRecurringExpenseId,
          invoiceId: item.suggestedInvoiceId,
          invoiceNumber: item.suggestedInvoiceNumber,
        }),
      });
      flash('Inbox item approved.');
    } finally {
      setBusyInboxId('');
    }
  };

  const rejectInbox = async (item: FinanceInboxItem) => {
    if (!item.id) return;
    setBusyInboxId(item.id);
    try {
      await withAuth(`/api/finance/inbox/${item.id}/reject`, { method: 'POST' });
      flash('Inbox item ignored.');
    } finally {
      setBusyInboxId('');
    }
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await withAuth('/api/finance/import-subscriptions', { method: 'POST', body: formData });
      const json = await response.json().catch(() => null);
      flash(`Imported ${json?.imported || 0} subscription rows.`);
    } finally {
      setImporting(false);
    }
  };

  const runSync = async (route: string, successMessage: string) => {
    setSyncing(true);
    try {
      const response = await withAuth(route, { method: 'POST' });
      if (response.ok) flash(successMessage);
    } finally {
      setSyncing(false);
    }
  };

  const startRecurringEdit = (item: RecurringExpense) => {
    if (!item.id) return;
    setEditingRecurringId(item.id);
    setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...item } }));
  };

  const saveRecurringEdit = async (item: RecurringExpense) => {
    if (!item.id) return;
    const draft = recurringDrafts[item.id];
    if (!draft) return;
    await recurringExpensesService.update(item.id, draft);
    setEditingRecurringId('');
    setRecurringDrafts((current) => {
      const next = { ...current };
      delete next[item.id!];
      return next;
    });
    flash('Recurring expense updated.');
  };

  const deleteRecurring = async (item: RecurringExpense) => {
    if (!item.id) return;
    await recurringExpensesService.delete(item.id);
    flash('Recurring expense deleted.');
  };

  const startCashEdit = (item: CashAccount) => {
    if (!item.id) return;
    setEditingCashId(item.id);
    setCashDrafts((current) => ({ ...current, [item.id!]: { ...item } }));
  };

  const saveCashEdit = async (item: CashAccount) => {
    if (!item.id) return;
    const draft = cashDrafts[item.id];
    if (!draft) return;
    await cashAccountsService.update(item.id, { ...draft, lastUpdatedAt: new Date().toISOString() });
    setEditingCashId('');
    setCashDrafts((current) => {
      const next = { ...current };
      delete next[item.id!];
      return next;
    });
    flash('Cash account updated.');
  };

  const deleteCash = async (item: CashAccount) => {
    if (!item.id) return;
    await cashAccountsService.delete(item.id);
    flash('Cash account deleted.');
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Finance Operations</h1>
          <p className="page-subtitle">Cash oversight, receivables, obligations, email ingestion, and forecast control</p>
          {statusMessage && <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--success)' }}>{statusMessage}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => runSync('/api/finance/ingest', 'Finance inbox refreshed from Gmail.')} disabled={syncing}><MailSearch size={14} /> Check Email</button>
          <button className="btn btn-outline" onClick={() => runSync('/api/finance/reprocess-inbox', 'Finance inbox rematched and deduped.')} disabled={syncing}><RefreshCw size={14} /> Reprocess Inbox</button>
          <button className="btn btn-outline" onClick={() => runSync('/api/finance/sync', 'Ledger and forecast refreshed.')} disabled={syncing}><RefreshCw size={14} /> Sync Ledger</button>
          <button className="btn btn-outline" onClick={() => runSync('/api/finance/alerts', 'Finance alerts refreshed.')} disabled={syncing}><Bell size={14} /> Refresh Alerts</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map((item) => (
          <button key={item} className="btn" onClick={() => setTab(item)} style={{
            width: 'auto',
            background: tab === item ? 'var(--aw-navy)' : 'transparent',
            color: tab === item ? '#fff' : 'var(--muted)',
            border: tab === item ? 'none' : '1px solid var(--card-border)',
          }}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="kpi-grid">
            <KpiCard icon={<Landmark size={16} />} label="Current Cash" value={fmtAmount(overview.currentCash, settings.baseCurrency)} />
            <KpiCard icon={<Wallet size={16} />} label="Committed Outflows" value={fmtAmount(overview.committedOutflows, settings.baseCurrency)} tone="danger" />
            <KpiCard icon={<Banknote size={16} />} label="Deferred Reserve" value={fmtAmount(overview.deferredRevenueReserve, settings.baseCurrency)} tone="warning" />
            <KpiCard icon={<TrendingUp size={16} />} label="Free Cash" value={fmtAmount(overview.freeCash, settings.baseCurrency)} tone={overview.freeCash < 0 ? 'danger' : 'success'} />
            <KpiCard icon={<DollarSign size={16} />} label="Next 30d Receivables" value={fmtAmount(next30RevenueTotal, settings.baseCurrency)} />
            <KpiCard icon={<AlertTriangle size={16} />} label="Pipeline Upside" value={fmtAmount(overview.expectedPipeline, settings.baseCurrency)} />
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Forecast Timeline</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {[30, 90, 180].map((days) => (
                  <button key={days} className="btn btn-outline" onClick={() => setHorizon(days)} style={{ padding: '6px 12px', background: horizon === days ? 'var(--muted-bg)' : undefined }}>{days}d</button>
                ))}
              </div>
            </div>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={overview.timeline.filter((_, index) => index % Math.max(1, Math.floor(horizon / 15)) === 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number | string | undefined) => fmtAmount(Number(value || 0), settings.baseCurrency)} />
                  <Line type="monotone" dataKey="freeCash" stroke="#001a70" strokeWidth={3} dot={false} name="Free Cash" />
                  <Line type="monotone" dataKey="receivables" stroke="#16a34a" strokeWidth={2} dot={false} name="Receivables" />
                  <Line type="monotone" dataKey="payables" stroke="#dc2626" strokeWidth={2} dot={false} name="Payables" />
                  <Line type="monotone" dataKey="reserves" stroke="#ca8a04" strokeWidth={2} dot={false} name="Reserves" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dashboard-charts-grid" style={{ marginBottom: 20 }}>
            <ListCard title="Operations Snapshot">
              <SimpleRow label="Active Revenue Templates" value={String(revenueTemplates.length)} />
              <SimpleRow label="Active Subscriptions" value={String(activeSubscriptions.length)} />
              <SimpleRow label="Finance Inbox Pending" value={String(overview.pendingInboxCount)} />
              <SimpleRow label="Open Alerts" value={String(overview.openAlerts)} />
              <SimpleRow label="Cash Accounts" value={String(cashAccounts.length)} />
            </ListCard>
            <ListCard title="Revenue Snapshot">
              <SimpleRow label="Scheduled Revenue Templates" value={fmtAmount(scheduledRevenueTotal, settings.baseCurrency)} />
              <SimpleRow label="Open Client Invoices" value={String(openInvoices.length)} />
              <SimpleRow label="Clients Missing Cadence" value={String(clientsMissingCadence.length)} />
              <SimpleRow label="Next 30d Payables" value={fmtAmount(next30PayablesTotal, settings.baseCurrency)} />
            </ListCard>
            <ListCard title="Alert Center">
              {financeAlerts.filter((alert) => alert.status === 'open').slice(0, 6).map((alert) => (
                <div key={alert.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--card-border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{alert.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{alert.description}</div>
                </div>
              ))}
              {financeAlerts.filter((alert) => alert.status === 'open').length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No active alerts.</div>}
            </ListCard>
          </div>

          <div className="dashboard-charts-grid">
            <ListCard title="Receivables Due Soon">
              {upcomingReceivables.invoiceRows.slice(0, 5).map((invoice) => (
                <InfoRow key={invoice.id || invoice.invoiceNumber} primary={`${invoice.clientName} - ${invoice.invoiceNumber}`} secondary={`Due ${invoice.dueDate || 'n/a'}`} trailing={fmtAmount(invoice.totalDue, invoice.currency)} />
              ))}
              {upcomingReceivables.recurringRows.slice(0, 5).map((invoice) => (
                <InfoRow key={invoice.id || invoice.templateName} primary={`${invoice.clientName} - ${invoice.templateName}`} secondary={`${cadenceLabel(invoice.frequency, invoice.intervalMonths)} · ${invoice.nextDueDate || invoice.nextSendDate || 'n/a'}`} trailing={fmtAmount(invoice.totalDue, invoice.currency)} />
              ))}
              {upcomingReceivables.invoiceRows.length === 0 && upcomingReceivables.recurringRows.length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No receivables in the next 30 days.</div>}
            </ListCard>
            <ListCard title="Payables Due Soon">
              {byDateAsc(recurringExpenses.filter((item) => item.status === 'active' && isoWithinDays(item.nextChargeDate, 30))).slice(0, 6).map((item) => (
                <InfoRow key={item.id || item.name} primary={item.name} secondary={`${cadenceLabel(item.cadence, item.intervalMonths)} · ${item.nextChargeDate}`} trailing={fmtAmount(item.amount, item.currency)} />
              ))}
              {byDateAsc(expenses.filter((item) => item.status !== 'paid' && isoWithinDays(item.dueDate || item.date, 30))).slice(0, 4).map((item) => (
                <InfoRow key={item.id || item.description} primary={item.description} secondary={`${item.vendor || 'Unassigned'} · ${item.dueDate || item.date}`} trailing={fmtAmount(item.amount, item.currency)} />
              ))}
              {recurringExpenses.filter((item) => item.status === 'active' && isoWithinDays(item.nextChargeDate, 30)).length === 0 && expenses.filter((item) => item.status !== 'paid' && isoWithinDays(item.dueDate || item.date, 30)).length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No payables in the next 30 days.</div>}
            </ListCard>
          </div>
        </>
      )}

      {tab === 'revenue' && (
        <div className="dashboard-charts-grid">
          <div className="card" style={{ overflow: 'auto' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>Recurring Revenue Templates</h3>
            <table className="data-table">
              <thead>
                <tr><th>Client</th><th>Template</th><th>Cadence</th><th>Next Due</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {revenueTemplates.map((item) => (
                  <tr key={item.id}>
                    <td>{item.clientName}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.templateName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Service months: {item.servicePeriodMonths || item.intervalMonths || 1}</div>
                    </td>
                    <td>{cadenceLabel(item.frequency, item.intervalMonths)}</td>
                    <td>{item.nextDueDate || item.nextSendDate || '—'}</td>
                    <td>{fmtAmount(item.totalDue, item.currency)}</td>
                    <td><span className="status-pill status-paid">active</span></td>
                  </tr>
                ))}
                {revenueTemplates.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No recurring revenue templates yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ overflow: 'auto' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>Open Client Invoices</h3>
            <table className="data-table">
              <thead>
                <tr><th>Invoice</th><th>Client</th><th>Due</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {openInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoice.clientName}</td>
                    <td>{invoice.dueDate || '—'}</td>
                    <td>{fmtAmount(invoice.totalDue, invoice.currency)}</td>
                    <td><span className={`status-pill status-${invoice.status === 'overdue' ? 'overdue' : 'pending'}`}>{invoice.status}</span></td>
                  </tr>
                ))}
                {openInvoices.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No open invoices.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>Active Clients Missing Revenue Cadence</h3>
            {clientsMissingCadence.map((client) => (
              <div key={client.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--card-border)' }}>
                <div style={{ fontWeight: 600 }}>{client.name}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>No recurring template or billing cadence configured yet.</div>
              </div>
            ))}
            {clientsMissingCadence.length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Every active client has cadence or a recurring template configured.</div>}
          </div>
        </div>
      )}

      {tab === 'inbox' && (
        <div className="card" style={{ overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Finance Inbox Review</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" style={{ padding: '6px 10px', background: inboxFilter === 'pending' ? 'var(--muted-bg)' : undefined }} onClick={() => setInboxFilter('pending')}>Pending</button>
              <button className="btn btn-outline" style={{ padding: '6px 10px', background: inboxFilter === 'all' ? 'var(--muted-bg)' : undefined }} onClick={() => setInboxFilter('all')}>All</button>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Received</th><th>Sender</th><th>Subject</th><th>AI Decision</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {inboxItems.map((item) => {
                const suggestedTarget = item.suggestedPostingTarget || item.postingTarget || 'ignore';
                const primaryAction = suggestedTarget === 'payment' ? 'payment' : 'expense';
                const primaryLabel = item.suggestedRecurringExpenseId ? 'Log Charge' : primaryAction === 'payment' ? 'Post Payment' : 'Post Expense';
                const recurringLabel = item.suggestedRecurringExpenseId ? 'Update Subscription' : 'Create Subscription';
                return (
                  <tr key={item.id}>
                    <td>{item.receivedAt ? new Date(item.receivedAt).toLocaleDateString() : '—'}</td>
                    <td>{item.extractedVendor || item.sender || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.subject || 'Untitled'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>{item.rawSnippet}</div>
                      {item.attachments && item.attachments.length > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{item.attachments.length} attachment(s)</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.suggestedPostingTarget || item.parsedType}</div>
                      {item.aiSummary && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.aiSummary}</div>}
                      {item.suggestedRecurringExpenseName && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}><Link2 size={11} style={{ display: 'inline-flex', marginRight: 4 }} />Match: {item.suggestedRecurringExpenseName}</div>}
                      {item.suggestedInvoiceNumber && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Invoice match: {item.suggestedInvoiceNumber}</div>}
                    </td>
                    <td>{typeof item.extractedAmount === 'number' ? `${item.extractedAmount.toLocaleString()} ${item.extractedCurrency || ''}` : '—'}</td>
                    <td><span className={`status-pill status-${item.reviewStatus === 'approved' ? 'paid' : item.reviewStatus === 'rejected' ? 'overdue' : 'pending'}`}>{item.reviewStatus}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-outline" disabled={busyInboxId === item.id || item.reviewStatus !== 'pending'} onClick={() => approveInbox(item, primaryAction)} style={{ padding: '4px 8px' }}><CheckCircle2 size={12} /> {primaryLabel}</button>
                        <button className="btn btn-outline" disabled={busyInboxId === item.id || item.reviewStatus !== 'pending'} onClick={() => approveInbox(item, 'recurring_expense')} style={{ padding: '4px 8px' }}><RefreshCw size={12} /> {recurringLabel}</button>
                        <button className="btn btn-outline" disabled={busyInboxId === item.id || item.reviewStatus !== 'pending'} onClick={() => rejectInbox(item)} style={{ padding: '4px 8px' }}><XCircle size={12} /> Ignore</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {inboxItems.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No finance inbox items for this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'recurring' && (
        <div className="dashboard-charts-grid">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Recurring Expenses</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input className="form-input" style={{ width: 220 }} value={expenseSearch} onChange={(event) => setExpenseSearch(event.target.value)} placeholder="Search subscriptions" />
                <label className="btn btn-outline" style={{ width: 'auto', cursor: importing ? 'progress' : 'pointer' }}>
                  <Upload size={14} /> Import CSV
                  <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importCsv(file);
                  }} />
                </label>
              </div>
            </div>
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Cadence</th><th>Next Charge</th><th>Amount</th><th>Account</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredRecurringExpenses.map((item) => {
                    const draft = recurringDrafts[item.id || ''] || item;
                    const editing = editingRecurringId === item.id;
                    return (
                      <tr key={item.id}>
                        <td>
                          {editing ? (
                            <div style={{ display: 'grid', gap: 8 }}>
                              <input className="form-input" value={String(draft.name || '')} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...current[item.id!], name: event.target.value } }))} />
                              <input className="form-input" value={String(draft.vendor || '')} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...current[item.id!], vendor: event.target.value } }))} placeholder="Vendor" />
                              <input className="form-input" value={Array.isArray(draft.aliases) ? draft.aliases.join(', ') : ''} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...current[item.id!], aliases: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) } }))} placeholder="Aliases (comma separated)" />
                              <input className="form-input" value={String(draft.category || '')} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...current[item.id!], category: event.target.value } }))} placeholder="Category" />
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 600 }}>{item.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.vendor || item.category} · {item.source}</div>
                              {item.aliases && item.aliases.length > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Aliases: {item.aliases.join(', ')}</div>}
                            </div>
                          )}
                        </td>
                        <td>
                          {editing ? (
                            <select className="form-input" value={String(draft.cadence || 'monthly')} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...current[item.id!], cadence: event.target.value as RecurringExpense['cadence'], intervalMonths: event.target.value === 'quarterly' ? 3 : event.target.value === 'semiannual' ? 6 : event.target.value === 'annual' ? 12 : 1 } }))}>
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="semiannual">Semiannual</option>
                              <option value="annual">Annual</option>
                            </select>
                          ) : cadenceLabel(item.cadence, item.intervalMonths)}
                        </td>
                        <td>
                          {editing ? <input className="form-input" type="date" value={String(draft.nextChargeDate || '')} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...current[item.id!], nextChargeDate: event.target.value } }))} /> : item.nextChargeDate}
                        </td>
                        <td>
                          {editing ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
                              <input className="form-input" type="number" value={String(draft.amount || '')} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...current[item.id!], amount: Number(event.target.value) } }))} />
                              <select className="form-input" value={String(draft.currency || 'AED')} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...current[item.id!], currency: event.target.value } }))}><option>AED</option><option>USD</option><option>EGP</option><option>SAR</option></select>
                            </div>
                          ) : `${item.amount.toLocaleString()} ${item.currency}`}
                        </td>
                        <td>
                          {editing ? <input className="form-input" value={String(draft.paymentAccount || '')} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...current[item.id!], paymentAccount: event.target.value } }))} /> : (item.paymentAccount || '—')}
                        </td>
                        <td>
                          {editing ? (
                            <select className="form-input" value={String(draft.status || 'active')} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [item.id!]: { ...current[item.id!], status: event.target.value as RecurringExpense['status'] } }))}>
                              <option value="active">active</option>
                              <option value="paused">paused</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          ) : <span className={`status-pill status-${item.status === 'active' ? 'paid' : item.status === 'paused' ? 'pending' : 'overdue'}`}>{item.status}</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {editing ? (
                              <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => void saveRecurringEdit(item)}><Save size={12} /> Save</button>
                            ) : (
                              <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => startRecurringEdit(item)}><Pencil size={12} /> Edit</button>
                            )}
                            <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => void deleteRecurring(item)}><Trash2 size={12} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRecurringExpenses.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No recurring expenses found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Add Recurring Expense</h3>
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={expenseForm.name} onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Vendor</label><input className="form-input" value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Aliases</label><input className="form-input" value={expenseForm.aliases} onChange={(e) => setExpenseForm({ ...expenseForm, aliases: e.target.value })} placeholder="Comma separated aliases" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label className="form-label">Amount</label><input className="form-input" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Currency</label><select className="form-input" value={expenseForm.currency} onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}><option>AED</option><option>USD</option><option>EGP</option><option>SAR</option></select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label className="form-label">Next Charge</label><input className="form-input" type="date" value={expenseForm.nextChargeDate} onChange={(e) => setExpenseForm({ ...expenseForm, nextChargeDate: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Cadence</label><select className="form-input" value={expenseForm.cadence} onChange={(e) => setExpenseForm({ ...expenseForm, cadence: e.target.value as RecurringExpense['cadence'] })}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="semiannual">Semiannual</option><option value="annual">Annual</option></select></div>
            </div>
            <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Payment Account</label><input className="form-input" value={expenseForm.paymentAccount} onChange={(e) => setExpenseForm({ ...expenseForm, paymentAccount: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Utilized By</label><input className="form-input" value={expenseForm.utilizedBy} onChange={(e) => setExpenseForm({ ...expenseForm, utilizedBy: e.target.value })} /></div>
            <button className="btn btn-primary" onClick={() => void addRecurringExpense()}>Add Recurring Expense</button>
          </div>
        </div>
      )}

      {tab === 'cash' && (
        <div className="dashboard-charts-grid">
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Cash Accounts</h3>
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Type</th><th>Balance</th><th>Included</th><th>Actions</th></tr></thead>
                <tbody>
                  {cashAccounts.map((account) => {
                    const draft = cashDrafts[account.id || ''] || account;
                    const editing = editingCashId === account.id;
                    return (
                      <tr key={account.id}>
                        <td>{editing ? <input className="form-input" value={String(draft.name || '')} onChange={(event) => setCashDrafts((current) => ({ ...current, [account.id!]: { ...current[account.id!], name: event.target.value } }))} /> : account.name}</td>
                        <td>{editing ? <select className="form-input" value={String(draft.accountType || 'bank')} onChange={(event) => setCashDrafts((current) => ({ ...current, [account.id!]: { ...current[account.id!], accountType: event.target.value as CashAccount['accountType'] } }))}><option value="bank">Bank</option><option value="wallet">Wallet</option><option value="card">Card</option><option value="petty_cash">Petty Cash</option></select> : account.accountType}</td>
                        <td>
                          {editing ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
                              <input className="form-input" type="number" value={String(draft.currentBalance || '')} onChange={(event) => setCashDrafts((current) => ({ ...current, [account.id!]: { ...current[account.id!], currentBalance: Number(event.target.value) } }))} />
                              <select className="form-input" value={String(draft.currency || 'AED')} onChange={(event) => setCashDrafts((current) => ({ ...current, [account.id!]: { ...current[account.id!], currency: event.target.value } }))}><option>AED</option><option>USD</option><option>EGP</option><option>SAR</option></select>
                            </div>
                          ) : `${account.currentBalance.toLocaleString()} ${account.currency}`}
                        </td>
                        <td>{editing ? <input type="checkbox" checked={Boolean(draft.includeInAvailableCash)} onChange={(event) => setCashDrafts((current) => ({ ...current, [account.id!]: { ...current[account.id!], includeInAvailableCash: event.target.checked } }))} /> : (account.includeInAvailableCash ? 'Yes' : 'No')}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {editing ? (
                              <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => void saveCashEdit(account)}><Save size={12} /> Save</button>
                            ) : (
                              <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => startCashEdit(account)}><Pencil size={12} /> Edit</button>
                            )}
                            <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => void deleteCash(account)}><Trash2 size={12} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {cashAccounts.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No cash accounts added yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Add Cash Account</h3>
            <div className="form-group"><label className="form-label">Account Name</label><input className="form-input" value={cashForm.name} onChange={(e) => setCashForm({ ...cashForm, name: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={cashForm.accountType} onChange={(e) => setCashForm({ ...cashForm, accountType: e.target.value as CashAccount['accountType'] })}><option value="bank">Bank</option><option value="wallet">Wallet</option><option value="card">Card</option><option value="petty_cash">Petty Cash</option></select></div>
              <div className="form-group"><label className="form-label">Currency</label><select className="form-input" value={cashForm.currency} onChange={(e) => setCashForm({ ...cashForm, currency: e.target.value })}><option>AED</option><option>USD</option><option>EGP</option><option>SAR</option></select></div>
            </div>
            <div className="form-group"><label className="form-label">Current Balance</label><input className="form-input" type="number" value={cashForm.currentBalance} onChange={(e) => setCashForm({ ...cashForm, currentBalance: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" rows={3} value={cashForm.notes} onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><input type="checkbox" checked={cashForm.includeInAvailableCash} onChange={(e) => setCashForm({ ...cashForm, includeInAvailableCash: e.target.checked })} /> Include in available cash</label>
            <button className="btn btn-primary" onClick={() => void addCashAccount()}>Add Cash Account</button>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="dashboard-charts-grid">
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Finance Settings</h3>
            <div className="form-group"><label className="form-label">Connected Gmail Email</label><input className="form-input" value={settings.gmailConnectedEmail || ''} onChange={(e) => setSettings({ ...settings, gmailConnectedEmail: e.target.value })} placeholder="finance@admireworks.com" /></div>
            <div className="form-group"><label className="form-label">Base Currency</label><select className="form-input" value={settings.baseCurrency} onChange={(e) => setSettings({ ...settings, baseCurrency: e.target.value })}><option>AED</option><option>USD</option><option>EGP</option><option>SAR</option></select></div>
            <div className="form-group"><label className="form-label">Digest Recipients</label><textarea className="form-input" rows={3} value={(settings.digestRecipients || []).join('\n')} onChange={(e) => setSettings({ ...settings, digestRecipients: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label className="form-label">Polling Minutes</label><input className="form-input" type="number" value={settings.pollingMinutes} onChange={(e) => setSettings({ ...settings, pollingMinutes: Number(e.target.value) || 15 })} /></div>
              <div className="form-group"><label className="form-label">Daily Digest Hour (Dubai)</label><input className="form-input" type="number" value={settings.dailyDigestHourDubai || 9} onChange={(e) => setSettings({ ...settings, dailyDigestHourDubai: Number(e.target.value) || 9 })} /></div>
            </div>
            <div className="form-group"><label className="form-label">Watched Labels</label><textarea className="form-input" rows={4} value={(settings.watchedLabels || []).join('\n')} onChange={(e) => setSettings({ ...settings, watchedLabels: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /></div>
            <button className="btn btn-primary" onClick={() => void saveSettings()}><Save size={14} /> {settingsSaved ? 'Saved' : 'Save Finance Settings'}</button>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>System Status</h3>
            <SimpleRow label="Watched Labels" value={(settings.watchedLabels || []).join(', ') || 'None'} />
            <SimpleRow label="Connected Gmail" value={settings.gmailConnectedEmail || 'Not set'} />
            <SimpleRow label="Base Currency" value={settings.baseCurrency} />
            <SimpleRow label="Digest Recipients" value={String((settings.digestRecipients || []).length)} />
            <SimpleRow label="AI Attachment Review" value="Active via Gemini" />
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 12 }}>
              Gmail is polled on the configured cadence. New emails are classified with attachment-aware AI review before they reach the finance inbox.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'danger' | 'warning' | 'success' }) {
  const color = tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? '#ca8a04' : tone === 'success' ? 'var(--success)' : 'var(--foreground)';
  return (
    <div className="kpi-card">
      <div className="kpi-label" style={{ color }}>{icon} {label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
    </div>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card"><h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>{title}</h3>{children}</div>;
}

function SimpleRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--card-border)', fontSize: '0.82rem' }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function InfoRow({ primary, secondary, trailing }: { primary: string; secondary: string; trailing: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--card-border)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{primary}</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>{secondary}</div>
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{trailing}</div>
    </div>
  );
}
