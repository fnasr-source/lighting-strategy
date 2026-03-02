'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    platformConnectionsService, clientsService,
    type PlatformConnection, type Client,
} from '@/lib/firestore';
import { Globe, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
    meta_ads: { name: 'Meta Ads', icon: '📘', color: '#1877F2' },
    google_ads: { name: 'Google Ads', icon: '🔍', color: '#4285F4' },
    tiktok_ads: { name: 'TikTok Ads', icon: '🎵', color: '#000000' },
    ga4: { name: 'Google Analytics 4', icon: '📊', color: '#E37400' },
    shopify: { name: 'Shopify', icon: '🛍️', color: '#96BF48' },
    woocommerce: { name: 'WooCommerce', icon: '🛒', color: '#96588A' },
};

export default function IntegrationsPage() {
    const { hasPermission } = useAuth();
    const [connections, setConnections] = useState<PlatformConnection[]>([]);
    const [clients, setClients] = useState<Client[]>([]);

    useEffect(() => {
        const unsub = platformConnectionsService.subscribe(setConnections);
        clientsService.subscribe(setClients);
        return unsub;
    }, []);

    if (!hasPermission('campaigns:read')) {
        return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
    }

    const clientName = (id: string) => clients.find(c => c.id === id)?.name || id;

    // Group connections by client
    const grouped: Record<string, PlatformConnection[]> = {};
    connections.forEach(c => {
        if (!grouped[c.clientId]) grouped[c.clientId] = [];
        grouped[c.clientId].push(c);
    });

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Platform Integrations</h1>
                <p className="page-subtitle">Connected ad platforms and e-commerce data sources</p>
            </div>

            {/* Summary Cards */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi-card">
                    <div className="kpi-label"><Globe size={14} /> Total Connections</div>
                    <div className="kpi-value">{connections.length}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label"><CheckCircle size={14} /> Connected</div>
                    <div className="kpi-value" style={{ color: 'var(--success)' }}>{connections.filter(c => c.isConnected).length}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label"><XCircle size={14} /> Disconnected</div>
                    <div className="kpi-value" style={{ color: 'var(--danger)' }}>{connections.filter(c => !c.isConnected).length}</div>
                </div>
            </div>

            {Object.keys(grouped).length === 0 ? (
                <div className="card"><div className="empty-state" style={{ padding: 48 }}>
                    <div className="empty-state-icon">🔌</div>
                    <div className="empty-state-title">No Integrations Yet</div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Run the data migration to import platform connections.</p>
                </div></div>
            ) : (
                Object.entries(grouped).map(([clientId, conns]) => (
                    <div key={clientId} className="card" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {clientName(clientId)}
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 400 }}>
                                {conns.length} integration{conns.length > 1 ? 's' : ''}
                            </span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {conns.map(conn => {
                                const info = PLATFORM_INFO[conn.platform] || { name: conn.platform, icon: '🔗', color: '#666' };
                                const creds = conn.credentials || {};
                                const detail = creds.adAccountId ? `Account: ${creds.adAccountId}` :
                                    creds.shopUrl ? `Shop: ${creds.shopUrl}` :
                                        creds.customerId ? `Customer: ${creds.customerId}` : 'Connected';
                                return (
                                    <div key={conn.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '14px 16px', borderRadius: 10, border: '1px solid var(--card-border)',
                                        background: 'var(--muted-bg)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ fontSize: '1.3rem' }}>{info.icon}</span>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{info.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'monospace' }}>{detail}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className={`status-pill status-${conn.isConnected ? 'paid' : 'overdue'}`}>
                                                {conn.isConnected ? 'Connected' : 'Disconnected'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
