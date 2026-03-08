'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    type UserProfile,
    type UserRole,
    type ActivityLog,
    type PendingInvite,
    ROLE_PERMISSIONS,
    userProfilesService,
    clientsService,
    activityLogsService,
    pendingInvitesService,
    type Client,
} from '@/lib/firestore';
import { Users, Plus, X, Shield, Edit2, Trash2, Check, Search, Mail, Clock, Activity, UserPlus, Filter } from 'lucide-react';

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
    { value: 'owner', label: 'Owner', description: 'Full access to everything including billing' },
    { value: 'admin', label: 'Admin', description: 'Full access except billing settings' },
    { value: 'team', label: 'Team', description: 'Access to assigned clients only' },
    { value: 'client', label: 'Client', description: 'Can only view their own data' },
];

const ROLE_COLORS: Record<UserRole, string> = {
    owner: '#cc9f53',
    admin: '#001a70',
    team: '#44756a',
    client: '#6b7280',
};

type TabId = 'internal' | 'clients' | 'invites' | 'activity';

export default function TeamPage() {
    const { hasPermission, isOwner, user, profile } = useAuth();
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [editing, setEditing] = useState<UserProfile | null>(null);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TabId>('internal');
    const [inviteSending, setInviteSending] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        displayName: '',
        role: 'team' as UserRole,
        title: '',
        phone: '',
        assignedClients: [] as string[],
        linkedClientId: '',
    });

    // Invite form state
    const [inviteData, setInviteData] = useState({
        email: '',
        role: 'team' as UserRole,
        linkedClientId: '',
    });

    useEffect(() => {
        const unsub = userProfilesService.subscribe(setProfiles);
        const unsub2 = clientsService.subscribe(setClients);
        const unsub3 = activityLogsService.subscribe(setActivityLogs);
        const unsub4 = pendingInvitesService.subscribe(setPendingInvites);
        return () => { unsub(); unsub2(); unsub3(); unsub4(); };
    }, []);

    if (!hasPermission('team:read')) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔒</div>
                <div className="empty-state-title">Access Denied</div>
                <p style={{ color: 'var(--muted)' }}>You don't have permission to view this page.</p>
            </div>
        );
    }

    const internalProfiles = profiles.filter(p => ['owner', 'admin', 'team'].includes(p.role));
    const clientProfiles = profiles.filter(p => p.role === 'client');

    const currentList = activeTab === 'internal' ? internalProfiles : clientProfiles;
    const filtered = currentList.filter(p =>
        p.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.role?.toLowerCase().includes(search.toLowerCase())
    );

    const resetForm = () => {
        setFormData({ email: '', displayName: '', role: 'team', title: '', phone: '', assignedClients: [], linkedClientId: '' });
        setEditing(null);
        setShowForm(false);
    };

    const handleEdit = (p: UserProfile) => {
        setFormData({
            email: p.email,
            displayName: p.displayName,
            role: p.role,
            title: p.title || '',
            phone: p.phone || '',
            assignedClients: p.assignedClients || [],
            linkedClientId: p.linkedClientId || '',
        });
        setEditing(p);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!editing?.uid) return;
        const prevRole = editing.role;
        await userProfilesService.update(editing.uid, {
            displayName: formData.displayName,
            role: formData.role,
            permissions: ROLE_PERMISSIONS[formData.role],
            title: formData.title || undefined,
            phone: formData.phone || undefined,
            assignedClients: formData.role === 'team' ? formData.assignedClients : undefined,
            linkedClientId: formData.role === 'client' ? formData.linkedClientId : undefined,
        });

        // Log the action
        if (user && profile) {
            const action = prevRole !== formData.role ? 'role_changed' as const : 'user_updated' as const;
            activityLogsService.create({
                userId: user.uid,
                userEmail: user.email || '',
                userName: profile.displayName || user.email || '',
                action,
                target: editing.email,
                details: prevRole !== formData.role
                    ? `Changed role from ${prevRole} to ${formData.role}`
                    : `Updated user profile for ${editing.email}`,
            }).catch(() => { });
        }
        resetForm();
    };

    const handleDelete = async (uid: string, email: string) => {
        if (confirm('Remove this user? They will lose access.')) {
            await userProfilesService.update(uid, { isActive: false });
            if (user && profile) {
                activityLogsService.create({
                    userId: user.uid,
                    userEmail: user.email || '',
                    userName: profile.displayName || user.email || '',
                    action: 'user_deleted',
                    target: email,
                    details: `Deactivated user ${email}`,
                }).catch(() => { });
            }
        }
    };

    const handleReactivate = async (uid: string) => {
        await userProfilesService.update(uid, { isActive: true });
    };

    const handleSendInvite = async () => {
        if (!inviteData.email || !user || !profile) return;
        setInviteSending(true);
        try {
            await pendingInvitesService.create({
                email: inviteData.email.trim().toLowerCase(),
                role: inviteData.role,
                linkedClientId: inviteData.role === 'client' ? inviteData.linkedClientId : undefined,
                invitedBy: user.uid,
                invitedByName: profile.displayName || user.email || '',
                status: 'pending',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });

            activityLogsService.create({
                userId: user.uid,
                userEmail: user.email || '',
                userName: profile.displayName || user.email || '',
                action: 'invite_sent',
                target: inviteData.email,
                details: `Invited ${inviteData.email} as ${inviteData.role}`,
            }).catch(() => { });

            setInviteData({ email: '', role: 'team', linkedClientId: '' });
            setShowInviteForm(false);
        } finally {
            setInviteSending(false);
        }
    };

    const toggleClient = (clientId: string) => {
        setFormData(prev => ({
            ...prev,
            assignedClients: prev.assignedClients.includes(clientId)
                ? prev.assignedClients.filter(id => id !== clientId)
                : [...prev.assignedClients, clientId],
        }));
    };

    const tabs: { id: TabId; label: string; count: number; icon: React.ReactNode }[] = [
        { id: 'internal', label: 'Internal Team', count: internalProfiles.length, icon: <Shield size={14} /> },
        { id: 'clients', label: 'Client Users', count: clientProfiles.length, icon: <Users size={14} /> },
        { id: 'invites', label: 'Pending Invites', count: pendingInvites.filter(i => i.status === 'pending').length, icon: <Mail size={14} /> },
        { id: 'activity', label: 'Activity Log', count: activityLogs.length, icon: <Activity size={14} /> },
    ];

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Team & Access Management</h1>
                    <p className="page-subtitle">{profiles.length} users · {pendingInvites.filter(i => i.status === 'pending').length} pending invites</p>
                </div>
                {hasPermission('team:write') && (
                    <button className="btn btn-primary" onClick={() => setShowInviteForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserPlus size={16} /> Invite User
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--card-border)', paddingBottom: 0 }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '10px 16px', fontSize: '0.85rem', fontWeight: 600,
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: activeTab === tab.id ? 'var(--aw-navy)' : 'var(--muted)',
                            borderBottom: activeTab === tab.id ? '2px solid var(--aw-navy)' : '2px solid transparent',
                            marginBottom: -2,
                            transition: 'color 0.15s, border-color 0.15s',
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                        <span style={{
                            fontSize: '0.7rem', padding: '2px 6px', borderRadius: 10,
                            background: activeTab === tab.id ? 'var(--aw-navy)' : 'var(--muted-bg)',
                            color: activeTab === tab.id ? '#fff' : 'var(--muted)',
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* User tabs: internal / clients */}
            {(activeTab === 'internal' || activeTab === 'clients') && (
                <>
                    {/* Search */}
                    <div className="card" style={{ marginBottom: 16, padding: 14 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or role..."
                                className="form-input"
                                style={{ paddingLeft: 36 }}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* User list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.length === 0 ? (
                            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                                    {search ? 'No users match your search.' : `No ${activeTab === 'internal' ? 'internal team members' : 'client users'} found.`}
                                </p>
                            </div>
                        ) : filtered.map(p => (
                            <div key={p.uid} className="card" style={{ padding: 18, opacity: p.isActive === false ? 0.5 : 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, minWidth: 200 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '50%',
                                            background: ROLE_COLORS[p.role] || '#999',
                                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                                        }}>
                                            {p.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{p.displayName}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                                {p.email}
                                                {p.title && <span> · {p.title}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span className="status-pill" style={{
                                            background: `${ROLE_COLORS[p.role]}18`,
                                            color: ROLE_COLORS[p.role],
                                            display: 'flex', alignItems: 'center', gap: 4,
                                        }}>
                                            <Shield size={12} />
                                            {p.role.charAt(0).toUpperCase() + p.role.slice(1)}
                                        </span>

                                        {p.isActive === false && (
                                            <span className="status-pill status-overdue" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Inactive</span>
                                        )}

                                        {p.role === 'team' && p.assignedClients && p.assignedClients.length > 0 && (
                                            <span style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>
                                                {p.assignedClients.length} client{p.assignedClients.length > 1 ? 's' : ''}
                                            </span>
                                        )}

                                        {p.role === 'client' && p.linkedClientId && (
                                            <span style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>
                                                → {clients.find(c => c.id === p.linkedClientId)?.name || 'Unlinked'}
                                            </span>
                                        )}

                                        {hasPermission('team:write') && (
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button onClick={() => handleEdit(p)} className="btn btn-outline" style={{ padding: '5px 8px', width: 'auto' }}>
                                                    <Edit2 size={13} />
                                                </button>
                                                {p.isActive === false ? (
                                                    <button onClick={() => handleReactivate(p.uid)} className="btn btn-outline" style={{ padding: '5px 8px', width: 'auto', color: '#16a34a', borderColor: '#16a34a40' }}>
                                                        <Check size={13} />
                                                    </button>
                                                ) : p.role !== 'owner' && (
                                                    <button onClick={() => handleDelete(p.uid, p.email)} className="btn" style={{
                                                        padding: '5px 8px', width: 'auto',
                                                        background: 'rgba(220,38,38,0.08)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.2)'
                                                    }}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {p.lastLoginAt && (
                                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={10} />
                                        Last active: {new Date(p.lastLoginAt).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Pending Invites Tab */}
            {activeTab === 'invites' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pendingInvites.length === 0 ? (
                        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                            <Mail size={24} style={{ color: 'var(--muted)', marginBottom: 12 }} />
                            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No pending invites.</p>
                        </div>
                    ) : pendingInvites.map(invite => (
                        <div key={invite.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{invite.email}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                    Invited as {invite.role} by {invite.invitedByName}
                                    {invite.createdAt && <> · {new Date(invite.createdAt?.seconds ? invite.createdAt.seconds * 1000 : invite.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className={`status-pill ${invite.status === 'pending' ? 'status-pending' : invite.status === 'accepted' ? 'status-paid' : 'status-overdue'}`}>
                                    {invite.status}
                                </span>
                                {invite.status === 'pending' && hasPermission('team:write') && (
                                    <button
                                        onClick={() => invite.id && pendingInvitesService.delete(invite.id)}
                                        className="btn"
                                        style={{ padding: '4px 8px', width: 'auto', background: 'rgba(220,38,38,0.08)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.2)' }}
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Activity Log Tab */}
            {activeTab === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activityLogs.length === 0 ? (
                        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                            <Activity size={24} style={{ color: 'var(--muted)', marginBottom: 12 }} />
                            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No activity recorded yet.</p>
                        </div>
                    ) : activityLogs.map(log => (
                        <div key={log.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'var(--muted-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                {log.action === 'invite_sent' ? <Mail size={14} /> :
                                    log.action === 'user_deleted' ? <Trash2 size={14} style={{ color: '#dc2626' }} /> :
                                        log.action === 'role_changed' ? <Shield size={14} style={{ color: '#cc9f53' }} /> :
                                            <Edit2 size={14} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <strong>{log.userName}</strong> {log.details}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>
                                    {log.createdAt && new Date(log.createdAt?.seconds ? log.createdAt.seconds * 1000 : log.createdAt).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {showForm && editing && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20,
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', padding: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Edit User</h2>
                            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Display Name</label>
                            <input className="form-input" value={formData.displayName}
                                onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input className="form-input" placeholder="e.g. Growth Strategist"
                                value={formData.title}
                                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} />
                        </div>

                        {isOwner && (
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {ROLE_OPTIONS.map(opt => (
                                        <label key={opt.value} style={{
                                            display: 'flex', alignItems: 'flex-start', gap: 10,
                                            padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                                            border: `2px solid ${formData.role === opt.value ? ROLE_COLORS[opt.value] : 'var(--card-border)'}`,
                                            background: formData.role === opt.value ? `${ROLE_COLORS[opt.value]}08` : 'transparent',
                                        }}>
                                            <input type="radio" name="role" value={opt.value}
                                                checked={formData.role === opt.value}
                                                onChange={() => setFormData(prev => ({ ...prev, role: opt.value }))}
                                                style={{ marginTop: 2 }} />
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{opt.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{opt.description}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Assign clients for team role */}
                        {formData.role === 'team' && (
                            <div className="form-group">
                                <label className="form-label">Assigned Clients</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {clients.map(c => (
                                        <label key={c.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 10px', borderRadius: 6,
                                            background: formData.assignedClients.includes(c.id!) ? 'var(--accent-bg)' : 'transparent',
                                            cursor: 'pointer',
                                        }}>
                                            <input type="checkbox"
                                                checked={formData.assignedClients.includes(c.id!)}
                                                onChange={() => toggleClient(c.id!)} />
                                            <span style={{ fontSize: '0.85rem' }}>{c.name}</span>
                                            {c.company && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>— {c.company}</span>}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Link client for client role */}
                        {formData.role === 'client' && (
                            <div className="form-group">
                                <label className="form-label">Linked Client Account</label>
                                <select className="form-input" value={formData.linkedClientId}
                                    onChange={e => setFormData(prev => ({ ...prev, linkedClientId: e.target.value }))}>
                                    <option value="">Select client...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
                                <Check size={16} /> Save Changes
                            </button>
                            <button className="btn btn-outline" onClick={resetForm} style={{ flex: 0 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showInviteForm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20,
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: 460, padding: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <UserPlus size={18} /> Invite User
                            </h2>
                            <button onClick={() => setShowInviteForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                className="form-input"
                                type="email"
                                placeholder="user@example.com"
                                value={inviteData.email}
                                onChange={e => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select
                                className="form-input"
                                value={inviteData.role}
                                onChange={e => setInviteData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                            >
                                {ROLE_OPTIONS.filter(o => isOwner || o.value !== 'owner').map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</option>
                                ))}
                            </select>
                        </div>

                        {inviteData.role === 'client' && (
                            <div className="form-group">
                                <label className="form-label">Link to Client</label>
                                <select
                                    className="form-input"
                                    value={inviteData.linkedClientId}
                                    onChange={e => setInviteData(prev => ({ ...prev, linkedClientId: e.target.value }))}
                                >
                                    <option value="">Select client…</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleSendInvite}
                                disabled={!inviteData.email || inviteSending}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                <Mail size={16} />
                                {inviteSending ? 'Sending…' : 'Send Invite'}
                            </button>
                            <button className="btn btn-outline" onClick={() => setShowInviteForm(false)} style={{ flex: 0 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
