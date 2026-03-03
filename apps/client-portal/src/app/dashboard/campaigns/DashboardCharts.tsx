'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ── Types ──
interface DailyMetric {
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    revenue: number;
    orders: number;
    conversions: number;
    reach?: number;
    linkClicks?: number;
}

interface DailyChartsProps {
    data: DailyMetric[];
    currency: string;
}

// ── Formatters ──
const fmtK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);
const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Three daily trend charts from the old dashboard:
 * 1. Traffic Volume (Impressions + Clicks)
 * 2. Revenue & Spend
 * 3. Conversions & ROAS
 */
export function DailyTrendCharts({ data, currency }: DailyChartsProps) {
    if (!data || data.length === 0) return null;

    // Sort by date ascending
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

    // Prepare chart data
    const chartData = sorted.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        impressions: d.impressions,
        clicks: d.clicks,
        spend: Math.round(d.spend),
        revenue: Math.round(d.revenue),
        conversions: d.conversions || d.orders || 0,
        roas: d.spend > 0 ? parseFloat((d.revenue / d.spend).toFixed(1)) : 0,
    }));

    const chartStyle = {
        borderRadius: 14, background: 'var(--card-bg)',
        border: '1px solid var(--card-border)', padding: '20px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    };

    const headingStyle: React.CSSProperties = {
        fontSize: '0.82rem', fontWeight: 700, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 8,
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* Chart 1: Traffic Volume */}
            <div style={chartStyle}>
                <h4 style={headingStyle}>
                    📈 Traffic Volume
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 400 }}>Last {chartData.length} days</span>
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(chartData.length / 6)} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                        <Tooltip formatter={(v: any, name?: string) => [fmtK(Number(v) || 0), name === 'impressions' ? 'Impressions' : 'Clicks']}
                            contentStyle={{ fontSize: '0.72rem', borderRadius: 8, border: '1px solid var(--card-border)' }} />
                        <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#3498db" strokeWidth={2} dot={false} name="impressions" />
                        <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#2ecc71" strokeWidth={2} dot={false} name="clicks" />
                    </LineChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: '#3498db', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 12, height: 2, background: '#3498db', borderRadius: 1 }} /> Impressions
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 12, height: 2, background: '#2ecc71', borderRadius: 1 }} /> Clicks
                    </span>
                </div>
            </div>

            {/* Chart 2: Revenue & Spend */}
            <div style={chartStyle}>
                <h4 style={headingStyle}>
                    💰 Revenue & Spend
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 400 }}>{currency}</span>
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(chartData.length / 6)} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                        <Tooltip formatter={(v: any, name?: string) => [fmtAmt(Number(v) || 0) + ` ${currency}`, name === 'revenue' ? 'Revenue' : 'Spend']}
                            contentStyle={{ fontSize: '0.72rem', borderRadius: 8, border: '1px solid var(--card-border)' }} />
                        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#27ae60" strokeWidth={2} dot={false} name="revenue" />
                        <Line yAxisId="right" type="monotone" dataKey="spend" stroke="#e74c3c" strokeWidth={2} dot={false} name="spend" />
                    </LineChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: '#27ae60', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 12, height: 2, background: '#27ae60', borderRadius: 1 }} /> Revenue
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 12, height: 2, background: '#e74c3c', borderRadius: 1 }} /> Spend
                    </span>
                </div>
            </div>

            {/* Chart 3: Conversions & ROAS */}
            <div style={chartStyle}>
                <h4 style={headingStyle}>
                    🎯 Conversions & ROAS
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(chartData.length / 6)} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}x`} />
                        <Tooltip formatter={(v: any, name?: string) => [name === 'roas' ? `${v}x` : v, name === 'roas' ? 'ROAS' : 'Conversions']}
                            contentStyle={{ fontSize: '0.72rem', borderRadius: 8, border: '1px solid var(--card-border)' }} />
                        <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="#1abc9c" strokeWidth={2} dot={false} name="conversions" />
                        <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#9b59b6" strokeWidth={2} dot={false} name="roas" />
                    </LineChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: '#1abc9c', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 12, height: 2, background: '#1abc9c', borderRadius: 1 }} /> Conversions
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#9b59b6', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 12, height: 2, background: '#9b59b6', borderRadius: 1 }} /> ROAS
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * Ad Platform Metrics — 7 cards matching old dashboard Section D
 */
interface AdPlatformMetricsProps {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    reach: number;
    linkClicks: number;
    currency: string;
}

function MetricMiniCard({ label, value, sublabel, color }: { label: string; value: string; sublabel?: string; color: string }) {
    return (
        <div style={{
            padding: '14px 12px', borderRadius: 12, background: 'var(--card-bg)',
            border: '1px solid var(--card-border)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}>
            <div style={{ fontSize: '0.64rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>
                {label}
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color, letterSpacing: '-0.01em' }}>
                {value}
            </div>
            {sublabel && <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: 2 }}>{sublabel}</div>}
        </div>
    );
}

export function AdPlatformMetrics({ impressions, clicks, spend, conversions, reach, linkClicks, currency }: AdPlatformMetricsProps) {
    const frequency = reach > 0 ? (impressions / reach).toFixed(1) : '0';
    const cpm = impressions > 0 ? ((spend / impressions) * 1000).toFixed(2) : '0';
    const cpo = conversions > 0 ? Math.round(spend / conversions) : 0;
    const linkCTR = impressions > 0 ? ((linkClicks / impressions) * 100).toFixed(2) : '0';
    const cplc = linkClicks > 0 ? (spend / linkClicks).toFixed(2) : '0';

    return (
        <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                📱 Ad Platform Metrics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                <MetricMiniCard label="Reach" value={fmtK(reach)} color="var(--foreground)" />
                <MetricMiniCard label="Frequency" value={`${frequency}x`} sublabel="Impressions ÷ Reach" color="var(--foreground)" />
                <MetricMiniCard label="Link Clicks" value={fmtK(linkClicks)} color="var(--foreground)" />
                <MetricMiniCard label="CPM" value={`${cpm}`} sublabel={currency} color="var(--foreground)" />
                <MetricMiniCard label="Cost/Order" value={fmtAmt(cpo)} sublabel={currency} color={cpo > 0 ? '#e67e22' : 'var(--foreground)'} />
                <MetricMiniCard label="Link CTR" value={`${linkCTR}%`} color={parseFloat(linkCTR) > 1 ? '#27ae60' : 'var(--foreground)'} />
                <MetricMiniCard label="Cost/Link Click" value={cplc} sublabel={currency} color="var(--foreground)" />
            </div>
        </div>
    );
}

/**
 * Revenue & Orders Split — Ad vs E-commerce (Sections B & C from old dashboard)
 */
interface RevenueSplitProps {
    adRevenue: number;
    ecomRevenue: number;
    adConversions: number;
    ecomOrders: number;
    currency: string;
}

export function RevenueSplitCards({ adRevenue, ecomRevenue, adConversions, ecomOrders, currency }: RevenueSplitProps) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {/* Revenue Split */}
            <div style={{
                padding: '18px 16px', borderRadius: 14, background: 'var(--card-bg)',
                border: '1px solid var(--card-border)', borderLeft: '4px solid #27ae60',
            }}>
                <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.03em', marginBottom: 6 }}>
                    📘 Ad Revenue
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#27ae60' }}>
                    {fmtK(adRevenue)} <span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--muted)' }}>{currency}</span>
                </div>
                <div style={{ fontSize: '0.64rem', color: 'var(--muted)', marginTop: 4 }}>Revenue attributed to ad campaigns</div>
            </div>
            <div style={{
                padding: '18px 16px', borderRadius: 14, background: 'var(--card-bg)',
                border: '1px solid var(--card-border)', borderLeft: '4px solid #3498db',
            }}>
                <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.03em', marginBottom: 6 }}>
                    🛍️ E-commerce Revenue
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3498db' }}>
                    {fmtK(ecomRevenue)} <span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--muted)' }}>{currency}</span>
                </div>
                <div style={{ fontSize: '0.64rem', color: 'var(--muted)', marginTop: 4 }}>All store sales regardless of source</div>
            </div>

            {/* Conversions Split */}
            <div style={{
                padding: '18px 16px', borderRadius: 14, background: 'var(--card-bg)',
                border: '1px solid var(--card-border)', borderLeft: '4px solid #e67e22',
            }}>
                <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.03em', marginBottom: 6 }}>
                    🎯 Ad Conversions
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#e67e22' }}>
                    {fmtAmt(adConversions)}
                </div>
                <div style={{ fontSize: '0.64rem', color: 'var(--muted)', marginTop: 4 }}>Purchases attributed to ads</div>
            </div>
            <div style={{
                padding: '18px 16px', borderRadius: 14, background: 'var(--card-bg)',
                border: '1px solid var(--card-border)', borderLeft: '4px solid #9b59b6',
            }}>
                <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.03em', marginBottom: 6 }}>
                    📦 E-commerce Orders
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#9b59b6' }}>
                    {fmtAmt(ecomOrders)}
                </div>
                <div style={{ fontSize: '0.64rem', color: 'var(--muted)', marginTop: 4 }}>Total store orders from any source</div>
            </div>
        </div>
    );
}
