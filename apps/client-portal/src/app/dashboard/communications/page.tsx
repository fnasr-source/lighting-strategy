'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Send, X } from 'lucide-react';

interface Message {
    id?: string;
    from: string;
    fromName: string;
    to?: string;
    subject: string;
    body: string;
    type: 'update' | 'notification' | 'message';
    read: boolean;
    createdAt?: any;
}

export default function CommunicationsPage() {
    const { user, isAdmin } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [showCompose, setShowCompose] = useState(false);
    const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
    const [form, setForm] = useState({ subject: '', body: '', to: '', type: 'update' as Message['type'] });

    useEffect(() => {
        return onSnapshot(query(collection(db, 'communications'), orderBy('createdAt', 'desc')), snap => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
        });
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        await addDoc(collection(db, 'communications'), {
            from: user?.uid || '',
            fromName: user?.displayName || user?.email || 'Admin',
            to: form.to || 'all',
            subject: form.subject,
            body: form.body,
            type: form.type,
            read: false,
            createdAt: serverTimestamp(),
        });

        // Also send via email if there's a recipient
        if (form.to && form.to.includes('@')) {
            try {
                const token = await user?.getIdToken();
                await fetch('/api/emails/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ to: form.to, subject: form.subject, html: `<p>${form.body.replace(/\n/g, '<br>')}</p>` }),
                });
            } catch (e) { /* email sending is best-effort */ }
        }

        setShowCompose(false);
        setForm({ subject: '', body: '', to: '', type: 'update' });
    };

    const typeIcons: Record<string, string> = { update: '📢', notification: '🔔', message: '💬' };

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Communications</h1>
                        <p className="page-subtitle">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
                    </div>
                    {isAdmin && <button className="btn btn-primary" onClick={() => setShowCompose(true)}><Send size={16} /> Compose</button>}
                </div>
            </div>

            {messages.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">💬</div><div className="empty-state-title">No Messages</div><p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Updates and communications will appear here.</p></div></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {messages.map(msg => (
                        <div key={msg.id} className="card" style={{ padding: 16, cursor: 'pointer', borderLeft: `3px solid ${msg.type === 'update' ? 'var(--aw-navy)' : msg.type === 'notification' ? 'var(--aw-gold)' : 'var(--aw-berry)'}` }} onClick={() => setSelectedMsg(msg)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span>{typeIcons[msg.type] || '📧'}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{msg.subject}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>From {msg.fromName} · {msg.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}</div>
                                    </div>
                                </div>
                                <span className={`status-pill ${msg.read ? '' : 'status-active'}`}>{msg.read ? 'Read' : 'New'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Message detail */}
            {selectedMsg && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelectedMsg(null)}>
                    <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedMsg.subject}</h2>
                            <button onClick={() => setSelectedMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 16 }}>From {selectedMsg.fromName} · {selectedMsg.type}</div>
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedMsg.body}</div>
                    </div>
                </div>
            )}

            {/* Compose */}
            {showCompose && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowCompose(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Compose Message</h2>
                            <button onClick={() => setShowCompose(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSend}>
                            <div className="form-group"><label className="form-label">To (email, optional)</label><input className="form-input" type="email" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} placeholder="client@email.com (also sends via email)" /></div>
                            <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Message['type'] })}><option value="update">Update</option><option value="notification">Notification</option><option value="message">Message</option></select></div>
                            <div className="form-group"><label className="form-label">Subject *</label><input className="form-input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Message *</label><textarea className="form-input" rows={5} required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowCompose(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary"><Send size={14} /> Send</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
