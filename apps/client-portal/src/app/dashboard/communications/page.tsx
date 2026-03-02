'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    clientsService, threadsService, messagesService,
    type Client, type Thread, type Message,
} from '@/lib/firestore';
import { MessageSquare, Send, Plus, X, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function CommunicationsPage() {
    const { user, profile, hasPermission, isClient } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [newThread, setNewThread] = useState({ clientId: '', subject: '', category: 'general' as const, message: '' });
    const msgEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => { clientsService.subscribe(setClients); }, []);

    useEffect(() => {
        if (isClient && profile?.linkedClientId) {
            return threadsService.subscribeByClient(profile.linkedClientId, setThreads);
        }
        return threadsService.subscribe(setThreads);
    }, [isClient, profile]);

    useEffect(() => {
        if (!selectedThread?.id) return;
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
        const msg = newMsg.trim();
        setNewMsg('');
        await messagesService.create({
            threadId: selectedThread.id,
            senderUid: user.uid,
            senderName: profile.displayName || user.email || 'User',
            senderRole: profile.role,
            content: msg,
        });
    };

    const handleNewThread = async () => {
        if (!newThread.subject.trim() || !newThread.message.trim() || !user || !profile) return;
        const clientId = isClient ? profile.linkedClientId! : newThread.clientId;
        const client = clients.find(c => c.id === clientId);
        const threadId = await threadsService.create({
            clientId,
            clientName: client?.name || 'Unknown',
            subject: newThread.subject,
            category: newThread.category,
            priority: 'normal',
            status: 'open',
            createdBy: user.uid,
            createdByName: profile.displayName || user.email || 'User',
        });
        await messagesService.create({
            threadId,
            senderUid: user.uid,
            senderName: profile.displayName || user.email || 'User',
            senderRole: profile.role,
            content: newThread.message,
        });
        setShowNew(false);
        setNewThread({ clientId: '', subject: '', category: 'general', message: '' });
    };

    const statusIcon = (s: string) => {
        if (s === 'open') return <Clock size={12} style={{ color: 'var(--aw-gold)' }} />;
        if (s === 'resolved') return <CheckCircle size={12} style={{ color: 'var(--success)' }} />;
        return <AlertTriangle size={12} style={{ color: 'var(--danger)' }} />;
    };

    const catColor = (c: string) => {
        if (c === 'approval') return '#e67e22';
        if (c === 'billing') return '#9b59b6';
        if (c === 'report') return '#3498db';
        return '#7f8c8d';
    };

    const timeAgo = (ts: any) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const mins = Math.floor((Date.now() - d.getTime()) / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Communications</h1>
                    <p className="page-subtitle">Client messaging & approvals</p>
                </div>
                {hasPermission('communications:write') && (
                    <button className="btn-primary" onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={14} /> New Thread
                    </button>
                )}
            </div>

            {/* New Thread Modal */}
            {showNew && (
                <div className="modal-overlay" onClick={() => setShowNew(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3 style={{ fontWeight: 700 }}>New Thread</h3>
                            <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        {!isClient && (
                            <div style={{ marginBottom: 12 }}>
                                <label className="form-label">Client</label>
                                <select className="form-input" value={newThread.clientId} onChange={e => setNewThread(p => ({ ...p, clientId: e.target.value }))}>
                                    <option value="">Select client...</option>
                                    {clients.map(c => <option key={c.id} value={c.id!}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label">Subject</label>
                            <input className="form-input" value={newThread.subject} onChange={e => setNewThread(p => ({ ...p, subject: e.target.value }))} placeholder="Thread subject..." />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label">Category</label>
                            <select className="form-input" value={newThread.category} onChange={e => setNewThread(p => ({ ...p, category: e.target.value as any }))}>
                                <option value="general">General</option>
                                <option value="approval">Approval Request</option>
                                <option value="report">Report Discussion</option>
                                <option value="billing">Billing</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label className="form-label">Message</label>
                            <textarea className="form-input" rows={3} value={newThread.message} onChange={e => setNewThread(p => ({ ...p, message: e.target.value }))} placeholder="Write your message..." />
                        </div>
                        <button className="btn-primary" onClick={handleNewThread} style={{ width: '100%' }}>Create Thread</button>
                    </div>
                </div>
            )}

            {/* Main Layout: Thread list + message view */}
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, height: 'calc(100vh - 200px)', minHeight: 400 }}>
                {/* Thread List */}
                <div className="card" style={{ overflow: 'auto', padding: 0 }}>
                    {threads.length === 0 ? (
                        <div className="empty-state" style={{ padding: 32 }}>
                            <MessageSquare size={32} />
                            <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>No threads yet</p>
                        </div>
                    ) : threads.map(t => (
                        <div key={t.id} onClick={() => setSelectedThread(t)}
                            style={{
                                padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                                background: selectedThread?.id === t.id ? 'rgba(0,26,112,0.04)' : 'transparent',
                                borderLeft: selectedThread?.id === t.id ? '3px solid var(--aw-navy)' : '3px solid transparent',
                                transition: 'all 0.15s ease',
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {statusIcon(t.status)} {t.subject}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{timeAgo(t.lastMessageAt)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{t.clientName}</span>
                                <span style={{
                                    fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4,
                                    background: `${catColor(t.category)}18`, color: catColor(t.category),
                                    fontWeight: 600, textTransform: 'uppercase',
                                }}>{t.category}</span>
                            </div>
                            {t.lastMessagePreview && (
                                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t.lastMessagePreview}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Message View */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    {!selectedThread ? (
                        <div className="empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <MessageSquare size={40} style={{ color: 'var(--border)' }} />
                            <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: '0.85rem' }}>Select a thread to view messages</p>
                        </div>
                    ) : (
                        <>
                            {/* Thread Header */}
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>{selectedThread.subject}</h3>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                                        {selectedThread.clientName} · {selectedThread.category} · {selectedThread.createdByName}
                                    </span>
                                </div>
                                {hasPermission('communications:write') && selectedThread.status === 'open' && (
                                    <button onClick={() => threadsService.update(selectedThread.id!, { status: 'resolved' })}
                                        style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--success)', color: 'var(--success)', background: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                        ✓ Resolve
                                    </button>
                                )}
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {messages.map(m => {
                                    const isMe = m.senderUid === user?.uid;
                                    const roleColor = m.senderRole === 'client' ? '#e67e22' : 'var(--aw-navy)';
                                    return (
                                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: roleColor }}>
                                                    {m.senderName}
                                                </span>
                                                <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{timeAgo(m.createdAt)}</span>
                                            </div>
                                            <div style={{
                                                maxWidth: '80%', padding: '10px 14px', borderRadius: 10,
                                                background: isMe ? 'var(--aw-navy)' : 'var(--bg)',
                                                color: isMe ? '#fff' : 'var(--text)',
                                                fontSize: '0.85rem', lineHeight: 1.5,
                                                borderBottomRightRadius: isMe ? 2 : 10,
                                                borderBottomLeftRadius: isMe ? 10 : 2,
                                            }}>
                                                {m.approvalAction && (
                                                    <div style={{
                                                        fontSize: '0.7rem', fontWeight: 700, marginBottom: 6, padding: '3px 8px', borderRadius: 4,
                                                        background: m.approvalAction === 'approve' ? 'rgba(46,204,113,0.2)' : m.approvalAction === 'reject' ? 'rgba(231,76,60,0.2)' : 'rgba(241,196,15,0.2)',
                                                        color: m.approvalAction === 'approve' ? '#2ecc71' : m.approvalAction === 'reject' ? '#e74c3c' : '#f1c40f',
                                                        display: 'inline-block',
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
                                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                                    <input
                                        className="form-input"
                                        style={{ flex: 1, margin: 0 }}
                                        value={newMsg}
                                        onChange={e => setNewMsg(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                        placeholder="Type a message..."
                                    />
                                    <button className="btn-primary" onClick={handleSend}
                                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Send size={14} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
