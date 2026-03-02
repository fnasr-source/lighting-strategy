'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    clientsService, threadsService, messagesService,
    type Client, type Thread, type Message,
} from '@/lib/firestore';
import { MessageSquare, Send, Plus, X, Clock, CheckCircle, AlertTriangle, Search } from 'lucide-react';

export default function CommunicationsPage() {
    const { user, profile, hasPermission, isClient } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [allThreads, setAllThreads] = useState<Thread[]>([]);
    const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [newThread, setNewThread] = useState({ clientId: '', subject: '', category: 'general' as const, message: '' });
    const [search, setSearch] = useState('');
    const msgEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => { clientsService.subscribe(setClients); }, []);

    useEffect(() => {
        if (isClient && profile?.linkedClientId) {
            return threadsService.subscribeByClient(profile.linkedClientId, setAllThreads);
        }
        return threadsService.subscribe(setAllThreads);
    }, [isClient, profile]);

    useEffect(() => {
        if (!selectedThread?.id) { setMessages([]); return; }
        return messagesService.subscribeByThread(selectedThread.id, m => {
            setMessages(m);
            setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
    }, [selectedThread?.id]);

    if (!hasPermission('communications:read')) {
        return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
    }

    const handleSend = async () => {
        if (!newMsg.trim() || !selectedThread?.id || !user || !profile) return;
        const msg = newMsg.trim(); setNewMsg('');
        await messagesService.create({
            threadId: selectedThread.id, senderUid: user.uid,
            senderName: profile.displayName || user.email || 'User', senderRole: profile.role,
            content: msg,
        });
    };

    const handleNewThread = async () => {
        if (!newThread.subject.trim() || !newThread.message.trim() || !user || !profile) return;
        const clientId = isClient ? profile.linkedClientId! : newThread.clientId;
        const client = clients.find(c => c.id === clientId);
        const threadId = await threadsService.create({
            clientId, clientName: client?.name || 'Unknown', subject: newThread.subject,
            category: newThread.category, priority: 'normal', status: 'open',
            createdBy: user.uid, createdByName: profile.displayName || user.email || 'User',
        });
        await messagesService.create({
            threadId, senderUid: user.uid,
            senderName: profile.displayName || user.email || 'User', senderRole: profile.role,
            content: newThread.message,
        });
        setShowNew(false);
        setNewThread({ clientId: '', subject: '', category: 'general', message: '' });
    };

    const timeAgo = (ts: any) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const mins = Math.floor((Date.now() - d.getTime()) / 60000);
        if (mins < 1) return 'now'; if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`; return `${Math.floor(hrs / 24)}d`;
    };

    const filteredThreads = allThreads.filter(t =>
        !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.clientName.toLowerCase().includes(search.toLowerCase())
    );

    const catStyles: Record<string, { bg: string; color: string }> = {
        approval: { bg: '#e67e2218', color: '#e67e22' },
        billing: { bg: '#9b59b618', color: '#9b59b6' },
        report: { bg: '#3498db18', color: '#3498db' },
        general: { bg: '#7f8c8d18', color: '#7f8c8d' },
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Messages</h1>
                    <p className="page-subtitle">Client communication & approvals</p>
                </div>
                {hasPermission('communications:write') && (
                    <button className="btn-primary" onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.84rem' }}>
                        <Plus size={14} /> New Thread
                    </button>
                )}
            </div>

            {/* New Thread Modal */}
            {showNew && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => setShowNew(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card-bg)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>New Thread</h3>
                            <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
                        </div>
                        {!isClient && (
                            <div style={{ marginBottom: 14 }}>
                                <label className="form-label">Client</label>
                                <select className="form-input" value={newThread.clientId} onChange={e => setNewThread(p => ({ ...p, clientId: e.target.value }))}>
                                    <option value="">Select...</option>
                                    {clients.map(c => <option key={c.id} value={c.id!}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                            <div>
                                <label className="form-label">Subject</label>
                                <input className="form-input" value={newThread.subject} onChange={e => setNewThread(p => ({ ...p, subject: e.target.value }))} placeholder="Thread subject..." />
                            </div>
                            <div>
                                <label className="form-label">Category</label>
                                <select className="form-input" value={newThread.category} onChange={e => setNewThread(p => ({ ...p, category: e.target.value as any }))}>
                                    <option value="general">General</option>
                                    <option value="approval">Approval</option>
                                    <option value="report">Report</option>
                                    <option value="billing">Billing</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: 18 }}>
                            <label className="form-label">Message</label>
                            <textarea className="form-input" rows={3} value={newThread.message} onChange={e => setNewThread(p => ({ ...p, message: e.target.value }))} placeholder="Write your message..." />
                        </div>
                        <button className="btn-primary" onClick={handleNewThread} style={{ width: '100%', padding: '10px', fontSize: '0.88rem' }}>Create Thread</button>
                    </div>
                </div>
            )}

            {/* Main: Thread List + Chat */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedThread ? '320px 1fr' : '1fr', gap: 16, height: 'calc(100vh - 190px)', minHeight: 400 }}>
                {/* Thread List */}
                <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--card-border)' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                            <input className="form-input" style={{ paddingLeft: 32, margin: 0, fontSize: '0.82rem' }}
                                placeholder="Search threads..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {filteredThreads.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: '0.84rem' }}>
                                <MessageSquare size={24} style={{ marginBottom: 8, opacity: 0.3 }} />
                                <p>No threads yet</p>
                            </div>
                        ) : filteredThreads.map(t => {
                            const cs = catStyles[t.category] || catStyles.general;
                            return (
                                <div key={t.id} onClick={() => setSelectedThread(t)} style={{
                                    padding: '12px 14px', cursor: 'pointer',
                                    borderBottom: '1px solid var(--card-border)',
                                    background: selectedThread?.id === t.id ? 'rgba(0,26,112,0.03)' : 'transparent',
                                    borderLeft: selectedThread?.id === t.id ? '3px solid var(--aw-navy)' : '3px solid transparent',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                            {t.status === 'open' ? <Clock size={11} style={{ color: '#f39c12' }} /> :
                                                t.status === 'resolved' ? <CheckCircle size={11} style={{ color: '#27ae60' }} /> :
                                                    <AlertTriangle size={11} style={{ color: '#e74c3c' }} />}
                                            {t.subject}
                                        </span>
                                        <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>{timeAgo(t.lastMessageAt)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{t.clientName}</span>
                                        <span style={{ fontSize: '0.58rem', padding: '2px 6px', borderRadius: 4, background: cs.bg, color: cs.color, fontWeight: 600, textTransform: 'uppercase' }}>{t.category}</span>
                                    </div>
                                    {t.lastMessagePreview && (
                                        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {t.lastMessagePreview}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Chat View */}
                {selectedThread && (
                    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Thread Header */}
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>{selectedThread.subject}</h3>
                                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                                    {selectedThread.clientName} · {selectedThread.category} · {selectedThread.createdByName}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {selectedThread.status === 'open' && hasPermission('communications:write') && (
                                    <button onClick={() => threadsService.update(selectedThread.id!, { status: 'resolved' })}
                                        style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--success)', color: 'var(--success)', background: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                        ✓ Resolve
                                    </button>
                                )}
                                <button onClick={() => setSelectedThread(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {messages.length === 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.84rem', padding: 24 }}>No messages yet</p>
                            )}
                            {messages.map(m => {
                                const isMe = m.senderUid === user?.uid;
                                const isInternal = m.senderRole !== 'client';
                                return (
                                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isInternal ? 'var(--aw-navy)' : '#e67e22' }}>{m.senderName}</span>
                                            <span style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>{timeAgo(m.createdAt)}</span>
                                        </div>
                                        <div style={{
                                            padding: '10px 14px', borderRadius: 12, fontSize: '0.85rem', lineHeight: 1.5,
                                            background: isMe ? 'var(--aw-navy)' : 'var(--muted-bg)',
                                            color: isMe ? '#fff' : 'var(--foreground)',
                                            borderBottomRightRadius: isMe ? 2 : 12, borderBottomLeftRadius: isMe ? 12 : 2,
                                        }}>
                                            {m.approvalAction && (
                                                <div style={{
                                                    fontSize: '0.68rem', fontWeight: 700, marginBottom: 6, padding: '3px 8px', borderRadius: 4, display: 'inline-block',
                                                    background: m.approvalAction === 'approve' ? 'rgba(46,204,113,0.2)' : m.approvalAction === 'reject' ? 'rgba(231,76,60,0.2)' : 'rgba(241,196,15,0.2)',
                                                    color: m.approvalAction === 'approve' ? '#2ecc71' : m.approvalAction === 'reject' ? '#e74c3c' : '#f1c40f',
                                                }}>
                                                    {m.approvalAction === 'approve' ? '✓ APPROVED' : m.approvalAction === 'reject' ? '✗ REJECTED' : '⏳ APPROVAL REQUESTED'}
                                                </div>
                                            )}
                                            {m.content}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={msgEndRef} />
                        </div>

                        {/* Compose */}
                        {hasPermission('communications:write') && selectedThread.status !== 'resolved' && (
                            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: 8 }}>
                                <input className="form-input" style={{ flex: 1, margin: 0 }}
                                    value={newMsg} onChange={e => setNewMsg(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder="Type a message..." />
                                <button className="btn-primary" onClick={handleSend} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center' }}>
                                    <Send size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
