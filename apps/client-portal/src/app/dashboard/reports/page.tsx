'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { BarChart3, Plus, X, ExternalLink, Trash2, Calendar } from 'lucide-react';

interface Report {
    id?: string;
    title: string;
    clientId?: string;
    clientName: string;
    period: string;
    type: 'monthly' | 'quarterly' | 'campaign' | 'custom';
    status: 'draft' | 'published';
    summary?: string;
    reportUrl?: string;
    createdAt?: any;
}

export default function ReportsPage() {
    const { isAdmin } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', clientName: '', period: '', type: 'monthly' as Report['type'], status: 'draft' as Report['status'], summary: '', reportUrl: '' });

    useEffect(() => {
        return onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), snap => {
            setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addDoc(collection(db, 'reports'), { ...form, createdAt: serverTimestamp() });
        setShowForm(false);
        setForm({ title: '', clientName: '', period: '', type: 'monthly', status: 'draft', summary: '', reportUrl: '' });
    };

    const statusColors: Record<string, string> = { draft: 'pending', published: 'paid' };

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Reports</h1>
                        <p className="page-subtitle">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
                    </div>
                    {isAdmin && <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> New Report</button>}
                </div>
            </div>

            {reports.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">No Reports Yet</div><p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{isAdmin ? 'Create reports for your clients.' : 'Reports will appear here when published.'}</p></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {reports.map(r => (
                        <div key={r.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{r.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{r.clientName}</div>
                                </div>
                                <span className={`status-pill status-${statusColors[r.status] || 'pending'}`}>{r.status}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />{r.period}</span>
                                <span style={{ textTransform: 'capitalize' }}>{r.type}</span>
                            </div>
                            {r.summary && <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>{r.summary}</p>}
                            <div style={{ display: 'flex', gap: 8 }}>
                                {r.reportUrl && <a href={r.reportUrl} target="_blank" rel="noopener" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }}><ExternalLink size={12} /> View</a>}
                                {isAdmin && <button onClick={async () => { if (confirm('Delete?')) await deleteDoc(doc(db, 'reports', r.id!)); }} className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)', background: 'none' }}><Trash2 size={12} /></button>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>New Report</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. March 2026 Performance Report" /></div>
                            <div className="form-group"><label className="form-label">Client Name *</label><input className="form-input" required value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group"><label className="form-label">Period</label><input className="form-input" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="March 2026" /></div>
                                <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Report['type'] })}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="campaign">Campaign</option><option value="custom">Custom</option></select></div>
                                <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Report['status'] })}><option value="draft">Draft</option><option value="published">Published</option></select></div>
                            </div>
                            <div className="form-group"><label className="form-label">Summary</label><textarea className="form-input" rows={3} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Report URL</label><input className="form-input" value={form.reportUrl} onChange={e => setForm({ ...form, reportUrl: e.target.value })} placeholder="https://..." /></div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Report</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
