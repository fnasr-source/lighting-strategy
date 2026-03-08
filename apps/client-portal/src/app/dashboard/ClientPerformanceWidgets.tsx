'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { HealthScoreBadge } from './AdminPerformanceWidgets';
import Link from 'next/link';
import {
    TrendingUp,
    TrendingDown,
    Eye,
    MousePointerClick,
    UserPlus,
    ShoppingCart,
    ArrowRight,
} from 'lucide-react';
import type { DashboardIntelligenceResponse } from '@/lib/performance-intelligence/types';

// ── Formatters ──────────────────────────────────────────

const fmtCurrency = (n: number, currency = 'USD') => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${currency}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K ${currency}`;
    return `${n.toFixed(0)} ${currency}`;
};

const fmtNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
};

const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;

const PLATFORM_LABELS: Record<string, string> = {
    meta_ads: 'Meta Ads',
    google_ads: 'Google Ads',
    tiktok_ads: 'TikTok Ads',
    ga4: 'Google Analytics',
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    meta_social: 'Meta Social',
};

const PLATFORM_COLORS: Record<string, string> = {
    meta_ads: '#1877F2',
    google_ads: '#4285F4',
    tiktok_ads: '#000000',
    ga4: '#E37400',
    shopify: '#96BF48',
    woocommerce: '#7F54B3',
    meta_social: '#E4405F',
};

// ── Performance KPI Cards ───────────────────────────────

export function PerformanceKPICards({
    data,
    currency,
}: {
    data: DashboardIntelligenceResponse;
    currency: string;
}) {
    const roas = data.executive.spend > 0 ? data.executive.value / data.executive.spend : 0;

    return (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <KPIStatCard
                label="Ad Spend (30d)"
                value={fmtCurrency(data.executive.spend, currency)}
                icon="💰"
                color="#ef4444"
            />
            <KPIStatCard
                label="Revenue (30d)"
                value={fmtCurrency(data.executive.value, currency)}
                icon="📈"
                color="#16a34a"
            />
            <KPIStatCard
                label="ROAS"
                value={`${roas.toFixed(2)}x`}
                icon="🎯"
                color={roas >= 2 ? '#16a34a' : roas >= 1 ? '#ca8a04' : '#dc2626'}
            />
            <KPIStatCard
                label="Health Score"
                value={`${data.executive.healthScore}/100`}
                icon="💪"
                color={data.executive.healthScore >= 75 ? '#16a34a' : data.executive.healthScore >= 50 ? '#ca8a04' : '#dc2626'}
            />
            <KPIStatCard
                label="Click-Through Rate"
                value={fmtPct(data.funnel.clickThroughRate)}
                icon="🖱️"
                color="#2563eb"
            />
            <KPIStatCard
                label="Conversions"
                value={fmtNumber(data.funnel.leads + data.funnel.orders)}
                icon="✅"
                color="#7c3aed"
            />
        </div>
    );
}

function KPIStatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
    return (
        <div className="kpi-card" style={{ borderTop: `3px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div className="kpi-label">{label}</div>
                <span style={{ fontSize: '1.2rem' }}>{icon}</span>
            </div>
            <div className="kpi-value" style={{ color }}>{value}</div>
        </div>
    );
}

// ── Client Trend Chart ──────────────────────────────────

export function ClientTrendChart({
    series,
    currency,
}: {
    series: DashboardIntelligenceResponse['series'];
    currency: string;
}) {
    if (series.length === 0) {
        return (
            <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Performance Trend</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No trend data available yet. Data will appear once campaigns are active.</p>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Performance Trend (30 Days)</h3>
            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(v: string) => v.slice(5)}
                        tick={{ fontSize: 10, fill: 'var(--muted)' }}
                    />
                    <YAxis
                        tickFormatter={(v: number) => fmtCurrency(v, currency)}
                        tick={{ fontSize: 10, fill: 'var(--muted)' }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 8,
                            fontSize: '0.82rem',
                        }}
                        formatter={((value: number, name: string) => {
                            if (name === 'Spend' || name === 'Revenue') return fmtCurrency(value, currency);
                            return `${value.toFixed(2)}x`;
                        }) as any}
                    />
                    <Line type="monotone" dataKey="spend" name="Spend" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="value" name="Revenue" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// ── Channel Cards ───────────────────────────────────────

export function ChannelCards({
    channels,
    currency,
}: {
    channels: DashboardIntelligenceResponse['channels'];
    currency: string;
}) {
    if (channels.length === 0) {
        return (
            <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Channel Breakdown</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No channel data available.</p>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Channel Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {channels.map((ch) => {
                    const roas = ch.spend > 0 ? ch.value / ch.spend : 0;
                    return (
                        <div
                            key={ch.platform}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                border: '1px solid var(--card-border)',
                                background: 'var(--muted-bg)',
                                borderLeft: `4px solid ${PLATFORM_COLORS[ch.platform] || '#6b7280'}`,
                            }}
                        >
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>
                                {PLATFORM_LABELS[ch.platform] || ch.platform}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.78rem' }}>
                                <div>
                                    <div style={{ color: 'var(--muted)' }}>Spend</div>
                                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{fmtCurrency(ch.spend, currency)}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--muted)' }}>Revenue</div>
                                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{fmtCurrency(ch.value, currency)}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--muted)' }}>ROAS</div>
                                    <div style={{ fontWeight: 600, fontFamily: 'monospace', color: roas >= 2 ? '#16a34a' : roas >= 1 ? '#ca8a04' : '#dc2626' }}>
                                        {roas.toFixed(2)}x
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--muted)' }}>Share</div>
                                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{(ch.share * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Funnel Visualization ────────────────────────────────

export function FunnelVisualization({
    funnel,
}: {
    funnel: DashboardIntelligenceResponse['funnel'];
}) {
    const stages = [
        { label: 'Impressions', value: funnel.impressions, icon: <Eye size={16} />, color: '#6b7280' },
        { label: 'Clicks', value: funnel.clicks, icon: <MousePointerClick size={16} />, color: '#2563eb' },
        { label: 'Leads', value: funnel.leads, icon: <UserPlus size={16} />, color: '#7c3aed' },
        { label: 'Conversions', value: funnel.orders || funnel.leads, icon: <ShoppingCart size={16} />, color: '#16a34a' },
    ].filter(s => s.value > 0);

    if (stages.length === 0) {
        return (
            <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Marketing Funnel</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No funnel data available yet.</p>
            </div>
        );
    }

    const maxValue = Math.max(...stages.map(s => s.value));

    return (
        <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Marketing Funnel</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {stages.map((stage, i) => {
                    const width = maxValue > 0 ? Math.max(20, (stage.value / maxValue) * 100) : 20;
                    const convRate = i > 0 && stages[i - 1].value > 0
                        ? ((stage.value / stages[i - 1].value) * 100).toFixed(1) + '%'
                        : '';

                    return (
                        <div key={stage.label} style={{ position: 'relative' }}>
                            {i > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', background: 'var(--card-bg)', padding: '0 8px' }}>
                                        ↓ {convRate}
                                    </span>
                                </div>
                            )}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    background: `${stage.color}12`,
                                    border: `1px solid ${stage.color}30`,
                                    width: `${width}%`,
                                    margin: '0 auto',
                                    transition: 'width 0.5s ease',
                                }}
                            >
                                <span style={{ color: stage.color }}>{stage.icon}</span>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1 }}>{stage.label}</span>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'monospace' }}>
                                    {fmtNumber(stage.value)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Quick Links ─────────────────────────────────────────

export function ClientQuickLinks() {
    const links = [
        { label: 'View Detailed Performance', href: '/dashboard/campaigns', icon: '📊' },
        { label: 'View Reports', href: '/dashboard/reports', icon: '📋' },
        { label: 'View Invoices', href: '/dashboard/invoices', icon: '🧾' },
        { label: 'Messages', href: '/dashboard/communications', icon: '💬' },
    ];

    return (
        <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Quick Links</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'var(--muted-bg)',
                            textDecoration: 'none',
                            color: 'var(--foreground)',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            border: '1px solid transparent',
                            transition: 'border-color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--card-border)';
                            e.currentTarget.style.background = 'var(--card-bg)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.background = 'var(--muted-bg)';
                        }}
                    >
                        <span>{link.icon}</span>
                        <span style={{ flex: 1 }}>{link.label}</span>
                        <ArrowRight size={14} style={{ color: 'var(--muted)' }} />
                    </Link>
                ))}
            </div>
        </div>
    );
}
