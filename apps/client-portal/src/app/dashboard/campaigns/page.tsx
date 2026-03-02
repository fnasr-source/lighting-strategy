'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    clientsService, monthlyRollupsService, monthlyMetricsService,
    type Client, type MonthlyClientRollup, type MonthlyPlatformMetric,
} from '@/lib/firestore';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Target, ShoppingCart, Eye } from 'lucide-react';

export default function CampaignsPage() {
    const { hasPermission, isClient, profile } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [rollups, setRollups] = useState<MonthlyClientRollup[]>([]);
    const [metrics, setMetrics] = useState<MonthlyPlatformMetric[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        clientsService.subscribe(setClients);
    }, []);

    // Auto-select client for client users
    useEffect(() => {
        if (isClient && profile?.linkedClientId) {
            setSelectedClient(profile.linkedClientId);
        }
    }, [isClient, profile]);

    // Load data when client changes
    useEffect(() => {
        if (!selectedClient) return;
        setLoading(true);
        Promise.all([
            monthlyRollupsService.getByClient(selectedClient),
            monthlyMetricsService.getByClient(selectedClient),
        ]).then(([r, m]) => {
            setRollups(r);
            setMetrics(m);
            setLoading(false);
        });
    }, [selectedClient]);

    if (!hasPermission('campaigns:read')) {
        return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
    }

    const fmtK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);
    const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const fmtMonth = (d: string) => {
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Combined rollups only, sorted chronologically
    const combined = rollups
        .filter(r => r.platformType === 'combined')
        .sort((a, b) => a.monthEndDate.localeCompare(b.monthEndDate));

    // Latest month KPIs
    const latest = combined.length > 0 ? combined[combined.length - 1] : null;
    const prev = combined.length > 1 ? combined[combined.length - 2] : null;

    const pctChange = (curr: number, prev: number) => {
        if (!prev) return null;
        return ((curr - prev) / prev * 100).toFixed(1);
    };

    // Ad and ecommerce metrics for the table
    const adMetrics = metrics.filter(m => m.platformType === 'ad').sort((a, b) => b.monthEndDate.localeCompare(a.monthEndDate));
    const ecomMetrics = metrics.filter(m => m.platformType === 'ecommerce').sort((a, b) => b.monthEndDate.localeCompare(a.monthEndDate));

    // Revenue chart — simple CSS bar chart
    const maxRevenue = Math.max(...combined.map(r => r.revenue), 1);

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Campaign Performance</h1>
                    <p className="page-subtitle">Monthly metrics across all platforms</p>
                </div>
                {!isClient && (
                    <select className="form-input" style={{ width: 'auto', minWidth: 200 }}
                        value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                        <option value="">Select client...</option>
                        {clients.map(c => <option key={c.id} value={c.id!}>{c.name}</option>)}
                    </select>
                )}
            </div>

            {!selectedClient ? (
                <div className="card"><div className="empty-state" style={{ padding: 48 }}>
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-title">Select a Client</div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Choose a client to view campaign performance data.</p>
                </div></div>
            ) : loading ? (
                <div className="card"><div className="empty-state" style={{ padding: 48 }}>
                    <div className="loading-spinner" />
                </div></div>
            ) : combined.length === 0 ? (
                <div className="card"><div className="empty-state" style={{ padding: 48 }}>
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-title">No Data Yet</div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Run the data migration or connect ad platforms to start seeing metrics.</p>
                </div></div>
            ) : (
                <>
                    {/* KPI Cards */}
                    {latest && (
                        <div className="kpi-grid">
                            <KPICard
                                icon={<DollarSign size={14} />}
                                label="Revenue"
                                value={`${fmtK(latest.revenue)} ${latest.currency}`}
                                change={prev ? pctChange(latest.revenue, prev.revenue) : null}
                            />
                            <KPICard
                                icon={<TrendingUp size={14} />}
                                label="ROAS"
                                value={`${latest.roas.toFixed(1)}x`}
                                change={prev ? pctChange(latest.roas, prev.roas) : null}
                            />
                            <KPICard
                                icon={<ShoppingCart size={14} />}
                                label="Orders"
                                value={fmtAmt(latest.orders)}
                                change={prev ? pctChange(latest.orders, prev.orders) : null}
                            />
                            <KPICard
                                icon={<Eye size={14} />}
                                label="Impressions"
                                value={fmtK(latest.impressions)}
                                change={prev ? pctChange(latest.impressions, prev.impressions) : null}
                            />
                        </div>
                    )}

                    {/* Revenue Chart */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BarChart3 size={16} /> Revenue Trend
                        </h3>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 180 }}>
                            {combined.map((r, i) => {
                                const h = Math.max((r.revenue / maxRevenue) * 160, 4);
                                const isLatest = i === combined.length - 1;
                                return (
                                    <div key={r.monthEndDate} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                                            {fmtK(r.revenue)}
                                        </div>
                                        <div style={{
                                            width: '100%', maxWidth: 40, height: h, borderRadius: '4px 4px 0 0',
                                            background: isLatest ? 'var(--aw-navy)' : 'rgba(0,26,112,0.15)',
                                            transition: 'height 0.5s ease',
                                        }} />
                                        <div style={{ fontSize: '0.55rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                                            {fmtMonth(r.monthEndDate)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Monthly Performance Table */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 16 }}>Monthly Summary</h3>
                        <div style={{ overflow: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th style={{ textAlign: 'right' }}>Spend</th>
                                        <th style={{ textAlign: 'right' }}>Revenue</th>
                                        <th style={{ textAlign: 'right' }}>ROAS</th>
                                        <th style={{ textAlign: 'right' }}>Orders</th>
                                        <th style={{ textAlign: 'right' }}>AOV</th>
                                        <th style={{ textAlign: 'right' }}>CPO</th>
                                        <th style={{ textAlign: 'right' }}>Impressions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...combined].reverse().map(r => (
                                        <tr key={r.monthEndDate}>
                                            <td style={{ fontWeight: 600 }}>{fmtMonth(r.monthEndDate)}</td>
                                            <td style={{ textAlign: 'right' }}>{fmtAmt(r.spend)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmtAmt(r.revenue)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    color: r.roas >= 8 ? 'var(--success)' : r.roas >= 5 ? 'var(--aw-gold)' : 'var(--danger)',
                                                    fontWeight: 700,
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
                                    <thead>
                                        <tr>
                                            <th>Month</th>
                                            <th>Platform</th>
                                            <th style={{ textAlign: 'right' }}>Spend</th>
                                            <th style={{ textAlign: 'right' }}>Revenue</th>
                                            <th style={{ textAlign: 'right' }}>Conversions</th>
                                            <th style={{ textAlign: 'right' }}>Reach</th>
                                            <th style={{ textAlign: 'right' }}>CPM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adMetrics.map(m => (
                                            <tr key={m.id}>
                                                <td style={{ fontWeight: 600 }}>{fmtMonth(m.monthEndDate)}</td>
                                                <td>{m.platform}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtAmt(m.spend)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtAmt(m.revenue)}</td>
                                                <td style={{ textAlign: 'right' }}>{m.conversions}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtK(m.reach)}</td>
                                                <td style={{ textAlign: 'right' }}>{m.cpm.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {ecomMetrics.length > 0 && (
                        <div className="card">
                            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 16 }}>E-commerce Metrics</h3>
                            <div style={{ overflow: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Month</th>
                                            <th>Platform</th>
                                            <th style={{ textAlign: 'right' }}>Revenue</th>
                                            <th style={{ textAlign: 'right' }}>Orders</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ecomMetrics.map(m => (
                                            <tr key={m.id}>
                                                <td style={{ fontWeight: 600 }}>{fmtMonth(m.monthEndDate)}</td>
                                                <td>{m.platform}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmtAmt(m.revenue)}</td>
                                                <td style={{ textAlign: 'right' }}>{m.orders}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
