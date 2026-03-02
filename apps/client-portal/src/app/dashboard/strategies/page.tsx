'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { BookOpen, Plus, X, Upload, ExternalLink, Trash2 } from 'lucide-react';

interface Strategy {
    id?: string;
    title: string;
    clientName: string;
    type: 'playbook' | 'presentation' | 'document' | 'asset';
    description?: string;
    fileUrl?: string;
    status: 'draft' | 'active' | 'archived';
    createdAt?: any;
}

export default function StrategiesPage() {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', clientName: '', type: 'playbook' as Strategy['type'], description: '', fileUrl: '', status: 'active' as Strategy['status'] });

    useEffect(() => {
        return onSnapshot(query(collection(db, 'strategies'), orderBy('createdAt', 'desc')), snap => {
            setStrategies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Strategy)));
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addDoc(collection(db, 'strategies'), { ...form, createdAt: serverTimestamp() });
        setShowForm(false);
        setForm({ title: '', clientName: '', type: 'playbook', description: '', fileUrl: '', status: 'active' });
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this strategy?')) await deleteDoc(doc(db, 'strategies', id));
    };

    const typeColors: Record<string, string> = { playbook: '#001a70', presentation: '#cc9f53', document: '#44756a', asset: '#ea5c2e' };

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Strategies</h1>
                        <p className="page-subtitle">{strategies.length} strategy document{strategies.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add Strategy</button>
                </div>
            </div>

            {strategies.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📘</div><div className="empty-state-title">No Strategies Yet</div><p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Add strategy documents and playbooks for your clients.</p></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {strategies.map(s => (
                        <div key={s.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', background: typeColors[s.type] + '15', color: typeColors[s.type], marginBottom: 6 }}>{s.type}</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>{s.clientName}</div>
                                </div>
                                <button onClick={() => handleDelete(s.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><Trash2 size={14} /></button>
                            </div>
                            {s.description && <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>{s.description}</p>}
                            {s.fileUrl && <a href={s.fileUrl} target="_blank" rel="noopener" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }}><ExternalLink size={12} /> View Document</a>}
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Strategy</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Client Name *</label><input className="form-input" required value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Strategy['type'] })}><option value="playbook">Playbook</option><option value="presentation">Presentation</option><option value="document">Document</option><option value="asset">Asset</option></select></div>
                                <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Strategy['status'] })}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></div>
                            </div>
                            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Document URL</label><input className="form-input" value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." /></div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Strategy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
