'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Plus, X, Trash2, Copy } from 'lucide-react';

interface Template { id?: string; name: string; type: 'email' | 'proposal' | 'invoice' | 'report'; content: string; createdAt?: any; }

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', type: 'email' as Template['type'], content: '' });

    useEffect(() => { return onSnapshot(collection(db, 'templates'), s => setTemplates(s.docs.map(d => ({ id: d.id, ...d.data() } as Template)))); }, []);

    const submit = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, 'templates'), { ...form, createdAt: serverTimestamp() }); setShowForm(false); setForm({ name: '', type: 'email', content: '' }); };

    const typeIcons: Record<string, string> = { email: '📧', proposal: '📝', invoice: '🧾', report: '📊' };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div><h1 className="page-title">Templates</h1><p className="page-sub">{templates.length} template{templates.length !== 1 ? 's' : ''}</p></div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Template</button>
            </div>
            {templates.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-icon">📄</div><div className="empty-title">No Templates</div><p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Create reusable templates for emails, proposals, and more.</p></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {templates.map(t => (
                        <div key={t.id} className="card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>{typeIcons[t.type]}</span><span style={{ fontWeight: 700 }}>{t.name}</span></div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => navigator.clipboard.writeText(t.content)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Copy size={14} /></button>
                                    <button onClick={async () => { if (confirm('Delete?')) await deleteDoc(doc(db, 'templates', t.id!)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any }}>{t.content}</div>
                        </div>
                    ))}
                </div>
            )}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h2 style={{ fontWeight: 700 }}>Add Template</h2><button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button></div>
                        <form onSubmit={submit}>
                            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Template['type'] })}><option value="email">Email</option><option value="proposal">Proposal</option><option value="invoice">Invoice</option><option value="report">Report</option></select></div>
                            <div className="form-group"><label className="form-label">Content *</label><textarea className="form-input" rows={8} required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
