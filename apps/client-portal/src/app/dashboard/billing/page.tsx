'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    invoicesService, recurringInvoicesService, clientsService,
    type Invoice, type RecurringInvoice, type Client,
} from '@/lib/firestore';
import {
    CreditCard, Plus, X, RefreshCw, AlertTriangle, Check,
    Clock, Calendar, DollarSign, Zap, Pause, Play, Trash2,
} from 'lucide-react';

export default function BillingPage() {
    const { hasPermission } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [recurring, setRecurring] = useState<RecurringInvoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [tab, setTab] = useState<'overview' | 'recurring'>('overview');
    const [showForm, setShowForm] = useState(false);

    // Recurring invoice form
    const [form, setForm] = useState({
        clientId: '', templateName: '', service: '', amount: '',
        currency: 'AED', frequency: 'monthly' as RecurringInvoice['frequency'],
        billingDay: '1', autoSendEmail: true,
        paymentMethods: ['stripe'] as ('stripe' | 'instapay' | 'bank_transfer')[],
    });

    useEffect(() => {
        const u1 = invoicesService.subscribe(setInvoices);
        const u2 = recurringInvoicesService.subscribe(setRecurring);
        const u3 = clientsService.subscribe(setClients);
        return () => { u1(); u2(); u3(); };
    }, []);

    if (!hasPermission('billing:read')) {
        return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
    }

    // KPIs
    const pendingInvoices = invoices.filter(i => i.status === 'pending');
    const overdueInvoices = invoices.filter(i => {
        if (i.status !== 'pending' || !i.dueDate) return false;
        return new Date(i.dueDate) < new Date();
    });
    const paidThisMonth = invoices.filter(i => {
        if (i.status !== 'paid' || !i.paidAt) return false;
        const d = new Date(i.paidAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalPendingAmount = pendingInvoices.reduce((s, i) => s + (i.totalDue || 0), 0);
    const totalOverdueAmount = overdueInvoices.reduce((s, i) => s + (i.totalDue || 0), 0);
    const totalReceivedMonth = paidThisMonth.reduce((s, i) => s + (i.totalDue || 0), 0);

    const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0 });

    const getNextDue = (frequency: string, billingDay: number) => {
        const now = new Date();
        let next = new Date(now.getFullYear(), now.getMonth(), billingDay);
        if (next <= now) {
            if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
            else if (frequency === 'quarterly') next.setMonth(next.getMonth() + 3);
            else next.setFullYear(next.getFullYear() + 1);
        }
        return next.toISOString().slice(0, 10);
    };

    const handleCreateRecurring = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(form.amount) || 0;
        const client = clients.find(c => c.id === form.clientId);
        if (!client) return;

        await recurringInvoicesService.create({
            clientId: form.clientId,
            clientName: client.name,
            templateName: form.templateName || form.service,
            lineItems: [{ description: form.service, qty: 1, rate: amt, amount: amt }],
            subtotal: amt,
            tax: 0,
            totalDue: amt,
            currency: form.currency,
            frequency: form.frequency,
            billingDay: parseInt(form.billingDay),
            nextDueDate: getNextDue(form.frequency, parseInt(form.billingDay)),
            active: true,
            autoSendEmail: form.autoSendEmail,
            paymentMethods: form.paymentMethods,
        });
        setShowForm(false);
        setForm({ clientId: '', templateName: '', service: '', amount: '', currency: 'AED', frequency: 'monthly', billingDay: '1', autoSendEmail: true, paymentMethods: ['stripe'] });
    };

    const toggleRecurring = async (r: RecurringInvoice) => {
        if (r.id) await recurringInvoicesService.update(r.id, { active: !r.active });
    };

    const deleteRecurring = async (r: RecurringInvoice) => {
        if (r.id && confirm('Delete this recurring invoice template?')) {
            await recurringInvoicesService.delete(r.id);
        }
    };

    const togglePaymentMethod = (method: 'stripe' | 'instapay' | 'bank_transfer') => {
        setForm(prev => ({
            ...prev,
            paymentMethods: prev.paymentMethods.includes(method)
                ? prev.paymentMethods.filter(m => m !== method)
                : [...prev.paymentMethods, method],
        }));
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Billing Management</h1>
                    <p className="page-subtitle">Invoicing, recurring billing & payment tracking</p>
                </div>
                {hasPermission('billing:write') && (
                    <button className="btn btn-primary" onClick={() => { setTab('recurring'); setShowForm(true); }}>
                        <Plus size={16} /> New Recurring Invoice
                    </button>
                )}
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label"><Clock size={14} /> Pending</div>
                    <div className="kpi-value">{fmtAmt(totalPendingAmount)}</div>
                    <div className="kpi-trend">{pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="kpi-card" style={overdueInvoices.length > 0 ? { borderColor: 'var(--danger)' } : {}}>
                    <div className="kpi-label" style={overdueInvoices.length > 0 ? { color: 'var(--danger)' } : {}}>
                        <AlertTriangle size={14} /> Overdue
                    </div>
                    <div className="kpi-value" style={overdueInvoices.length > 0 ? { color: 'var(--danger)' } : {}}>{fmtAmt(totalOverdueAmount)}</div>
                    <div className="kpi-trend" style={overdueInvoices.length > 0 ? { color: 'var(--danger)' } : {}}>{overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label"><DollarSign size={14} /> Received This Month</div>
                    <div className="kpi-value" style={{ color: 'var(--success)' }}>{fmtAmt(totalReceivedMonth)}</div>
                    <div className="kpi-trend up">{paidThisMonth.length} payment{paidThisMonth.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label"><RefreshCw size={14} /> Active Recurring</div>
                    <div className="kpi-value">{recurring.filter(r => r.active).length}</div>
                    <div className="kpi-trend">{recurring.length} total templates</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                {(['overview', 'recurring'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} className="btn" style={{
                        background: tab === t ? 'var(--aw-navy)' : 'transparent',
                        color: tab === t ? '#fff' : 'var(--muted)',
                        border: tab === t ? 'none' : '1px solid var(--card-border)',
                        width: 'auto',
                    }}>
                        {t === 'overview' ? '📊 Overview' : '🔄 Recurring'}
                    </button>
                ))}
            </div>

            {/* Overview Tab — Overdue + Pending invoices */}
            {tab === 'overview' && (
                <div>
                    {overdueInvoices.length > 0 && (
                        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.03)' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--danger)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={16} /> Overdue Invoices
                            </h3>
                            {overdueInvoices.map(inv => {
                                const daysOverdue = Math.ceil((Date.now() - new Date(inv.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--card-border)', flexWrap: 'wrap', gap: 8 }}>
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{inv.invoiceNumber}</span>
                                            <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}> — {inv.clientName}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>{daysOverdue}d overdue</span>
                                            <span style={{ fontWeight: 700 }}>{fmtAmt(inv.totalDue)} {inv.currency}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="card">
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>All Pending Invoices</h3>
                        {pendingInvoices.length === 0 ? (
                            <div className="empty-state" style={{ padding: 40 }}>
                                <div className="empty-state-icon">✅</div>
                                <div className="empty-state-title">All Caught Up</div>
                                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No pending invoices!</p>
                            </div>
                        ) : (
                            <div style={{ overflow: 'auto' }}>
                                <table className="data-table">
                                    <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {pendingInvoices.map(inv => (
                                            <tr key={inv.id}>
                                                <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                                                <td>{inv.clientName}</td>
                                                <td style={{ fontWeight: 600 }}>{fmtAmt(inv.totalDue)} {inv.currency}</td>
                                                <td>{inv.dueDate}</td>
                                                <td><span className="status-pill status-pending">Pending</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Recurring Tab */}
            {tab === 'recurring' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {recurring.length === 0 ? (
                        <div className="card">
                            <div className="empty-state" style={{ padding: 48 }}>
                                <div className="empty-state-icon">🔄</div>
                                <div className="empty-state-title">No Recurring Invoices</div>
                                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Set up automated billing for your clients</p>
                            </div>
                        </div>
                    ) : (
                        recurring.map(r => (
                            <div key={r.id} className="card" style={{ padding: 20, opacity: r.active ? 1 : 0.6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.templateName}</div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{r.clientName}</div>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                            <span className="status-pill" style={{ background: 'rgba(0,26,112,0.08)', color: 'var(--aw-navy)' }}>
                                                <RefreshCw size={10} /> {r.frequency}
                                            </span>
                                            <span className="status-pill" style={{ background: 'var(--gold-bg)', color: 'var(--aw-gold)' }}>
                                                <Calendar size={10} /> Day {r.billingDay}
                                            </span>
                                            {r.autoSendEmail && (
                                                <span className="status-pill" style={{ background: 'rgba(22,163,74,0.08)', color: 'var(--success)' }}>
                                                    <Zap size={10} /> Auto-email
                                                </span>
                                            )}
                                            <span className={`status-pill ${r.active ? 'status-active' : 'status-archived'}`}>
                                                {r.active ? 'Active' : 'Paused'}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{fmtAmt(r.totalDue)} {r.currency}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Next: {r.nextDueDate}</div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                                            <button onClick={() => toggleRecurring(r)} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.72rem', width: 'auto' }}>
                                                {r.active ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Resume</>}
                                            </button>
                                            <button onClick={() => deleteRecurring(r)} className="btn" style={{ padding: '4px 10px', fontSize: '0.72rem', width: 'auto', background: 'rgba(220,38,38,0.08)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.2)' }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create Recurring Invoice Modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>New Recurring Invoice</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreateRecurring}>
                            <div className="form-group">
                                <label className="form-label">Client *</label>
                                <select className="form-input" required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                                    <option value="">Select client</option>
                                    {clients.map(c => <option key={c.id} value={c.id!}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Template Name</label>
                                <input className="form-input" value={form.templateName} onChange={e => setForm({ ...form, templateName: e.target.value })} placeholder="e.g. Monthly Marketing Retainer" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Service Description *</label>
                                <input className="form-input" required value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} placeholder="What's being billed" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Amount *</label>
                                    <input className="form-input" type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Currency</label>
                                    <select className="form-input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                                        <option value="AED">AED</option><option value="USD">USD</option>
                                        <option value="EGP">EGP</option><option value="SAR">SAR</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Frequency</label>
                                    <select className="form-input" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as any })}>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annual">Annual</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Billing Day</label>
                                    <input className="form-input" type="number" min="1" max="28" value={form.billingDay} onChange={e => setForm({ ...form, billingDay: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Accepted Payment Methods</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {([
                                        { value: 'stripe' as const, label: '💳 Card (Stripe)', emoji: '💳' },
                                        { value: 'instapay' as const, label: '📱 InstaPay', emoji: '📱' },
                                        { value: 'bank_transfer' as const, label: '🏦 Bank Transfer', emoji: '🏦' },
                                    ]).map(m => (
                                        <label key={m.value} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem',
                                            border: `2px solid ${form.paymentMethods.includes(m.value) ? 'var(--aw-navy)' : 'var(--card-border)'}`,
                                            background: form.paymentMethods.includes(m.value) ? 'var(--accent-bg)' : 'transparent',
                                        }}>
                                            <input type="checkbox" checked={form.paymentMethods.includes(m.value)} onChange={() => togglePaymentMethod(m.value)} />
                                            {m.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={form.autoSendEmail} onChange={e => setForm({ ...form, autoSendEmail: e.target.checked })} />
                                    <Zap size={14} /> Auto-send invoice email when generated
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)} style={{ width: 'auto' }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}><RefreshCw size={16} /> Create Recurring</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
