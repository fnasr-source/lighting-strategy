'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    clientsService, monthlyRollupsService, monthlyMetricsService, platformConnectionsService,
    type Client, type MonthlyClientRollup, type MonthlyPlatformMetric, type PlatformConnection,
} from '@/lib/firestore';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Eye, Globe, Link2 } from 'lucide-react';

const PLATFORM_LABELS: Record<string, string> = {
    meta_ads: '📘 Meta Ads', google_ads: '🔍 Google Ads', tiktok_ads: '🎵 TikTok Ads',
    shopify: '🛍️ Shopify', ga4: '📊 GA4', woocommerce: '🛒 Woo',
};

export default function CampaignsPage() {
    const { hasPermission, isClient, profile } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [allRollups, setAllRollups] = useState<MonthlyClientRollup[]>([]);
    const [allMetrics, setAllMetrics] = useState<MonthlyPlatformMetric[]>([]);
    const [allConnections, setAllConnections] = useState<PlatformConnection[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Load ALL data once via real-time subscriptions
    useEffect(() => {
        const unsubs = [
            clientsService.subscribe(c => { setClients(c); }),
            monthlyRollupsService.subscribe(r => { setAllRollups(r); setDataLoaded(true); }),
            monthlyMetricsService.subscribe(setAllMetrics),
            platformConnectionsService.subscribe(setAllConnections),
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    // Auto-select: client users get their linked client, admins get the first client
    useEffect(() => {
        if (selectedClient) return;
        if (isClient && profile?.linkedClientId) {
            setSelectedClient(profile.linkedClientId);
        } else if (clients.length > 0) {
            const active = clients.find(c => c.status === 'active');
            setSelectedClient(active?.id || clients[0].id!);
        }
    }, [isClient, profile, clients, selectedClient]);

    // Filter data for selected client (client-side)
    const rollups = useMemo(() =>
        allRollups.filter(r => r.clientId === selectedClient && r.platformType === 'combined')
            .sort((a, b) => a.monthEndDate.localeCompare(b.monthEndDate)),
        [allRollups, selectedClient]);
    const metrics = useMemo(() =>
        allMetrics.filter(m => m.clientId === selectedClient)
            .sort((a, b) => b.monthEndDate.localeCompare(a.monthEndDate)),
        [allMetrics, selectedClient]);
    const connections = useMemo(() =>
        allConnections.filter(c => c.clientId === selectedClient),
        [allConnections, selectedClient]);

    if (!hasPermission('campaigns:read')) {
        return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
    }

    const fmtK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);
    const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const fmtMonth = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const latest = rollups.length > 0 ? rollups[rollups.length - 1] : null;
    const prev = rollups.length > 1 ? rollups[rollups.length - 2] : null;
    const pctChange = (curr: number, prev: number) => prev ? ((curr - prev) / prev * 100).toFixed(1) : null;
    const maxRevenue = Math.max(...rollups.map(r => r.revenue), 1);
    const adMetrics = metrics.filter(m => m.platformType === 'ad');
    const ecomMetrics = metrics.filter(m => m.platformType === 'ecommerce');
    const selectedName = clients.find(c => c.id === selectedClient)?.name || '';

    return (
        <div>
            {/* Header with Client Tabs */}
            <div className="page-header" style={{ marginBottom: 0 }}>
                <h1 className="page-title">Campaign Performance</h1>
                <p className="page-subtitle">Real-time metrics across all connected platforms</p>
            </div>

            {/* Client tabs */}
            {!isClient && clients.length > 0 && (() => {
                const activeClients = clients.filter(c => c.status === 'active');
                return activeClients.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, padding: '16px 0 20px', overflowX: 'auto', flexWrap: 'wrap' }}>
                        {activeClients.map(c => (
                            <button key={c.id} onClick={() => setSelectedClient(c.id!)} style={{
                                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                fontSize: '0.84rem', fontWeight: selectedClient === c.id ? 700 : 500,
                                background: selectedClient === c.id ? 'var(--aw-navy)' : 'var(--muted-bg)',
                                color: selectedClient === c.id ? '#fff' : 'var(--muted)',
                                transition: 'all 0.15s ease',
                            }}>
                                {c.name}
                            </button>
                        ))}
                    </div>
                ) : null;
            })()}

            {!dataLoaded ? (
                <div className="card"><div className="empty-state" style={{ padding: 48 }}>
                    <div className="loading-spinner" />
                    <p style={{ color: 'var(--muted)', marginTop: 12, fontSize: '0.85rem' }}>Loading performance data...</p>
                </div></div>
            ) : (
                <>
                    {/* Connected Platforms Strip */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                            <Globe size={12} style={{ verticalAlign: 'middle' }} /> Platforms:
                        </span>
                        {connections.length === 0 ? (
                            <span style={{
                                fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6,
                                background: 'rgba(231,76,60,0.08)', color: '#e74c3c',
                            }}>
                                No platforms connected — <a href="/dashboard/integrations" style={{ color: '#e74c3c', fontWeight: 600 }}>Connect now →</a>
                            </span>
                        ) : connections.map(c => (
                            <span key={c.id} style={{
                                fontSize: '0.72rem', padding: '4px 10px', borderRadius: 6,
                                background: c.isConnected ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)',
                                color: c.isConnected ? '#27ae60' : '#e74c3c', fontWeight: 500,
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                                {PLATFORM_LABELS[c.platform] || c.platform}
                                {c.isConnected ? '✓' : '✗'}
                            </span>
                        ))}
                    </div>

                    {rollups.length === 0 ? (
                        <div className="card"><div className="empty-state" style={{ padding: 48 }}>
                            <div className="empty-state-icon">📭</div>
                            <div className="empty-state-title">No Performance Data</div>
                            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', maxWidth: 380, lineHeight: 1.6 }}>
                                {connections.length === 0
                                    ? `${selectedName} has no connected platforms. Go to Integrations to connect ad accounts and e-commerce platforms.`
                                    : `Platforms are connected but no monthly data has been synced yet. Data syncs automatically when the page loads.`
                                }
                            </p>
                        </div></div>
                    ) : (
                        <>
                            {/* KPI Cards */}
                            {latest && (
                                <div className="kpi-grid">
                                    <KPICard icon={<DollarSign size={14} />} label="Revenue"
                                        value={`${fmtK(latest.revenue)} EGP`} change={prev ? pctChange(latest.revenue, prev.revenue) : null} />
                                    <KPICard icon={<TrendingUp size={14} />} label="ROAS"
                                        value={`${latest.roas.toFixed(1)}x`} change={prev ? pctChange(latest.roas, prev.roas) : null} />
                                    <KPICard icon={<ShoppingCart size={14} />} label="Orders"
                                        value={fmtAmt(latest.orders)} change={prev ? pctChange(latest.orders, prev.orders) : null} />
                                    <KPICard icon={<Eye size={14} />} label="Impressions"
                                        value={fmtK(latest.impressions)} change={prev ? pctChange(latest.impressions, prev.impressions) : null} />
                                </div>
                            )}

                            {/* Revenue Chart */}
                            <div className="card" style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BarChart3 size={16} /> Revenue Trend
                                </h3>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 180 }}>
                                    {rollups.map((r, i) => {
                                        const h = Math.max((r.revenue / maxRevenue) * 160, 4);
                                        const isLatest = i === rollups.length - 1;
                                        return (
                                            <div key={r.monthEndDate} title={`${fmtMonth(r.monthEndDate)}: ${fmtAmt(r.revenue)} EGP`}
                                                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'default' }}>
                                                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtK(r.revenue)}</div>
                                                <div style={{
                                                    width: '100%', maxWidth: 40, height: h, borderRadius: '4px 4px 0 0',
                                                    background: isLatest ? 'var(--aw-navy)' : 'rgba(0,26,112,0.15)',
                                                    transition: 'height 0.5s ease',
                                                }} />
                                                <div style={{ fontSize: '0.55rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtMonth(r.monthEndDate)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Monthly Summary Table */}
                            <div className="card" style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 16 }}>Monthly Summary</h3>
                                <div style={{ overflow: 'auto' }}>
                                    <table className="data-table">
                                        <thead><tr>
                                            <th>Month</th><th style={{ textAlign: 'right' }}>Spend</th>
                                            <th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>ROAS</th>
                                            <th style={{ textAlign: 'right' }}>Orders</th><th style={{ textAlign: 'right' }}>AOV</th>
                                            <th style={{ textAlign: 'right' }}>CPO</th><th style={{ textAlign: 'right' }}>Impressions</th>
                                        </tr></thead>
                                        <tbody>
                                            {[...rollups].reverse().map(r => (
                                                <tr key={r.monthEndDate}>
                                                    <td style={{ fontWeight: 600 }}>{fmtMonth(r.monthEndDate)}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtAmt(r.spend)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmtAmt(r.revenue)}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                                            color: r.roas >= 8 ? 'var(--success)' : r.roas >= 5 ? 'var(--aw-gold)' : 'var(--danger)', fontWeight: 700
                                                        }}>
                                                            {r.roas.toFixed(1)}x
                                                            {r.roas >= 8 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>{r.orders}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtAmt(r.aov)}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtAmt(r.cpo)}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtK(r.impressions)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Platform Breakdown */}
                            {adMetrics.length > 0 && (
                                <div className="card" style={{ marginBottom: 24 }}>
                                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 16 }}>Ad Platform Metrics</h3>
                                    <div style={{ overflow: 'auto' }}>
                                        <table className="data-table">
                                            <thead><tr>
                                                <th>Month</th><th>Platform</th><th style={{ textAlign: 'right' }}>Spend</th>
                                                <th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Conversions</th>
                                                <th style={{ textAlign: 'right' }}>Reach</th><th style={{ textAlign: 'right' }}>CPM</th>
                                            </tr></thead>
                                            <tbody>{adMetrics.map(m => (
                                                <tr key={m.id}>
                                                    <td style={{ fontWeight: 600 }}>{fmtMonth(m.monthEndDate)}</td>
                                                    <td>{PLATFORM_LABELS[m.platform] || m.platform}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtAmt(m.spend)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtAmt(m.revenue)}</td>
                                                    <td style={{ textAlign: 'right' }}>{m.conversions}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtK(m.reach)}</td>
                                                    <td style={{ textAlign: 'right' }}>{m.cpm.toFixed(2)}</td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {ecomMetrics.length > 0 && (
                                <div className="card">
                                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 16 }}>E-commerce Metrics</h3>
                                    <div style={{ overflow: 'auto' }}>
                                        <table className="data-table">
                                            <thead><tr>
                                                <th>Month</th><th>Platform</th>
                                                <th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Orders</th>
                                            </tr></thead>
                                            <tbody>{ecomMetrics.map(m => (
                                                <tr key={m.id}>
                                                    <td style={{ fontWeight: 600 }}>{fmtMonth(m.monthEndDate)}</td>
                                                    <td>{PLATFORM_LABELS[m.platform] || m.platform}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmtAmt(m.revenue)}</td>
                                                    <td style={{ textAlign: 'right' }}>{m.orders}</td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

function KPICard({ icon, label, value, change }: { icon: React.ReactNode; label: string; value: string; change: string | null }) {
    const isNeg = change && parseFloat(change) < 0;
    return (
        <div className="kpi-card">
            <div className="kpi-label">{icon} {label}</div>
            <div className="kpi-value">{value}</div>
            {change !== null && (
                <div className={`kpi-trend ${isNeg ? 'down' : 'up'}`}>
                    {isNeg ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                    {change}% vs prev
                </div>
            )}
        </div>
    );
}
