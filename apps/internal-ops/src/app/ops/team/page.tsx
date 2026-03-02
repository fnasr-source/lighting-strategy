'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Plus, X, Trash2, Mail } from 'lucide-react';

interface Member { id?: string; name: string; email: string; role: string; department: string; status: 'active' | 'away' | 'inactive'; createdAt?: any; }

export default function TeamPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', role: '', department: '', status: 'active' as Member['status'] });

    useEffect(() => { return onSnapshot(collection(db, 'team'), s => setMembers(s.docs.map(d => ({ id: d.id, ...d.data() } as Member)))); }, []);

    const submit = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, 'team'), { ...form, createdAt: serverTimestamp() }); setShowForm(false); setForm({ name: '', email: '', role: '', department: '', status: 'active' }); };
    const statusClass: Record<string, string> = { active: 'status-active', away: 'status-pending', inactive: 'status-archived' };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div><h1 className="page-title">Team</h1><p className="page-sub">{members.length} member{members.length !== 1 ? 's' : ''}</p></div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Member</button>
            </div>
            {members.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-icon">👥</div><div className="empty-title">No Team Members</div><p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Add your team members to track assignments.</p></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {members.map(m => (
                        <div key={m.id} className="card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div><div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{m.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.role}</div></div>
                                <span className={`status-pill ${statusClass[m.status]}`}>{m.status}</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}><Mail size={12} />{m.email}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.department}</div>
                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={async () => { if (confirm('Remove?')) await deleteDoc(doc(db, 'team', m.id!)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h2 style={{ fontWeight: 700 }}>Add Member</h2><button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button></div>
                        <form onSubmit={submit}>
                            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Department</label><input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">Add</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
