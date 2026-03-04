'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    platformConnectionsService, clientsService,
    type PlatformConnection, type Client,
} from '@/lib/firestore';
import { Globe, Plus, Edit3, Trash2, X, CheckCircle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const PLATFORMS = [
    {
        id: 'meta_ads', name: 'Meta Ads (Facebook/Instagram)', icon: '📘', color: '#1877F2',
        fields: [{ key: 'adAccountId', label: 'Ad Account ID', placeholder: 'e.g. 565810425828068' }, { key: 'accessToken', label: 'Access Token', placeholder: 'EAA...' }],
        instructions: '1. Go to business.facebook.com → Business Settings\n2. Click "Ad Accounts" in the left menu\n3. Select your ad account → copy the Account ID\n4. For Access Token: Go to developers.facebook.com → Tools → Graph API Explorer\n5. Select your app, generate a token with ads_read permission\n6. Extend it to a long-lived token (60 days) via the token debugger'
    },
    {
        id: 'google_ads', name: 'Google Ads', icon: '🔍', color: '#4285F4',
        fields: [{ key: 'customerId', label: 'Customer ID', placeholder: 'e.g. 123-456-7890' }, { key: 'developerToken', label: 'Developer Token', placeholder: '' }, { key: 'refreshToken', label: 'Refresh Token', placeholder: '' }],
        instructions: '1. Sign in to ads.google.com\n2. Click the gear icon → Account settings → copy Customer ID\n3. For API access: Go to console.cloud.google.com\n4. Enable Google Ads API → Create OAuth credentials\n5. Use the OAuth playground to generate a refresh token'
    },
    {
        id: 'tiktok_ads', name: 'TikTok Ads', icon: '🎵', color: '#000000',
        fields: [{ key: 'advertiserId', label: 'Advertiser ID', placeholder: '' }, { key: 'accessToken', label: 'Access Token', placeholder: '' }],
        instructions: '1. Go to ads.tiktok.com → Account Settings\n2. Copy your Advertiser ID\n3. For API access: Go to ads.tiktok.com/marketing_api → Create an app\n4. Generate an access token with reporting permissions'
    },
    {
        id: 'shopify', name: 'Shopify', icon: '🛍️', color: '#96BF48',
        fields: [{ key: 'shopUrl', label: 'Shop URL', placeholder: 'e.g. mystore.myshopify.com' }, { key: 'accessToken', label: 'Access Token', placeholder: 'shpat_...' }],
        instructions: '1. Go to your Shopify admin → Settings → Apps\n2. Click "Develop apps" → Create an app\n3. Configure Admin API scopes: read_orders, read_products, read_analytics\n4. Install the app → copy the Admin API access token\n5. Your shop URL is yourstore.myshopify.com'
    },
    {
        id: 'woocommerce', name: 'WooCommerce', icon: '🧺', color: '#96588A',
        fields: [
            { key: 'baseUrl', label: 'Store URL', placeholder: 'e.g. https://store.example.com' },
            { key: 'consumerKey', label: 'Consumer Key', placeholder: 'ck_...' },
            { key: 'consumerSecret', label: 'Consumer Secret', placeholder: 'cs_...' },
        ],
        instructions: '1. In WordPress, go to WooCommerce → Settings → Advanced → REST API\n2. Create API key with read access\n3. Copy consumer key/secret\n4. Use your full store URL as base URL'
    },
    {
        id: 'ga4', name: 'Google Analytics 4', icon: '📊', color: '#E37400',
        fields: [{ key: 'propertyId', label: 'Property ID', placeholder: 'e.g. 123456789' }, { key: 'serviceAccountKey', label: 'Service Account JSON', placeholder: '{ "type": "service_account", ... }' }],
        instructions: '1. Go to analytics.google.com → Admin → Property Settings\n2. Copy the Property ID\n3. For API: Go to console.cloud.google.com\n4. Create a Service Account → download the JSON key\n5. Add the service account email as a Viewer in GA4'
    },
];

export default function IntegrationsPage() {
    const { hasPermission } = useAuth();
    const [connections, setConnections] = useState<PlatformConnection[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
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

    useEffect(() => {
        const u1 = platformConnectionsService.subscribe(setConnections);
        clientsService.subscribe(setClients);
        return u1;
    }, []);

    if (!hasPermission('campaigns:read')) {
        return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
    }

    const canWrite = hasPermission('campaigns:write');
    const clientName = (id: string) => clients.find(c => c.id === id)?.name || id;

    const openAdd = () => {
        setForm({
            clientId: '',
            platform: '',
            credentials: {},
            currency: 'USD',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        });
        setEditConn(null);
        setShowAdd(true);
    };
    const openEdit = (conn: PlatformConnection) => {
        setEditConn(conn); setForm({
            clientId: conn.clientId,
            platform: conn.platform,
            credentials: { ...(conn.credentials || {}) },
            currency: conn.currency || 'USD',
            timezone: conn.timezone || (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
        });
        setShowAdd(true);
    };

    const handleSave = async () => {
        if (!form.clientId || !form.platform) return;
        setSaving(true);
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
        } catch (err) { console.error(err); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this integration?')) return;
        await deleteDoc(doc(db, 'platformConnections', id));
    };

    const grouped: Record<string, PlatformConnection[]> = {};
    connections.forEach(c => { if (!grouped[c.clientId]) grouped[c.clientId] = []; grouped[c.clientId].push(c); });
    const selectedPlatform = PLATFORMS.find(p => p.id === form.platform);

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Platform Integrations</h1>
                    <p className="page-subtitle">Connect ad platforms & e-commerce data sources</p>
                </div>
                {canWrite && (
                    <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.84rem' }}>
                        <Plus size={14} /> Connect Platform
                    </button>
                )}
            </div>

            {/* Summary */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi-card"><div className="kpi-label"><Globe size={14} /> Total</div><div className="kpi-value">{connections.length}</div></div>
                <div className="kpi-card"><div className="kpi-label"><CheckCircle size={14} /> Connected</div><div className="kpi-value" style={{ color: 'var(--success)' }}>{connections.filter(c => c.isConnected).length}</div></div>
                <div className="kpi-card"><div className="kpi-label"><XCircle size={14} /> Disconnected</div><div className="kpi-value" style={{ color: 'var(--danger)' }}>{connections.filter(c => !c.isConnected).length}</div></div>
            </div>

            {/* Add/Edit Modal */}
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
                            <select className="form-input" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} disabled={!!editConn}>
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
                                {/* Setup Instructions */}
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

                                {/* Credential Fields */}
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

            {/* Client-grouped Connections */}
            {Object.keys(grouped).length === 0 ? (
                <div className="card"><div className="empty-state" style={{ padding: 48 }}>
                    <div className="empty-state-icon">🔌</div>
                    <div className="empty-state-title">No Integrations Yet</div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Connect your first platform to start tracking campaign data.</p>
                </div></div>
            ) : Object.entries(grouped).map(([clientId, conns]) => (
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
                                                <button onClick={() => handleDelete(conn.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
