'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    clientsService,
    platformConnectionsService,
    type Client,
    type PlatformConnection,
} from '@/lib/firestore';
import {
    Globe,
    Plus,
    Edit3,
    Trash2,
    X,
    CheckCircle,
    XCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Link2,
    RefreshCw,
    BarChart3,
} from 'lucide-react';
import { auth } from '@/lib/firebase';

const PLATFORMS = [
    {
        id: 'meta_ads', name: 'Meta Ads (Facebook/Instagram)', icon: '📘', color: '#1877F2',
        fields: [{ key: 'adAccountId', label: 'Ad Account ID', placeholder: 'e.g. 565810425828068' }, { key: 'accessToken', label: 'Access Token', placeholder: 'EAA...' }],
        instructions: '1. Go to business.facebook.com -> Business Settings\n2. Open Ad Accounts and copy the ad account ID\n3. Generate an access token in Graph API Explorer with ads_read permission\n4. Extend it to a long-lived token before saving it here'
    },
    {
        id: 'google_ads', name: 'Google Ads', icon: '🔍', color: '#4285F4',
        fields: [{ key: 'customerId', label: 'Customer ID', placeholder: 'e.g. 123-456-7890' }, { key: 'developerToken', label: 'Developer Token', placeholder: '' }, { key: 'refreshToken', label: 'Refresh Token', placeholder: '' }],
        instructions: '1. Sign in to ads.google.com and copy the customer ID\n2. In Google Cloud, enable the Google Ads API\n3. Create OAuth credentials and generate a refresh token\n4. Save the customer ID, developer token, and refresh token here'
    },
    {
        id: 'tiktok_ads', name: 'TikTok Ads', icon: '🎵', color: '#000000',
        fields: [{ key: 'advertiserId', label: 'Advertiser ID', placeholder: '' }, { key: 'accessToken', label: 'Access Token', placeholder: '' }],
        instructions: '1. Go to ads.tiktok.com -> Account Settings\n2. Copy your advertiser ID\n3. Create or use a Marketing API app\n4. Generate an access token with reporting permissions'
    },
    {
        id: 'shopify', name: 'Shopify', icon: '🛍️', color: '#96BF48',
        fields: [{ key: 'shopUrl', label: 'Shop URL', placeholder: 'e.g. mystore.myshopify.com' }, { key: 'accessToken', label: 'Access Token', placeholder: 'shpat_...' }],
        instructions: '1. In Shopify admin, open Settings -> Apps -> Develop apps\n2. Create an app and enable read_orders, read_products, and read_analytics scopes\n3. Install the app and copy the Admin API token\n4. Save the shop URL and token here'
    },
    {
        id: 'woocommerce', name: 'WooCommerce', icon: '🧺', color: '#96588A',
        fields: [
            { key: 'baseUrl', label: 'Store URL', placeholder: 'e.g. https://store.example.com' },
            { key: 'consumerKey', label: 'Consumer Key', placeholder: 'ck_...' },
            { key: 'consumerSecret', label: 'Consumer Secret', placeholder: 'cs_...' },
        ],
        instructions: '1. In WordPress, go to WooCommerce -> Settings -> Advanced -> REST API\n2. Create a read-only API key\n3. Copy the consumer key and consumer secret\n4. Save the full storefront URL here as well'
    },
    {
        id: 'ga4', name: 'Google Analytics 4', icon: '📊', color: '#E37400',
        fields: [{ key: 'propertyId', label: 'Property ID', placeholder: 'e.g. 123456789' }, { key: 'serviceAccountKey', label: 'Service Account JSON', placeholder: '{ "type": "service_account", ... }' }],
        instructions: '1. In analytics.google.com, open Admin -> Property Settings and copy the property ID\n2. Create a Google Cloud service account and download the JSON key\n3. Add the service account email as at least a Viewer in GA4\n4. Paste the property ID and service account key here'
    },
];

export default function IntegrationsPage() {
    const { hasPermission, isClient, accessibleClientIds } = useAuth();
    const [connections, setConnections] = useState<PlatformConnection[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editConn, setEditConn] = useState<PlatformConnection | null>(null);
    const [form, setForm] = useState({
        clientId: '',
        platform: '',
        credentials: {} as Record<string, string>,
        currency: 'USD',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
    const [expandedInstructions, setExpandedInstructions] = useState('');
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubClients = isClient
            ? clientsService.subscribeByIds(accessibleClientIds, setClients)
            : clientsService.subscribe(setClients);
        const unsubConnections = isClient
            ? platformConnectionsService.subscribeByClientIds(accessibleClientIds, setConnections)
            : platformConnectionsService.subscribe(setConnections);

        return () => {
            unsubClients();
            unsubConnections();
        };
    }, [isClient, accessibleClientIds]);

    useEffect(() => {
        if (!selectedClientId && clients.length > 0) {
            setSelectedClientId(clients[0].id || '');
        }
    }, [clients, selectedClientId]);

    if (!hasPermission('campaigns:read')) {
        return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
    }

    const canWrite = hasPermission('campaigns:write') || isClient;
    const clientName = (id: string) => clients.find(c => c.id === id)?.name || id;

    const openAdd = () => {
        setForm({
            clientId: selectedClientId || clients[0]?.id || '',
            platform: '',
            credentials: {},
            currency: 'USD',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        });
        setEditConn(null);
        setError('');
        setShowAdd(true);
    };

    const openEdit = (conn: PlatformConnection) => {
        setEditConn(conn);
        setForm({
            clientId: conn.clientId,
            platform: conn.platform,
            credentials: { ...(conn.credentials || {}) },
            currency: conn.currency || 'USD',
            timezone: conn.timezone || (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
        });
        setError('');
        setShowAdd(true);
    };

    const handleSave = async () => {
        if (!form.clientId || !form.platform) return;
        setSaving(true);
        setError('');
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('You must be authenticated to update integrations');
            const resp = await fetch('/api/integrations/upsert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    connectionId: editConn?.id,
                    clientId: form.clientId,
                    platform: form.platform,
                    credentials: form.credentials,
                    timezone: form.timezone,
                    currency: form.currency,
                }),
            });
            const payload = await resp.json();
            if (!resp.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to save integration');
            }
            setShowAdd(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save integration');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this integration?')) return;
        setDeletingId(id);
        setError('');
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('You must be authenticated to remove integrations');
            const resp = await fetch('/api/integrations/upsert', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ connectionId: id }),
            });
            const payload = await resp.json();
            if (!resp.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to remove integration');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove integration');
        } finally {
            setDeletingId('');
        }
    };

    const grouped: Record<string, PlatformConnection[]> = {};
    connections.forEach((connection) => {
        if (!grouped[connection.clientId]) grouped[connection.clientId] = [];
        grouped[connection.clientId].push(connection);
    });

    const selectedPlatform = PLATFORMS.find(p => p.id === form.platform);
    const visibleEntries = Object.entries(grouped).filter(([clientId]) => !selectedClientId || clientId === selectedClientId);
    const selectedClientConnections = selectedClientId ? connections.filter((connection) => connection.clientId === selectedClientId) : [];

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Platform Integrations</h1>
                    <p className="page-subtitle">Connect ad platforms, analytics, and commerce data sources</p>
                </div>
                {canWrite && (
                    <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.84rem' }}>
                        <Plus size={14} /> Connect Platform
                    </button>
                )}
            </div>

            {clients.length > 1 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {clients.map((client) => (
                        <button
                            key={client.id}
                            onClick={() => setSelectedClientId(client.id || '')}
                            style={{
                                borderRadius: 999,
                                border: 'none',
                                padding: '8px 14px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: client.id === selectedClientId ? 'var(--aw-navy)' : 'var(--muted-bg)',
                                color: client.id === selectedClientId ? '#fff' : 'var(--foreground)',
                            }}
                        >
                            {client.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="card" style={{ marginBottom: 18, padding: 20, background: 'linear-gradient(135deg, rgba(0,26,112,0.06), rgba(204,159,83,0.08))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Client connection setup</h2>
                        <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                            Use your Google login, choose the client area you want to manage, then connect Meta, Google Ads, TikTok, GA4, Shopify, or WooCommerce.
                            Once connected, run a sync from the campaigns dashboard and your numbers will start appearing in the dashboard widgets.
                        </p>
                    </div>
                    <div style={{ display: 'grid', gap: 8, minWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}><Link2 size={14} /> 1. Connect the platform</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}><RefreshCw size={14} /> 2. Sync from Campaigns</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}><BarChart3 size={14} /> 3. Review the updated dashboard</div>
                    </div>
                </div>
                {selectedClientId && (
                    <div style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Active client area: <strong style={{ color: 'var(--foreground)' }}>{clientName(selectedClientId)}</strong>
                    </div>
                )}
            </div>

            {error && (
                <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, background: 'rgba(220, 38, 38, 0.08)', color: '#b91c1c', border: '1px solid rgba(220, 38, 38, 0.14)', fontSize: '0.78rem' }}>
                    {error}
                </div>
            )}

            <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi-card"><div className="kpi-label"><Globe size={14} /> Total</div><div className="kpi-value">{connections.length}</div></div>
                <div className="kpi-card"><div className="kpi-label"><CheckCircle size={14} /> Connected</div><div className="kpi-value" style={{ color: 'var(--success)' }}>{connections.filter(c => c.isConnected).length}</div></div>
                <div className="kpi-card"><div className="kpi-label"><XCircle size={14} /> Disconnected</div><div className="kpi-value" style={{ color: 'var(--danger)' }}>{connections.filter(c => !c.isConnected).length}</div></div>
            </div>

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => setShowAdd(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card-bg)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ fontWeight: 700 }}>{editConn ? 'Edit Integration' : 'Connect Platform'}</h3>
                            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label className="form-label">Client</label>
                            <select className="form-input" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} disabled={!!editConn || (isClient && clients.length === 1)}>
                                <option value="">Select client...</option>
                                {clients.map(c => <option key={c.id} value={c.id!}>{c.name}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label className="form-label">Platform</label>
                            <select className="form-input" value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value, credentials: {} }))} disabled={!!editConn}>
                                <option value="">Select platform...</option>
                                {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                            <div>
                                <label className="form-label">Currency</label>
                                <select className="form-input" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                                    <option value="USD">USD</option>
                                    <option value="AED">AED</option>
                                    <option value="EGP">EGP</option>
                                    <option value="SAR">SAR</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Timezone</label>
                                <input
                                    className="form-input"
                                    value={form.timezone}
                                    onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}
                                    placeholder="e.g. Asia/Dubai"
                                />
                            </div>
                        </div>

                        {selectedPlatform && (
                            <>
                                <div style={{ marginBottom: 16, background: 'var(--muted-bg)', borderRadius: 10, overflow: 'hidden' }}>
                                    <button onClick={() => setExpandedInstructions(expandedInstructions === selectedPlatform.id ? '' : selectedPlatform.id)}
                                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--aw-navy)', fontWeight: 600, fontSize: '0.82rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Info size={14} /> How to get credentials</span>
                                        {expandedInstructions === selectedPlatform.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                    {expandedInstructions === selectedPlatform.id && (
                                        <div style={{ padding: '0 14px 14px', fontSize: '0.78rem', color: 'var(--foreground)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                                            {selectedPlatform.instructions}
                                        </div>
                                    )}
                                </div>

                                {selectedPlatform.fields.map(f => (
                                    <div key={f.key} style={{ marginBottom: 12 }}>
                                        <label className="form-label">{f.label}</label>
                                        <input className="form-input" value={form.credentials[f.key] || ''} placeholder={f.placeholder}
                                            onChange={e => setForm(p => ({ ...p, credentials: { ...p.credentials, [f.key]: e.target.value } }))} />
                                    </div>
                                ))}
                            </>
                        )}

                        <button className="btn-primary" onClick={handleSave} disabled={saving || !form.clientId || !form.platform}
                            style={{ width: '100%', padding: '10px', fontSize: '0.88rem', marginTop: 8 }}>
                            {saving ? 'Saving...' : editConn ? 'Update Integration' : 'Connect Platform'}
                        </button>
                    </div>
                </div>
            )}

            {visibleEntries.length === 0 ? (
                <div className="card"><div className="empty-state" style={{ padding: 48 }}>
                    <div className="empty-state-icon">🔌</div>
                    <div className="empty-state-title">No Integrations Yet</div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Connect your first platform to start tracking campaign data.</p>
                </div></div>
            ) : visibleEntries.map(([clientId, conns]) => (
                <div key={clientId} className="card" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {clientName(clientId)}
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 400 }}>{conns.length} connection{conns.length > 1 ? 's' : ''}</span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {conns.map(conn => {
                            const info = PLATFORMS.find(p => p.id === conn.platform);
                            const creds = conn.credentialsMasked || conn.credentials || {};
                            const detail = creds.adAccountId ? `Account: ${creds.adAccountId}` : creds.shopUrl ? `Shop: ${creds.shopUrl}` : creds.customerId ? `ID: ${creds.customerId}` : 'Connected';
                            return (
                                <div key={conn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--muted-bg)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: '1.3rem' }}>{info?.icon || '🔗'}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{info?.name || conn.platform}</div>
                                            <div style={{ fontSize: '0.73rem', color: 'var(--muted)', fontFamily: 'monospace' }}>{detail}</div>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                                                {(conn.timezone || 'UTC')} · {conn.currency || 'USD'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className={`status-pill status-${conn.isConnected ? 'paid' : 'overdue'}`}>{conn.isConnected ? 'Connected' : 'Disconnected'}</span>
                                        {canWrite && (
                                            <>
                                                <button onClick={() => openEdit(conn)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--aw-navy)' }}><Edit3 size={14} /></button>
                                                <button onClick={() => handleDelete(conn.id!)} disabled={deletingId === conn.id} style={{ background: 'none', border: 'none', cursor: deletingId === conn.id ? 'wait' : 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {selectedClientId && selectedClientConnections.length === 0 && (
                <div className="card" style={{ padding: 18 }}>
                    <h3 style={{ marginTop: 0, fontSize: '0.92rem', fontWeight: 700 }}>Recommended first connections</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                        Start with Meta Ads, Google Ads, and GA4 for campaign performance. Add Shopify or WooCommerce if you want sales and revenue tied back to the dashboard.
                    </p>
                </div>
            )}
        </div>
    );
}
