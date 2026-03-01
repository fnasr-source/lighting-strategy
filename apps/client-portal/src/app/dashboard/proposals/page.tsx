'use client';

import { useEffect, useState } from 'react';
import { proposalsService, type Proposal } from '@/lib/firestore';
import { FileText, Plus, X, ExternalLink } from 'lucide-react';

export default function ProposalsPage() {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ proposalNumber: '', clientName: '', status: 'draft' as Proposal['status'], sentDate: '', validUntil: '', recommendedOption: '', documentUrl: '', totalValue: '', currency: 'USD', notes: '' });

    useEffect(() => { return proposalsService.subscribe(setProposals); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await proposalsService.create({ ...form, totalValue: parseFloat(form.totalValue) || 0 });
        setShowForm(false);
        setForm({ proposalNumber: '', clientName: '', status: 'draft', sentDate: '', validUntil: '', recommendedOption: '', documentUrl: '', totalValue: '', currency: 'USD', notes: '' });
    };

    const statusColors: Record<string, string> = { draft: 'pending', ready: 'pending', sent: 'active', accepted: 'paid', declined: 'overdue', expired: 'overdue' };

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Proposals</h1>
                        <p className="page-subtitle">{proposals.length} proposal{proposals.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> New Proposal</button>
                </div>
            </div>

            {proposals.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No Proposals</div></div></div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead><tr><th>Number</th><th>Client</th><th>Status</th><th>Sent</th><th>Valid Until</th><th>Actions</th></tr></thead>
                        <tbody>
                            {proposals.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{p.proposalNumber}</td>
                                    <td>{p.clientName}</td>
                                    <td><span className={`status-pill status-${statusColors[p.status] || 'pending'}`}>{p.status}</span></td>
                                    <td>{p.sentDate || '—'}</td>
                                    <td>{p.validUntil || '—'}</td>
                                    <td>
                                        {p.documentUrl && <a href={p.documentUrl} target="_blank" rel="noopener" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }}><ExternalLink size={12} /> View</a>}
                                        <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', marginLeft: 4 }} onClick={async () => { const next = p.status === 'draft' ? 'ready' : p.status === 'ready' ? 'sent' : p.status === 'sent' ? 'accepted' : p.status; if (p.id) await proposalsService.update(p.id, { status: next as Proposal['status'] }); }}>
                                            {p.status === 'draft' ? 'Ready' : p.status === 'ready' ? 'Send' : p.status === 'sent' ? 'Accept' : '✓'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>New Proposal</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label className="form-label">Proposal Number *</label><input className="form-input" required value={form.proposalNumber} onChange={e => setForm({ ...form, proposalNumber: e.target.value })} placeholder="AWP-XX-XXXX-XXX" /></div>
                            <div className="form-group"><label className="form-label">Client Name *</label><input className="form-input" required value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group"><label className="form-label">Total Value</label><input className="form-input" type="number" value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Currency</label><select className="form-input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}><option value="USD">USD</option><option value="AED">AED</option><option value="EGP">EGP</option><option value="SAR">SAR</option></select></div>
                            </div>
                            <div className="form-group"><label className="form-label">Document URL</label><input className="form-input" value={form.documentUrl} onChange={e => setForm({ ...form, documentUrl: e.target.value })} /></div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Proposal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
