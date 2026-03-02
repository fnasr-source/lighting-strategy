'use client';

import { useEffect, useState } from 'react';
import { invoicesService, clientsService, type Invoice, type Client } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, X, ExternalLink, Copy } from 'lucide-react';
import Link from 'next/link';

export default function InvoicesPage() {
    const { isAdmin } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [copied, setCopied] = useState('');
    const [form, setForm] = useState({ invoiceNumber: '', clientId: '', clientName: '', service: '', amount: '', currency: 'AED', dueDate: '', notes: '' });

    useEffect(() => {
        const u1 = invoicesService.subscribe(setInvoices);
        const u2 = clientsService.subscribe(setClients);
        return () => { u1(); u2(); };
    }, []);

    const filtered = invoices.filter(i =>
        i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        i.clientName.toLowerCase().includes(search.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(form.amount) || 0;
        const client = clients.find(c => c.id === form.clientId);
        await invoicesService.create({
            invoiceNumber: form.invoiceNumber || `AWI-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(invoices.length + 1).padStart(3, '0')}`,
            clientId: form.clientId,
            clientName: client?.name || form.clientName,
            lineItems: [{ description: form.service, qty: 1, rate: amt, amount: amt }],
            subtotal: amt,
            tax: 0,
            totalDue: amt,
            currency: form.currency,
            status: 'pending',
            issuedAt: new Date().toISOString().slice(0, 10),
            dueDate: form.dueDate,
            notes: form.notes,
        });
        setShowForm(false);
        setForm({ invoiceNumber: '', clientId: '', clientName: '', service: '', amount: '', currency: 'AED', dueDate: '', notes: '' });
    };

    const markPaid = async (inv: Invoice) => {
        if (inv.id) await invoicesService.update(inv.id, { status: 'paid', paidAt: new Date().toISOString() });
    };

    const copyLink = (inv: Invoice) => {
        const url = `${window.location.origin}/invoice/${inv.id}`;
        navigator.clipboard.writeText(url);
        setCopied(inv.id || '');
        setTimeout(() => setCopied(''), 2000);
    };

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Invoices</h1>
                        <p className="page-subtitle">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
                    </div>
                    {isAdmin && <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> New Invoice</button>}
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ position: 'relative', maxWidth: 400 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input type="text" className="form-input" placeholder="Search invoices..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">🧾</div><div className="empty-state-title">No Invoices</div></div></div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Invoice</th><th>Client</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(inv => (
                                <tr key={inv.id}>
                                    <td style={{ fontWeight: 600 }}>
                                        <Link href={`/invoice/${inv.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                            {inv.invoiceNumber}
                                        </Link>
                                    </td>
                                    <td>{inv.clientName}</td>
                                    <td style={{ fontWeight: 600 }}>{inv.totalDue?.toLocaleString()} {inv.currency}</td>
                                    <td>{inv.dueDate}</td>
                                    <td><span className={`status-pill status-${inv.status}`}>{inv.status}</span></td>
                                    <td style={{ display: 'flex', gap: 8 }}>
                                        <Link href={`/invoice/${inv.id}`} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                                            <ExternalLink size={12} /> View
                                        </Link>
                                        <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => copyLink(inv)}>
                                            <Copy size={12} /> {copied === inv.id ? 'Copied!' : 'Copy Link'}
                                        </button>
                                        {isAdmin && inv.status === 'pending' && <button className="btn btn-gold" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => markPaid(inv)}>Mark Paid</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>New Invoice</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Client *</label>
                                <select className="form-input" required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                                    <option value="">Select client</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Service Description</label>
                                <input className="form-input" value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} placeholder="e.g. Full Marketing Retainer" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Amount *</label>
                                    <input className="form-input" type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Currency</label>
                                    <select className="form-input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                                        <option value="AED">AED</option><option value="USD">USD</option><option value="EGP">EGP</option><option value="SAR">SAR</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Due Date</label>
                                <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" />
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '8px 0 16px' }}>
                                💡 A shareable payment link will be automatically generated. No need for external Stripe links.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
