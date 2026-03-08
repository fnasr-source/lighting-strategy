'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { AggregateClientEntry } from '@/lib/performance-intelligence/intelligence';

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

const fmtRoas = (n: number) => `${n.toFixed(2)}x`;

const GRADE_COLORS: Record<string, string> = {
    A: '#16a34a',
    B: '#65a30d',
    C: '#ca8a04',
    D: '#ea580c',
    F: '#dc2626',
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

const PLATFORM_LABELS: Record<string, string> = {
    meta_ads: 'Meta Ads',
    google_ads: 'Google Ads',
    tiktok_ads: 'TikTok Ads',
    ga4: 'Google Analytics',
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    meta_social: 'Meta Social',
};

// ── Client Health Table ─────────────────────────────────

export function ClientHealthTable({
    clients,
    currency,
}: {
    clients: AggregateClientEntry[];
    currency: string;
}) {
    if (clients.length === 0) {
        return (
            <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Client Health Scoreboard</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No active clients with performance data yet.</p>
            </div>
        );
    }

    return (
        <div className="card" style={{ overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Client Health Scoreboard</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{clients.length} active clients</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--card-border)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--muted)' }}>Client</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', textAlign: 'center' }}>Health</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>Spend</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>Revenue</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>ROAS</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>Conv.</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', textAlign: 'center' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map((client) => (
                        <tr
                            key={client.clientId}
                            style={{
                                borderBottom: '1px solid var(--card-border)',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted-bg)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                        >
                            <td style={{ padding: '12px', fontWeight: 600 }}>{client.clientName}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        fontWeight: 800,
                                        fontSize: '0.85rem',
                                        color: '#fff',
                                        background: GRADE_COLORS[client.healthGrade] || '#6b7280',
                                    }}
                                >
                                    {client.healthGrade}
                                </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
                                {fmtCurrency(client.spend, currency)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
                                {fmtCurrency(client.value, currency)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: client.roas >= 2 ? '#16a34a' : client.roas >= 1 ? '#ca8a04' : '#dc2626' }}>
                                {fmtRoas(client.roas)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
                                {fmtNumber(client.conversions)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                <Link
                                    href={`/dashboard/campaigns?clientId=${client.clientId}`}
                                    style={{ color: 'var(--aw-navy)', opacity: 0.6 }}
                                    title="View details"
                                >
                                    <ExternalLink size={14} />
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Aggregated Trend Chart ──────────────────────────────

export function AggregatedTrendChart({
    series,
    currency,
}: {
    series: Array<{ date: string; spend: number; value: number; conversions: number; roas: number }>;
    currency: string;
}) {
    if (series.length === 0) {
        return (
            <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Performance Trend (All Clients)</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No trend data available yet.</p>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Performance Trend (All Clients)</h3>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(v: string) => v.slice(5)}
                        tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    />
                    <YAxis
                        yAxisId="left"
                        tickFormatter={(v: number) => fmtCurrency(v, currency)}
                        tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(v: number) => fmtNumber(v)}
                        tick={{ fontSize: 11, fill: 'var(--muted)' }}
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
                            return fmtNumber(value);
                        }) as any}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="value" name="Revenue" stroke="#16a34a" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="conversions" name="Conversions" stroke="#2563eb" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// ── Channel Distribution Chart ──────────────────────────

export function ChannelDistributionChart({
    channels,
    currency,
}: {
    channels: Array<{ platform: string; spend: number; value: number; conversions: number; share: number; efficiency: number }>;
    currency: string;
}) {
    if (channels.length === 0) {
        return (
            <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Channel Distribution</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No channel data available.</p>
            </div>
        );
    }

    const pieData = channels.map((ch) => ({
        name: PLATFORM_LABELS[ch.platform] || ch.platform,
        value: ch.spend,
        fill: PLATFORM_COLORS[ch.platform] || '#6b7280',
    }));

    return (
        <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Channel Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={2}
                        >
                            {pieData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Legend
                            formatter={(value: string) => <span style={{ fontSize: '0.78rem' }}>{value}</span>}
                        />
                        <Tooltip
                            formatter={((value: number) => fmtCurrency(value, currency)) as any}
                            contentStyle={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--card-border)',
                                borderRadius: 8,
                                fontSize: '0.82rem',
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {channels.map((ch) => (
                        <div
                            key={ch.platform}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: '1px solid var(--card-border)',
                                fontSize: '0.82rem',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        background: PLATFORM_COLORS[ch.platform] || '#6b7280',
                                        flexShrink: 0,
                                    }}
                                />
                                <span style={{ fontWeight: 600 }}>{PLATFORM_LABELS[ch.platform] || ch.platform}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 16, color: 'var(--muted)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                                <span>{(ch.share * 100).toFixed(1)}%</span>
                                <span style={{ color: ch.efficiency >= 2 ? '#16a34a' : ch.efficiency >= 1 ? '#ca8a04' : '#dc2626' }}>
                                    {fmtRoas(ch.efficiency)} ROAS
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Risk & Opportunity Panels ───────────────────────────

export function RiskOpportunityPanels({
    risks,
    opportunities,
}: {
    risks: string[];
    opportunities: string[];
}) {
    return (
        <div className="risk-opp-grid">
            <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444' }}>Top Risks</h3>
                </div>
                {risks.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No active risks detected 🎉</p>
                ) : (
                    <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc' }}>
                        {risks.map((r, i) => (
                            <li key={i} style={{ fontSize: '0.82rem', marginBottom: 8, lineHeight: 1.5, color: 'var(--foreground)' }}>
                                {r}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Sparkles size={16} style={{ color: '#16a34a' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#16a34a' }}>Opportunities</h3>
                </div>
                {opportunities.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Analyzing opportunity signals…</p>
                ) : (
                    <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc' }}>
                        {opportunities.map((o, i) => (
                            <li key={i} style={{ fontSize: '0.82rem', marginBottom: 8, lineHeight: 1.5, color: 'var(--foreground)' }}>
                                {o}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ── Health Score Badge ───────────────────────────────────

export function HealthScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
    const grade = score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'F';
    const dims = size === 'lg' ? 56 : size === 'md' ? 40 : 28;
    const fontSize = size === 'lg' ? '1.5rem' : size === 'md' ? '1rem' : '0.75rem';

    return (
        <div
            style={{
                width: dims,
                height: dims,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize,
                color: '#fff',
                background: GRADE_COLORS[grade] || '#6b7280',
                boxShadow: `0 2px 8px ${GRADE_COLORS[grade]}40`,
            }}
            title={`Health Score: ${score}/100 (${grade})`}
        >
            {grade}
        </div>
    );
}
