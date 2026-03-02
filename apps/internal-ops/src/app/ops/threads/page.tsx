'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { Plus, X, Trash2 } from 'lucide-react';

interface Thread { id?: string; title: string; client: string; assignee: string; status: 'active' | 'paused' | 'done'; priority: 'low' | 'medium' | 'high'; description?: string; createdAt?: any; }

export default function ThreadsPage() {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', client: '', assignee: '', status: 'active' as Thread['status'], priority: 'medium' as Thread['priority'], description: '' });

    useEffect(() => { return onSnapshot(query(collection(db, 'workingThreads'), orderBy('createdAt', 'desc')), s => setThreads(s.docs.map(d => ({ id: d.id, ...d.data() } as Thread)))); }, []);

    const submit = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, 'workingThreads'), { ...form, createdAt: serverTimestamp() }); setShowForm(false); setForm({ title: '', client: '', assignee: '', status: 'active', priority: 'medium', description: '' }); };

    const priorityColors: Record<string, string> = { high: 'var(--danger)', medium: 'var(--aw-gold)', low: 'var(--success)' };
    const statusClass: Record<string, string> = { active: 'status-active', paused: 'status-pending', done: 'status-done' };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div><h1 className="page-title">Working Threads</h1><p className="page-sub">{threads.length} thread{threads.length !== 1 ? 's' : ''}</p></div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> New Thread</button>
            </div>

            {threads.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No Working Threads</div><p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Create threads to track ongoing work for clients.</p></div></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {threads.map(t => (
                        <div key={t.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColors[t.priority] }} />
                                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{t.title}</span>
                                    <span className={`status-pill ${statusClass[t.status]}`}>{t.status}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.client} · {t.assignee} · {t.priority} priority</div>
                            </div>
                            <button onClick={async () => { if (confirm('Delete?')) await deleteDoc(doc(db, 'workingThreads', t.id!)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Trash2 size={14} /></button>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h2 style={{ fontWeight: 700 }}>New Thread</h2><button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button></div>
                        <form onSubmit={submit}>
                            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group"><label className="form-label">Client</label><input className="form-input" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Assignee</label><input className="form-input" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Thread['status'] })}><option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option></select></div>
                                <div className="form-group"><label className="form-label">Priority</label><select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Thread['priority'] })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
                            </div>
                            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
