'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    type UserProfile,
    type UserRole,
    ROLE_PERMISSIONS,
    userProfilesService,
    clientsService,
    type Client,
} from '@/lib/firestore';
import { Users, Plus, X, Shield, Edit2, Trash2, Check, Search } from 'lucide-react';

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

export default function TeamPage() {
    const { hasPermission, isOwner } = useAuth();
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<UserProfile | null>(null);
    const [search, setSearch] = useState('');

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

    useEffect(() => {
        const unsub = userProfilesService.subscribe(setProfiles);
        const unsub2 = clientsService.subscribe(setClients);
        return () => { unsub(); unsub2(); };
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

    const filtered = profiles.filter(p =>
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
        await userProfilesService.update(editing.uid, {
            displayName: formData.displayName,
            role: formData.role,
            permissions: ROLE_PERMISSIONS[formData.role],
            title: formData.title || undefined,
            phone: formData.phone || undefined,
            assignedClients: formData.role === 'team' ? formData.assignedClients : undefined,
            linkedClientId: formData.role === 'client' ? formData.linkedClientId : undefined,
        });
        resetForm();
    };

    const handleDelete = async (uid: string) => {
        if (confirm('Remove this team member? They will lose access.')) {
            await userProfilesService.update(uid, { isActive: false });
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

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Team & Access</h1>
                    <p className="page-subtitle">{profiles.length} users · Manage roles and permissions</p>
                </div>
            </div>

            {/* Search */}
            <div className="card" style={{ marginBottom: 24, padding: 16 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map(p => (
                    <div key={p.uid} className="card" style={{ padding: 20, opacity: p.isActive === false ? 0.5 : 1 }}>
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
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.displayName}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                                        {p.email}
                                        {p.title && <span> · {p.title}</span>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <span className="status-pill" style={{
                                    background: `${ROLE_COLORS[p.role]}18`,
                                    color: ROLE_COLORS[p.role],
                                }}>
                                    <Shield size={12} />
                                    {p.role.charAt(0).toUpperCase() + p.role.slice(1)}
                                </span>

                                {p.role === 'team' && p.assignedClients && p.assignedClients.length > 0 && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                        {p.assignedClients.length} client{p.assignedClients.length > 1 ? 's' : ''}
                                    </span>
                                )}

                                {p.role === 'client' && p.linkedClientId && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                        Linked: {clients.find(c => c.id === p.linkedClientId)?.name || p.linkedClientId}
                                    </span>
                                )}

                                {p.isActive === false && (
                                    <span className="status-pill status-overdue">Inactive</span>
                                )}

                                {hasPermission('team:write') && (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => handleEdit(p)} className="btn btn-outline" style={{ padding: '6px 10px', width: 'auto' }}>
                                            <Edit2 size={14} />
                                        </button>
                                        {p.role !== 'owner' && (
                                            <button onClick={() => handleDelete(p.uid)} className="btn" style={{
                                                padding: '6px 10px', width: 'auto',
                                                background: 'rgba(220,38,38,0.08)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.2)'
                                            }}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Last login */}
                        {p.lastLoginAt && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 8 }}>
                                Last active: {new Date(p.lastLoginAt).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

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
        </div>
    );
}
