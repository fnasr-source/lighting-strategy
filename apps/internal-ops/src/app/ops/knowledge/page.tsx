'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Plus, X, Trash2, ExternalLink } from 'lucide-react';

interface KBItem { id?: string; title: string; category: string; content: string; url?: string; createdAt?: any; }

export default function KnowledgePage() {
    const [items, setItems] = useState<KBItem[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<KBItem | null>(null);
    const [form, setForm] = useState({ title: '', category: 'process', content: '', url: '' });

    useEffect(() => { return onSnapshot(collection(db, 'knowledgeBase'), s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() } as KBItem)))); }, []);

    const submit = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, 'knowledgeBase'), { ...form, createdAt: serverTimestamp() }); setShowForm(false); setForm({ title: '', category: 'process', content: '', url: '' }); };

    const categories = ['process', 'sop', 'playbook', 'reference', 'template'];
    const catColors: Record<string, string> = { process: 'var(--aw-navy)', sop: 'var(--aw-gold)', playbook: 'var(--aw-teal)', reference: 'var(--aw-berry)', template: 'var(--aw-orange)' };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div><h1 className="page-title">Knowledge Base</h1><p className="page-sub">{items.length} article{items.length !== 1 ? 's' : ''}</p></div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Article</button>
            </div>
            {items.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-icon">📖</div><div className="empty-title">Empty Knowledge Base</div><p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Add SOPs, playbooks, and reference docs.</p></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                    {items.map(i => (
                        <div key={i.id} className="card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => setSelected(i)}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', background: (catColors[i.category] || 'var(--aw-navy)') + '22', color: catColors[i.category] || 'var(--aw-navy)', marginBottom: 8 }}>{i.category}</span>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4 }}>{i.title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{i.content}</div>
                        </div>
                    ))}
                </div>
            )}
            {/* Detail modal */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelected(null)}>
                    <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <h2 style={{ fontWeight: 700 }}>{selected.title}</h2>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={async (e) => { e.stopPropagation(); if (confirm('Delete?')) { await deleteDoc(doc(db, 'knowledgeBase', selected.id!)); setSelected(null); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{selected.content}</div>
                        {selected.url && <a href={selected.url} target="_blank" rel="noopener" className="btn btn-outline" style={{ marginTop: 16, fontSize: '0.8rem' }}><ExternalLink size={12} /> View Resource</a>}
                    </div>
                </div>
            )}
            {/* Create modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h2 style={{ fontWeight: 700 }}>Add Article</h2><button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button></div>
                        <form onSubmit={submit}>
                            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div className="form-group"><label className="form-label">Content *</label><textarea className="form-input" rows={6} required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Resource URL</label><input className="form-input" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} /></div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
