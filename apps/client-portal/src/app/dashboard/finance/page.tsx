'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  cashAccountsService,
  expensesService,
  financeAlertsService,
  financeInboxService,
  invoicesService,
  paymentsService,
  proposalsService,
  recurringExpensesService,
  recurringInvoicesService,
  type CashAccount,
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
import { computeFinanceOverview, DEFAULT_FINANCE_LABELS } from '@/lib/finance';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  Banknote,
  Bell,
  DollarSign,
  Landmark,
  RefreshCw,
  Upload,
  Save,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MailSearch,
  Wallet,
} from 'lucide-react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const DEFAULT_SETTINGS: FinanceSettings = {
  watchedLabels: DEFAULT_FINANCE_LABELS,
  pollingMinutes: 15,
  digestRecipients: [],
  baseCurrency: 'AED',
  forecastHorizons: [30, 90, 180],
  dailyDigestHourDubai: 9,
};

const TABS = ['overview', 'inbox', 'recurring', 'cash', 'settings'] as const;
type Tab = (typeof TABS)[number];

function fmtAmount(value: number, currency: string) {
  return `${Math.round(value).toLocaleString()} ${currency}`;
}

export default function FinancePage() {
  const { hasPermission, user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [horizon, setHorizon] = useState(90);
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
  const [cashForm, setCashForm] = useState({ name: '', accountType: 'bank' as CashAccount['accountType'], currency: 'AED', currentBalance: '', includeInAvailableCash: true, notes: '' });
  const [expenseForm, setExpenseForm] = useState({ name: '', category: 'Other', amount: '', currency: 'AED', nextChargeDate: '', paymentAccount: '', utilizedBy: '', cadence: 'monthly' as RecurringExpense['cadence'] });

  useEffect(() => {
    const unsubs = [
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
    getDoc(doc(db, 'systemConfig', 'finance')).then((snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...(snap.data() as FinanceSettings) });
      }
    });
  }, []);

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

  if (!hasPermission('billing:read')) {
    return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
  }

  const saveSettings = async () => {
    await setDoc(doc(db, 'systemConfig', 'finance'), { ...settings }, { merge: true });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
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
  };

  const addRecurringExpense = async () => {
    if (!expenseForm.name || !expenseForm.amount || !expenseForm.nextChargeDate) return;
    await recurringExpensesService.create({
      name: expenseForm.name,
      vendor: expenseForm.name,
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
    });
    setExpenseForm({ name: '', category: 'Other', amount: '', currency: 'AED', nextChargeDate: '', paymentAccount: '', utilizedBy: '', cadence: 'monthly' });
  };

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

  const approveInbox = async (item: FinanceInboxItem, postingTarget: string) => {
    if (!item.id) return;
    setBusyInboxId(item.id);
    try {
      await withAuth(`/api/finance/inbox/${item.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postingTarget }),
      });
    } finally {
      setBusyInboxId('');
    }
  };

  const rejectInbox = async (item: FinanceInboxItem) => {
    if (!item.id) return;
    setBusyInboxId(item.id);
    try {
      await withAuth(`/api/finance/inbox/${item.id}/reject`, { method: 'POST' });
    } finally {
      setBusyInboxId('');
    }
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await withAuth('/api/finance/import-subscriptions', { method: 'POST', body: formData });
    } finally {
      setImporting(false);
    }
  };

  const runSync = async (route: string) => {
    setSyncing(true);
    try {
      await withAuth(route, { method: 'POST' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Finance Operations</h1>
          <p className="page-subtitle">Cash oversight, receivables, obligations, inbox review, and forecasting</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => runSync('/api/finance/ingest')} disabled={syncing}><MailSearch size={14} /> Check Email</button>
          <button className="btn btn-outline" onClick={() => runSync('/api/finance/sync')} disabled={syncing}><RefreshCw size={14} /> Sync Ledger</button>
          <button className="btn btn-outline" onClick={() => runSync('/api/finance/alerts')} disabled={syncing}><Bell size={14} /> Refresh Alerts</button>
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
            <KpiCard icon={<DollarSign size={16} />} label="Receivables" value={fmtAmount(overview.receivables, settings.baseCurrency)} />
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

          <div className="dashboard-charts-grid">
            <ListCard title="Due Tomorrow">
              <SimpleRow label="Invoices" value={String(overview.dueTomorrow.invoices.length)} />
              <SimpleRow label="Subscriptions" value={String(overview.dueTomorrow.recurringExpenses.length)} />
              <SimpleRow label="Expenses" value={String(overview.dueTomorrow.expenses.length)} />
              <SimpleRow label="Inbox Pending" value={String(overview.pendingInboxCount)} />
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
        </>
      )}

      {tab === 'inbox' && (
        <div className="card" style={{ overflow: 'auto' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>Finance Inbox Review</h3>
          <table className="data-table">
            <thead>
              <tr><th>Received</th><th>Sender</th><th>Subject</th><th>Parsed</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {financeInbox.map((item) => (
                <tr key={item.id}>
                  <td>{item.receivedAt ? new Date(item.receivedAt).toLocaleDateString() : '—'}</td>
                  <td>{item.extractedVendor || item.sender || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.subject || 'Untitled'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.rawSnippet}</div>
                  </td>
                  <td>{item.parsedType}</td>
                  <td>{typeof item.extractedAmount === 'number' ? `${item.extractedAmount.toLocaleString()} ${item.extractedCurrency || ''}` : '—'}</td>
                  <td><span className={`status-pill status-${item.reviewStatus === 'approved' ? 'paid' : item.reviewStatus === 'rejected' ? 'overdue' : 'pending'}`}>{item.reviewStatus}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-outline" disabled={busyInboxId === item.id || item.reviewStatus !== 'pending'} onClick={() => approveInbox(item, item.parsedType === 'payment_confirmation' ? 'payment' : 'expense')} style={{ padding: '4px 8px' }}><CheckCircle2 size={12} /> Post</button>
                      <button className="btn btn-outline" disabled={busyInboxId === item.id || item.reviewStatus !== 'pending'} onClick={() => approveInbox(item, 'recurring_expense')} style={{ padding: '4px 8px' }}><RefreshCw size={12} /> Recurring</button>
                      <button className="btn btn-outline" disabled={busyInboxId === item.id || item.reviewStatus !== 'pending'} onClick={() => rejectInbox(item)} style={{ padding: '4px 8px' }}><XCircle size={12} /> Ignore</button>
                    </div>
                  </td>
                </tr>
              ))}
              {financeInbox.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No finance inbox items yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'recurring' && (
        <div className="dashboard-charts-grid">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Recurring Expenses</h3>
              <label className="btn btn-outline" style={{ width: 'auto', cursor: importing ? 'progress' : 'pointer' }}>
                <Upload size={14} /> Import CSV
                <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) importCsv(file);
                }} />
              </label>
            </div>
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Next Charge</th><th>Amount</th><th>Account</th><th>Status</th></tr></thead>
                <tbody>
                  {recurringExpenses.map((item) => (
                    <tr key={item.id}>
                      <td><div style={{ fontWeight: 600 }}>{item.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.category}</div></td>
                      <td>{item.nextChargeDate}</td>
                      <td>{item.amount.toLocaleString()} {item.currency}</td>
                      <td>{item.paymentAccount || '—'}</td>
                      <td><span className={`status-pill status-${item.status === 'active' ? 'paid' : item.status === 'paused' ? 'pending' : 'overdue'}`}>{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Add Recurring Expense</h3>
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={expenseForm.name} onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })} /></div>
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
            <button className="btn btn-primary" onClick={addRecurringExpense}>Add Recurring Expense</button>
          </div>
        </div>
      )}

      {tab === 'cash' && (
        <div className="dashboard-charts-grid">
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Cash Accounts</h3>
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Type</th><th>Balance</th><th>Included</th></tr></thead>
                <tbody>
                  {cashAccounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.name}</td>
                      <td>{account.accountType}</td>
                      <td>{account.currentBalance.toLocaleString()} {account.currency}</td>
                      <td>{account.includeInAvailableCash ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
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
            <button className="btn btn-primary" onClick={addCashAccount}>Add Cash Account</button>
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
            <button className="btn btn-primary" onClick={saveSettings}><Save size={14} /> {settingsSaved ? 'Saved' : 'Save Finance Settings'}</button>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Current Defaults</h3>
            <SimpleRow label="Watched Labels" value={String((settings.watchedLabels || []).length)} />
            <SimpleRow label="Base Currency" value={settings.baseCurrency} />
            <SimpleRow label="Digest Recipients" value={String((settings.digestRecipients || []).length)} />
            <SimpleRow label="Forecast Horizons" value={(settings.forecastHorizons || []).join(', ')} />
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 12 }}>
              Gmail OAuth secrets are read server-side from configured secrets. This page stores the operational settings and label map.
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
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
