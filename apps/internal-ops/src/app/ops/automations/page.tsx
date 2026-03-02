'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Plus, X, Trash2, Play, Pause } from 'lucide-react';

interface Automation { id?: string; name: string; trigger: string; action: string; status: 'active' | 'paused'; lastRun?: string; createdAt?: any; }

export default function AutomationsPage() {
    const [items, setItems] = useState<Automation[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', trigger: '', action: '', status: 'active' as Automation['status'] });

    useEffect(() => { return onSnapshot(collection(db, 'automations'), s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() } as Automation)))); }, []);

    const submit = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, 'automations'), { ...form, createdAt: serverTimestamp() }); setShowForm(false); setForm({ name: '', trigger: '', action: '', status: 'active' }); };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div><h1 className="page-title">Automations</h1><p className="page-sub">{items.length} automation{items.length !== 1 ? 's' : ''}</p></div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Automation</button>
            </div>
            {items.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-icon">⚡</div><div className="empty-title">No Automations</div><p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Set up automations to streamline operations.</p></div></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map(a => (
                        <div key={a.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    {a.status === 'active' ? <Play size={14} style={{ color: 'var(--success)' }} /> : <Pause size={14} style={{ color: 'var(--text-muted)' }} />}
                                    <span style={{ fontWeight: 700 }}>{a.name}</span>
                                    <span className={`status-pill ${a.status === 'active' ? 'status-active' : 'status-pending'}`}>{a.status}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>When: {a.trigger} → Then: {a.action}</div>
                            </div>
                            <button onClick={async () => { if (confirm('Delete?')) await deleteDoc(doc(db, 'automations', a.id!)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={14} /></button>
                        </div>
                    ))}
                </div>
            )}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h2 style={{ fontWeight: 700 }}>Add Automation</h2><button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button></div>
                        <form onSubmit={submit}>
                            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Invoice Reminder" /></div>
                            <div className="form-group"><label className="form-label">Trigger *</label><input className="form-input" required value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} placeholder="e.g. Invoice overdue by 3 days" /></div>
                            <div className="form-group"><label className="form-label">Action *</label><input className="form-input" required value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} placeholder="e.g. Send reminder email via Resend" /></div>
                            <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Automation['status'] })}><option value="active">Active</option><option value="paused">Paused</option></select></div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
