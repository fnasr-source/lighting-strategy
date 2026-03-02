'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Plus, X, Trash2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Campaign { id?: string; name: string; channel: 'email' | 'linkedin' | 'whatsapp'; target: string; status: 'draft' | 'active' | 'completed'; sentCount: number; replyCount: number; createdAt?: any; }

export default function OutreachPage() {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', channel: 'email' as Campaign['channel'], target: '', status: 'draft' as Campaign['status'], sentCount: 0, replyCount: 0 });

    useEffect(() => { return onSnapshot(collection(db, 'outreachCampaigns'), s => setCampaigns(s.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)))); }, []);

    const submit = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, 'outreachCampaigns'), { ...form, createdAt: serverTimestamp() }); setShowForm(false); setForm({ name: '', channel: 'email', target: '', status: 'draft', sentCount: 0, replyCount: 0 }); };

    const channelIcons: Record<string, string> = { email: '📧', linkedin: '💼', whatsapp: '💬' };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div><h1 className="page-title">Outreach</h1><p className="page-sub">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p></div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> New Campaign</button>
            </div>
            {campaigns.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-icon">📨</div><div className="empty-title">No Campaigns</div><p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Create outreach campaigns for lead generation.</p></div></div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Campaign</th><th>Channel</th><th>Target</th><th>Sent</th><th>Replies</th><th>Rate</th><th>Status</th><th></th></tr></thead>
                            <tbody>
                                {campaigns.map(c => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                                        <td>{channelIcons[c.channel]} {c.channel}</td>
                                        <td>{c.target}</td>
                                        <td>{c.sentCount}</td>
                                        <td>{c.replyCount}</td>
                                        <td>{c.sentCount > 0 ? Math.round((c.replyCount / c.sentCount) * 100) : 0}%</td>
                                        <td><span className={`status-pill ${c.status === 'active' ? 'status-active' : c.status === 'completed' ? 'status-done' : 'status-pending'}`}>{c.status}</span></td>
                                        <td><button onClick={async () => { if (confirm('Delete?')) await deleteDoc(doc(db, 'outreachCampaigns', c.id!)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={14} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h2 style={{ fontWeight: 700 }}>New Campaign</h2><button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button></div>
                        <form onSubmit={submit}>
                            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group"><label className="form-label">Channel</label><select className="form-input" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as Campaign['channel'] })}><option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="whatsapp">WhatsApp</option></select></div>
                                <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Campaign['status'] })}><option value="draft">Draft</option><option value="active">Active</option><option value="completed">Completed</option></select></div>
                            </div>
                            <div className="form-group"><label className="form-label">Target Audience</label><input className="form-input" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} placeholder="e.g. Architecture firms in Dubai" /></div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary"><Send size={14} /> Create</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
