'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    expensesService, invoicesService, clientsService,
    type Expense, type Invoice, type Client,
} from '@/lib/firestore';
import { DollarSign, TrendingUp, TrendingDown, Plus, Edit3, Trash2, X, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const CATEGORIES = [
    { id: 'operations', label: 'Operations', color: '#3498db' },
    { id: 'marketing', label: 'Marketing', color: '#e67e22' },
    { id: 'tools', label: 'Tools & Software', color: '#9b59b6' },
    { id: 'payroll', label: 'Payroll', color: '#2ecc71' },
    { id: 'office', label: 'Office & Admin', color: '#1abc9c' },
    { id: 'client', label: 'Client Expenses', color: '#e74c3c' },
    { id: 'other', label: 'Other', color: '#95a5a6' },
];

const EMPTY_FORM: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> = {
    description: '', amount: 0, currency: 'AED', category: 'operations',
    date: new Date().toISOString().split('T')[0], vendor: '', notes: '',
};

export default function ExpensesPage() {
    const { hasPermission, user } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('');

    useEffect(() => {
        const u1 = expensesService.subscribe(setExpenses);
        const u2 = invoicesService.subscribe(setInvoices);
        clientsService.subscribe(setClients);
        return () => { u1(); u2(); };
    }, []);

    if (!hasPermission('billing:read')) {
        return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
    }

    const canWrite = hasPermission('billing:write');

    // Available months from expenses
    const months = useMemo(() => {
        const set = new Set<string>();
        expenses.forEach(e => set.add(e.date.substring(0, 7)));
        return [...set].sort().reverse();
    }, [expenses]);

    // Filter expenses
    const filtered = useMemo(() => {
        let list = expenses;
        if (filter !== 'all') list = list.filter(e => e.category === filter);
        if (monthFilter) list = list.filter(e => e.date.startsWith(monthFilter));
        return list;
    }, [expenses, filter, monthFilter]);

    // Financial summary
    const currentMonth = new Date().toISOString().substring(0, 7);
    const thisMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0);
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const thisMonthIncome = paidInvoices.filter(i => {
        const d = i.issuedAt || i.createdAt;
        return d && String(d).startsWith(currentMonth);
    }).reduce((s, i) => s + i.totalDue, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalIncome = paidInvoices.reduce((s, i) => s + i.totalDue, 0);
    const netProfit = totalIncome - totalExpenses;

    // Category breakdown
    const catBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
        return CATEGORIES.map(c => ({ ...c, total: map[c.id] || 0 })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
    }, [filtered]);
    const maxCatTotal = Math.max(...catBreakdown.map(c => c.total), 1);

    const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); };
    const openEdit = (e: Expense) => {
        setEditId(e.id!); setForm({ description: e.description, amount: e.amount, currency: e.currency, category: e.category, date: e.date, vendor: e.vendor || '', notes: e.notes || '', clientId: e.clientId, clientName: e.clientName });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.description || !form.amount) return;
        setSaving(true);
        try {
            if (editId) {
                await expensesService.update(editId, form);
            } else {
                await expensesService.create({ ...form, createdBy: user?.uid });
            }
            setShowForm(false);
        } catch (err) { console.error(err); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this expense?')) return;
        await expensesService.delete(id);
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Expenses & P&L</h1>
                    <p className="page-subtitle">Track spending and monitor business profitability</p>
                </div>
                {canWrite && (
                    <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.84rem' }}>
                        <Plus size={14} /> Add Expense
                    </button>
                )}
            </div>

            {/* Financial Overview */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label"><ArrowUpCircle size={14} style={{ color: 'var(--success)' }} /> Total Income</div>
                    <div className="kpi-value" style={{ color: 'var(--success)' }}>{fmtAmt(totalIncome)}</div>
                    <div className="kpi-trend">{fmtAmt(thisMonthIncome)} this month</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label"><ArrowDownCircle size={14} style={{ color: 'var(--danger)' }} /> Total Expenses</div>
                    <div className="kpi-value" style={{ color: 'var(--danger)' }}>{fmtAmt(totalExpenses)}</div>
                    <div className="kpi-trend">{fmtAmt(thisMonthExpenses)} this month</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label"><Wallet size={14} /> Net Profit</div>
                    <div className="kpi-value" style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {netProfit >= 0 ? '+' : ''}{fmtAmt(netProfit)}
                    </div>
                    <div className="kpi-trend" style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {netProfit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {totalIncome > 0 ? `${((netProfit / totalIncome) * 100).toFixed(0)}% margin` : '—'}
                    </div>
                </div>
            </div>

            {/* Category Breakdown */}
            {catBreakdown.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 16 }}>Spending by Category</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {catBreakdown.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, minWidth: 100, color: 'var(--foreground)' }}>{c.label}</span>
                                <div style={{ flex: 1, height: 24, background: 'var(--muted-bg)', borderRadius: 6, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${(c.total / maxCatTotal) * 100}%`, minWidth: 2,
                                        background: c.color, borderRadius: 6, transition: 'width 0.5s ease',
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                                    }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>
                                            {c.total >= 1000 ? `${(c.total / 1000).toFixed(0)}K` : c.total}
                                        </span>
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, minWidth: 70, textAlign: 'right' }}>{fmtAmt(c.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <select className="form-input" style={{ width: 'auto', minWidth: 140 }} value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select className="form-input" style={{ width: 'auto', minWidth: 140 }} value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
                    <option value="">All Months</option>
                    {months.map(m => <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>)}
                </select>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                    {filtered.length} expense{filtered.length !== 1 ? 's' : ''} · Total: {fmtAmt(filtered.reduce((s, e) => s + e.amount, 0))}
                </span>
            </div>

            {/* Expense List */}
            <div className="card" style={{ padding: 0 }}>
                {filtered.length === 0 ? (
                    <div className="empty-state" style={{ padding: 48 }}>
                        <div className="empty-state-icon">💰</div>
                        <div className="empty-state-title">No Expenses</div>
                        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Add your first expense to start tracking.</p>
                    </div>
                ) : (
                    <div style={{ overflow: 'auto' }}>
                        <table className="data-table">
                            <thead><tr>
                                <th>Date</th><th>Description</th><th>Category</th>
                                <th>Vendor</th><th style={{ textAlign: 'right' }}>Amount</th>
                                {canWrite && <th style={{ width: 80 }}>Actions</th>}
                            </tr></thead>
                            <tbody>
                                {filtered.map(e => {
                                    const cat = CATEGORIES.find(c => c.id === e.category);
                                    return (
                                        <tr key={e.id}>
                                            <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{e.description}</div>
                                                {e.clientName && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{e.clientName}</div>}
                                            </td>
                                            <td><span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 4, background: `${cat?.color || '#999'}15`, color: cat?.color, fontWeight: 600 }}>{cat?.label || e.category}</span></td>
                                            <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{e.vendor || '—'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)', fontSize: '0.88rem' }}>
                                                -{fmtAmt(e.amount)} {e.currency}
                                                {e.isRecurring && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', display: 'block' }}>↻ {e.recurringPeriod}</span>}
                                            </td>
                                            {canWrite && (
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button onClick={() => openEdit(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--aw-navy)' }}><Edit3 size={14} /></button>
                                                        <button onClick={() => handleDelete(e.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => setShowForm(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card-bg)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ fontWeight: 700 }}>{editId ? 'Edit Expense' : 'Add Expense'}</h3>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                                <label className="form-label">Date</label>
                                <input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Category</label>
                                <select className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))}>
                                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label">Description</label>
                            <input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What was this expense for?" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div><label className="form-label">Amount</label><input className="form-input" type="number" min="0" step="0.01" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} /></div>
                            <div><label className="form-label">Currency</label>
                                <select className="form-input" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                                    <option value="AED">AED</option><option value="SAR">SAR</option><option value="EGP">EGP</option><option value="USD">USD</option><option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div><label className="form-label">Vendor</label><input className="form-input" value={form.vendor || ''} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} placeholder="Company/person" /></div>
                            <div><label className="form-label">Client (optional)</label>
                                <select className="form-input" value={form.clientId || ''} onChange={e => { const cl = clients.find(c => c.id === e.target.value); setForm(p => ({ ...p, clientId: e.target.value || undefined, clientName: cl?.name || undefined })); }}>
                                    <option value="">Not client-specific</option>
                                    {clients.map(c => <option key={c.id} value={c.id!}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label className="form-label">Notes</label>
                            <textarea className="form-input" rows={2} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional details..." />
                        </div>
                        <button className="btn-primary" onClick={handleSave} disabled={saving || !form.description || !form.amount}
                            style={{ width: '100%', padding: '10px', fontSize: '0.88rem' }}>
                            {saving ? 'Saving...' : editId ? 'Update Expense' : 'Add Expense'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
