'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    clientsService, monthlyRollupsService, monthlyMetricsService, platformConnectionsService,
    type Client, type MonthlyClientRollup, type MonthlyPlatformMetric, type PlatformConnection,
} from '@/lib/firestore';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Eye, Globe,
    Zap, Target, Users, MousePointer, ArrowRight, ExternalLink, Activity, Percent,
} from 'lucide-react';

const PLATFORM_LABELS: Record<string, string> = {
    meta_ads: 'Meta Ads', google_ads: 'Google Ads', tiktok_ads: 'TikTok Ads',
    shopify: 'Shopify', ga4: 'GA4', woocommerce: 'WooCommerce',
};
const PLATFORM_COLORS: Record<string, string> = {
    meta_ads: '#1877F2', google_ads: '#4285F4', tiktok_ads: '#00f2ea',
    shopify: '#96bf48', ga4: '#E37400', woocommerce: '#96588a',
};
const PLATFORM_ICONS: Record<string, string> = {
    meta_ads: '📘', google_ads: '🔍', tiktok_ads: '🎵',
    shopify: '🛍️', ga4: '📊', woocommerce: '🛒',
};

type DateRange = '3m' | '6m' | '12m' | 'all';

export default function CampaignsPage() {
    const { hasPermission, isClient, profile } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [allRollups, setAllRollups] = useState<MonthlyClientRollup[]>([]);
    const [allMetrics, setAllMetrics] = useState<MonthlyPlatformMetric[]>([]);
    const [allConnections, setAllConnections] = useState<PlatformConnection[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange>('12m');
    const [campaignLeadCount, setCampaignLeadCount] = useState(0);

    useEffect(() => {
        const unsubs = [
            clientsService.subscribe(c => setClients(c)),
            monthlyRollupsService.subscribe(r => { setAllRollups(r); setDataLoaded(true); }),
            monthlyMetricsService.subscribe(setAllMetrics),
            platformConnectionsService.subscribe(setAllConnections),
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    // Load campaign lead count
    useEffect(() => {
        return onSnapshot(collection(db, 'campaigns'), snap => {
            // Simple count — check all campaigns
            let count = 0;
            snap.docs.forEach(() => count++);
            setCampaignLeadCount(count);
        });
    }, []);

    useEffect(() => {
        if (selectedClient) return;
        if (isClient && profile?.linkedClientId) {
            setSelectedClient(profile.linkedClientId);
        } else if (clients.length > 0) {
            const active = clients.find(c => c.status === 'active');
            setSelectedClient(active?.id || clients[0].id!);
        }
    }, [isClient, profile, clients, selectedClient]);

    // Date range filter helper
    const getDateCutoff = (range: DateRange) => {
        if (range === 'all') return '0000-00-00';
        const d = new Date();
        d.setMonth(d.getMonth() - (range === '3m' ? 3 : range === '6m' ? 6 : 12));
        return d.toISOString().slice(0, 10);
    };

    const cutoff = getDateCutoff(dateRange);

    const rollups = useMemo(() =>
        allRollups.filter(r => r.clientId === selectedClient && r.platformType === 'combined' && r.monthEndDate >= cutoff)
            .sort((a, b) => a.monthEndDate.localeCompare(b.monthEndDate)),
        [allRollups, selectedClient, cutoff]);

    const metrics = useMemo(() =>
        allMetrics.filter(m => m.clientId === selectedClient && m.monthEndDate >= cutoff)
            .sort((a, b) => b.monthEndDate.localeCompare(a.monthEndDate)),
        [allMetrics, selectedClient, cutoff]);

    const connections = useMemo(() =>
        allConnections.filter(c => c.clientId === selectedClient),
        [allConnections, selectedClient]);

    if (!hasPermission('campaigns:read')) {
        return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
    }

    // --- Formatters ---
    const fmtK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);
    const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const fmtMonth = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const fmtMonthShort = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short' });
    const fmtPct = (n: number) => `${n.toFixed(1)}%`;

    // --- Computed Metrics ---
    const latest = rollups.length > 0 ? rollups[rollups.length - 1] : null;
    const prev = rollups.length > 1 ? rollups[rollups.length - 2] : null;
    const pctChange = (curr: number, prev: number) => prev ? ((curr - prev) / prev * 100).toFixed(1) : null;

    const totalRevenue = rollups.reduce((s, r) => s + r.revenue, 0);
    const totalSpend = rollups.reduce((s, r) => s + r.spend, 0);
    const totalOrders = rollups.reduce((s, r) => s + r.orders, 0);
    const totalImpressions = rollups.reduce((s, r) => s + r.impressions, 0);
    const totalClicks = rollups.reduce((s, r) => s + r.clicks, 0);
    const totalConversions = rollups.reduce((s, r) => s + r.conversions, 0);
    const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgAOV = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgCPO = totalOrders > 0 ? totalSpend / totalOrders : 0;
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgConvRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const maxRevenue = Math.max(...rollups.map(r => r.revenue), 1);
    const maxSpend = Math.max(...rollups.map(r => r.spend), 1);
    const maxChart = Math.max(maxRevenue, maxSpend);

    const adMetrics = metrics.filter(m => m.platformType === 'ad');
    const ecomMetrics = metrics.filter(m => m.platformType === 'ecommerce');
    const selectedName = clients.find(c => c.id === selectedClient)?.name || '';
    const selectedCurrency = clients.find(c => c.id === selectedClient)?.baseCurrency || 'EGP';

    // Platform aggregates for the visual breakdown
    const platformAgg = useMemo(() => {
        const map: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number; orders: number; months: number }> = {};
        adMetrics.forEach(m => {
            if (!map[m.platform]) map[m.platform] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0, orders: 0, months: 0 };
            map[m.platform].spend += m.spend;
            map[m.platform].revenue += m.revenue;
            map[m.platform].impressions += m.impressions;
            map[m.platform].clicks += m.clicks;
            map[m.platform].conversions += m.conversions;
            map[m.platform].orders += m.orders;
            map[m.platform].months++;
        });
        return Object.entries(map).sort((a, b) => b[1].spend - a[1].spend);
    }, [adMetrics]);

    // Best month
    const bestMonth = rollups.length > 0 ? rollups.reduce((best, r) => r.revenue > best.revenue ? r : best, rollups[0]) : null;

    return (
        <div>
            {/* ═══════ HEADER ═══════ */}
            <div className="page-header" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity size={22} style={{ color: 'var(--aw-navy)' }} />
                            Campaign Performance
                        </h1>
                        <p className="page-subtitle">
                            {selectedName ? `${selectedName} — ` : ''}Real-time metrics across all connected platforms
                        </p>
                    </div>
                    {/* Date Range */}
                    <div style={{ display: 'flex', gap: 4, background: 'var(--muted-bg)', borderRadius: 8, padding: 3 }}>
                        {([['3m', '3M'], ['6m', '6M'], ['12m', '12M'], ['all', 'All']] as const).map(([key, label]) => (
                            <button key={key} onClick={() => setDateRange(key)} style={{
                                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontSize: '0.76rem', fontWeight: dateRange === key ? 700 : 500,
                                background: dateRange === key ? 'var(--aw-navy)' : 'transparent',
                                color: dateRange === key ? '#fff' : 'var(--muted)',
                                transition: 'all 0.15s ease',
                            }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Client tabs */}
            {!isClient && clients.length > 0 && (() => {
                const activeClients = clients.filter(c => c.status === 'active');
                return activeClients.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, padding: '12px 0 20px', overflowX: 'auto', flexWrap: 'wrap' }}>
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
                    {/* Connected Platforms */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.73rem', color: 'var(--muted)', fontWeight: 600 }}>
                            <Globe size={11} style={{ verticalAlign: 'middle' }} /> Platforms:
                        </span>
                        {connections.length === 0 ? (
                            <span style={{ fontSize: '0.73rem', padding: '4px 10px', borderRadius: 6, background: 'rgba(231,76,60,0.08)', color: '#e74c3c' }}>
                                No platforms connected — <a href="/dashboard/integrations" style={{ color: '#e74c3c', fontWeight: 600 }}>Connect now →</a>
                            </span>
                        ) : connections.map(c => (
                            <span key={c.id} style={{
                                fontSize: '0.7rem', padding: '4px 10px', borderRadius: 6,
                                background: c.isConnected ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)',
                                color: c.isConnected ? '#27ae60' : '#e74c3c', fontWeight: 500,
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                                {PLATFORM_ICONS[c.platform] || '🔗'} {PLATFORM_LABELS[c.platform] || c.platform}
                                {c.isConnected ? ' ✓' : ' ✗'}
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
                                    : `Platforms are connected but no monthly data has been synced yet.`}
                            </p>
                        </div></div>
                    ) : (
                        <>
                            {/* ═══════ SECTION 1: HERO KPIs ═══════ */}
                            {latest && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                                    <HeroKPI icon={<DollarSign size={16} />} label="Revenue" value={`${fmtK(latest.revenue)}`} unit={selectedCurrency}
                                        change={prev ? pctChange(latest.revenue, prev.revenue) : null} accent="var(--success)" />
                                    <HeroKPI icon={<TrendingUp size={16} />} label="ROAS" value={`${latest.roas.toFixed(1)}x`}
                                        change={prev ? pctChange(latest.roas, prev.roas) : null}
                                        accent={latest.roas >= 8 ? 'var(--success)' : latest.roas >= 5 ? 'var(--aw-gold)' : 'var(--danger)'} />
                                    <HeroKPI icon={<ShoppingCart size={16} />} label="Orders" value={fmtAmt(latest.orders)}
                                        change={prev ? pctChange(latest.orders, prev.orders) : null} accent="var(--aw-navy)" />
                                    <HeroKPI icon={<Eye size={16} />} label="Impressions" value={fmtK(latest.impressions)}
                                        change={prev ? pctChange(latest.impressions, prev.impressions) : null} accent="var(--muted)" />
                                    <HeroKPI icon={<Zap size={16} />} label="Spend" value={`${fmtK(latest.spend)}`} unit={selectedCurrency}
                                        change={prev ? pctChange(latest.spend, prev.spend) : null} accent="#e74c3c" invertChange />
                                    <HeroKPI icon={<Target size={16} />} label="AOV" value={`${fmtAmt(latest.aov)}`} unit={selectedCurrency}
                                        change={prev ? pctChange(latest.aov, prev.aov) : null} accent="var(--aw-navy)" />
                                    <HeroKPI icon={<DollarSign size={16} />} label="CPO" value={`${fmtAmt(latest.cpo)}`} unit={selectedCurrency}
                                        change={prev ? pctChange(latest.cpo, prev.cpo) : null} accent="#e67e22" invertChange />
                                    <HeroKPI icon={<MousePointer size={16} />} label="CTR" value={fmtPct(latest.impressions > 0 ? (latest.clicks / latest.impressions) * 100 : 0)}
                                        change={prev && prev.impressions > 0 ? pctChange(latest.clicks / latest.impressions, prev.clicks / prev.impressions) : null} accent="#3498db" />
                                </div>
                            )}

                            {/* ═══════ SECTION 2: REVENUE & SPEND CHART ═══════ */}
                            <div className="card" style={{ marginBottom: 24, padding: '24px 20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                        <BarChart3 size={16} /> Revenue vs Spend
                                    </h3>
                                    <div style={{ display: 'flex', gap: 16, fontSize: '0.72rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--aw-navy)' }} /> Revenue
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(231,76,60,0.5)' }} /> Spend
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--aw-gold)' }} /> ROAS
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 220, position: 'relative' }}>
                                    {rollups.map((r, i) => {
                                        const revH = Math.max((r.revenue / maxChart) * 190, 3);
                                        const spendH = Math.max((r.spend / maxChart) * 190, 3);
                                        const isLatest = i === rollups.length - 1;
                                        const isBest = bestMonth && r.monthEndDate === bestMonth.monthEndDate;
                                        return (
                                            <div key={r.monthEndDate} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
                                                {/* ROAS dot */}
                                                <div style={{
                                                    position: 'absolute', top: 190 - (r.roas / Math.max(...rollups.map(x => x.roas), 1)) * 170,
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: 'var(--aw-gold)', border: '2px solid #fff',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)', zIndex: 2,
                                                }} title={`ROAS: ${r.roas.toFixed(1)}x`} />
                                                {/* Value label */}
                                                <div style={{ fontSize: '0.55rem', color: 'var(--muted)', whiteSpace: 'nowrap', fontWeight: isLatest ? 700 : 400 }}>
                                                    {fmtK(r.revenue)}
                                                </div>
                                                {/* Bars */}
                                                <div style={{ display: 'flex', gap: 1, width: '100%', maxWidth: 36, justifyContent: 'center' }}>
                                                    <div style={{
                                                        width: '45%', height: revH, borderRadius: '3px 3px 0 0',
                                                        background: isLatest ? 'var(--aw-navy)' : isBest ? 'rgba(0,26,112,0.6)' : 'rgba(0,26,112,0.2)',
                                                        transition: 'height 0.5s ease',
                                                    }} />
                                                    <div style={{
                                                        width: '45%', height: spendH, borderRadius: '3px 3px 0 0',
                                                        background: 'rgba(231,76,60,0.3)',
                                                        transition: 'height 0.5s ease',
                                                    }} />
                                                </div>
                                                {/* Month label */}
                                                <div style={{ fontSize: '0.52rem', color: isLatest ? 'var(--foreground)' : 'var(--muted)', whiteSpace: 'nowrap', fontWeight: isLatest ? 700 : 400 }}>
                                                    {fmtMonthShort(r.monthEndDate)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ═══════ SECTION 3: EFFICIENCY SCORECARD ═══════ */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
                                <ScoreCard title="Traffic" icon="🌐" items={[
                                    { label: 'Total Impressions', value: fmtK(totalImpressions) },
                                    { label: 'Total Clicks', value: fmtK(totalClicks) },
                                    { label: 'Avg CTR', value: fmtPct(avgCTR), highlight: avgCTR > 2 },
                                ]} />
                                <ScoreCard title="Conversion" icon="🎯" items={[
                                    { label: 'Total Conversions', value: fmtK(totalConversions) },
                                    { label: 'Total Orders', value: fmtAmt(totalOrders) },
                                    { label: 'Conv Rate', value: fmtPct(avgConvRate), highlight: avgConvRate > 3 },
                                ]} />
                                <ScoreCard title="Value" icon="💰" items={[
                                    { label: 'Total Revenue', value: `${fmtK(totalRevenue)} ${selectedCurrency}` },
                                    { label: 'Avg AOV', value: `${fmtAmt(Math.round(avgAOV))} ${selectedCurrency}` },
                                    { label: 'Overall ROAS', value: `${avgROAS.toFixed(1)}x`, highlight: avgROAS >= 5 },
                                ]} />
                                <ScoreCard title="Efficiency" icon="⚡" items={[
                                    { label: 'Total Spend', value: `${fmtK(totalSpend)} ${selectedCurrency}` },
                                    { label: 'Avg CPO', value: `${fmtAmt(Math.round(avgCPO))} ${selectedCurrency}` },
                                    { label: 'Avg CPM', value: `${(totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0).toFixed(1)}`, highlight: false },
                                ]} />
                            </div>

                            {/* ═══════ SECTION 4: PLATFORM BREAKDOWN ═══════ */}
                            {platformAgg.length > 0 && (
                                <div className="card" style={{ marginBottom: 24 }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Platform Performance</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                                        {platformAgg.map(([platform, data]) => {
                                            const roas = data.spend > 0 ? data.revenue / data.spend : 0;
                                            const shareOfSpend = totalSpend > 0 ? (data.spend / totalSpend) * 100 : 0;
                                            const color = PLATFORM_COLORS[platform] || '#999';
                                            return (
                                                <div key={platform} style={{ padding: 16, borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ fontSize: '1.1rem' }}>{PLATFORM_ICONS[platform] || '🔗'}</span>
                                                            {PLATFORM_LABELS[platform] || platform}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                                                            background: roas >= 8 ? 'rgba(46,204,113,0.1)' : roas >= 5 ? 'rgba(241,196,15,0.1)' : 'rgba(231,76,60,0.1)',
                                                            color: roas >= 8 ? '#27ae60' : roas >= 5 ? '#f1c40f' : '#e74c3c',
                                                        }}>
                                                            {roas.toFixed(1)}x ROAS
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Spend</div>
                                                            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{fmtK(data.spend)}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Revenue</div>
                                                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--success)' }}>{fmtK(data.revenue)}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Orders</div>
                                                            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{fmtAmt(data.orders)}</div>
                                                        </div>
                                                    </div>
                                                    {/* Spend share bar */}
                                                    <div style={{ height: 4, borderRadius: 2, background: 'var(--muted-bg)', overflow: 'hidden' }}>
                                                        <div style={{ width: `${shareOfSpend}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.5s ease' }} />
                                                    </div>
                                                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: 4 }}>{shareOfSpend.toFixed(0)}% of total spend</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ═══════ SECTION 5: MONTHLY TABLE ═══════ */}
                            <div className="card" style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Monthly Deep Dive</h3>
                                <div style={{ overflow: 'auto' }}>
                                    <table className="data-table">
                                        <thead><tr>
                                            <th>Month</th><th style={{ textAlign: 'right' }}>Spend</th>
                                            <th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>ROAS</th>
                                            <th style={{ textAlign: 'right' }}>Orders</th><th style={{ textAlign: 'right' }}>AOV</th>
                                            <th style={{ textAlign: 'right' }}>CPO</th><th style={{ textAlign: 'right' }}>Clicks</th>
                                            <th style={{ textAlign: 'right' }}>CTR</th><th style={{ textAlign: 'right' }}>Impressions</th>
                                        </tr></thead>
                                        <tbody>
                                            {[...rollups].reverse().map(r => {
                                                const ctr = r.impressions > 0 ? (r.clicks / r.impressions * 100) : 0;
                                                const isBest = bestMonth && r.monthEndDate === bestMonth.monthEndDate;
                                                return (
                                                    <tr key={r.monthEndDate} style={isBest ? { background: 'rgba(46,204,113,0.04)' } : undefined}>
                                                        <td style={{ fontWeight: 600 }}>
                                                            {fmtMonth(r.monthEndDate)}
                                                            {isBest && <span style={{ fontSize: '0.6rem', color: 'var(--success)', marginLeft: 6 }}>★ Best</span>}
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>{fmtAmt(r.spend)}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmtAmt(r.revenue)}</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                                                color: r.roas >= 8 ? 'var(--success)' : r.roas >= 5 ? 'var(--aw-gold)' : 'var(--danger)', fontWeight: 700,
                                                            }}>
                                                                {r.roas.toFixed(1)}x
                                                                {r.roas >= 8 ? <TrendingUp size={11} /> : ''}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>{r.orders}</td>
                                                        <td style={{ textAlign: 'right' }}>{fmtAmt(r.aov)}</td>
                                                        <td style={{ textAlign: 'right' }}>{fmtAmt(r.cpo)}</td>
                                                        <td style={{ textAlign: 'right' }}>{fmtK(r.clicks)}</td>
                                                        <td style={{ textAlign: 'right' }}>{fmtPct(ctr)}</td>
                                                        <td style={{ textAlign: 'right' }}>{fmtK(r.impressions)}</td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Totals / Averages row */}
                                            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--card-border)', background: 'var(--muted-bg)' }}>
                                                <td>Total / Avg</td>
                                                <td style={{ textAlign: 'right' }}>{fmtAmt(totalSpend)}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--success)' }}>{fmtAmt(totalRevenue)}</td>
                                                <td style={{ textAlign: 'right', color: avgROAS >= 5 ? 'var(--success)' : 'var(--danger)' }}>{avgROAS.toFixed(1)}x</td>
                                                <td style={{ textAlign: 'right' }}>{totalOrders}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtAmt(Math.round(avgAOV))}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtAmt(Math.round(avgCPO))}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtK(totalClicks)}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtPct(avgCTR)}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtK(totalImpressions)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ═══════ SECTION 6: PLATFORM METRICS TABLES ═══════ */}
                            {adMetrics.length > 0 && (
                                <div className="card" style={{ marginBottom: 24 }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Ad Platform Detail</h3>
                                    <div style={{ overflow: 'auto' }}>
                                        <table className="data-table">
                                            <thead><tr>
                                                <th>Month</th><th>Platform</th><th style={{ textAlign: 'right' }}>Spend</th>
                                                <th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>ROAS</th>
                                                <th style={{ textAlign: 'right' }}>Conversions</th>
                                                <th style={{ textAlign: 'right' }}>Reach</th><th style={{ textAlign: 'right' }}>CPM</th>
                                            </tr></thead>
                                            <tbody>{adMetrics.map(m => {
                                                const roas = m.spend > 0 ? m.revenue / m.spend : 0;
                                                return (
                                                    <tr key={m.id}>
                                                        <td style={{ fontWeight: 600 }}>{fmtMonth(m.monthEndDate)}</td>
                                                        <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{PLATFORM_ICONS[m.platform]} {PLATFORM_LABELS[m.platform] || m.platform}</span></td>
                                                        <td style={{ textAlign: 'right' }}>{fmtAmt(m.spend)}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtAmt(m.revenue)}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: roas >= 8 ? 'var(--success)' : roas >= 5 ? 'var(--aw-gold)' : 'var(--danger)' }}>{roas.toFixed(1)}x</td>
                                                        <td style={{ textAlign: 'right' }}>{m.conversions}</td>
                                                        <td style={{ textAlign: 'right' }}>{fmtK(m.reach)}</td>
                                                        <td style={{ textAlign: 'right' }}>{m.cpm.toFixed(2)}</td>
                                                    </tr>
                                                );
                                            })}</tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {ecomMetrics.length > 0 && (
                                <div className="card" style={{ marginBottom: 24 }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>E-commerce Detail</h3>
                                    <div style={{ overflow: 'auto' }}>
                                        <table className="data-table">
                                            <thead><tr>
                                                <th>Month</th><th>Platform</th>
                                                <th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Orders</th>
                                            </tr></thead>
                                            <tbody>{ecomMetrics.map(m => (
                                                <tr key={m.id}>
                                                    <td style={{ fontWeight: 600 }}>{fmtMonth(m.monthEndDate)}</td>
                                                    <td>{PLATFORM_ICONS[m.platform]} {PLATFORM_LABELS[m.platform] || m.platform}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmtAmt(m.revenue)}</td>
                                                    <td style={{ textAlign: 'right' }}>{m.orders}</td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ═══════ SECTION 7: CAMPAIGN LEADS & QUICK LINKS ═══════ */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                                <a href="/dashboard/campaign-leads" style={{ textDecoration: 'none' }}>
                                    <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease', borderLeft: '4px solid var(--aw-navy)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Campaign Leads</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>View All Leads</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
                                                    Track applications, manage status, log activities
                                                </div>
                                            </div>
                                            <ArrowRight size={20} style={{ color: 'var(--aw-navy)' }} />
                                        </div>
                                    </div>
                                </a>
                                <a href="/dashboard/leads" style={{ textDecoration: 'none' }}>
                                    <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease', borderLeft: '4px solid var(--aw-gold)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Unified CRM</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>Lead Pipeline</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
                                                    Internal pipeline + campaign leads in one view
                                                </div>
                                            </div>
                                            <ArrowRight size={20} style={{ color: 'var(--aw-gold)' }} />
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

// ═══════ COMPONENTS ═══════

function HeroKPI({ icon, label, value, unit, change, accent, invertChange }: {
    icon: React.ReactNode; label: string; value: string; unit?: string;
    change: string | null; accent: string; invertChange?: boolean;
}) {
    const isNeg = change && parseFloat(change) < 0;
    const isGood = invertChange ? isNeg : !isNeg;
    return (
        <div style={{
            padding: '18px 16px', borderRadius: 12, background: 'var(--card-bg)',
            border: '1px solid var(--card-border)', position: 'relative', overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: accent, borderRadius: '12px 12px 0 0',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 600, marginBottom: 6 }}>
                {icon} {label}
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 2 }}>
                {value}
                {unit && <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--muted)', marginLeft: 4 }}>{unit}</span>}
            </div>
            {change !== null && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 600,
                    color: isGood ? 'var(--success)' : 'var(--danger)',
                }}>
                    {isNeg ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                    {change}% vs prev
                </div>
            )}
        </div>
    );
}

function ScoreCard({ title, icon, items }: { title: string; icon: string; items: { label: string; value: string; highlight?: boolean }[] }) {
    return (
        <div className="card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1rem' }}>{icon}</span> {title}
            </div>
            {items.map((item, i) => (
                <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderTop: i > 0 ? '1px solid var(--card-border)' : 'none',
                }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{item.label}</span>
                    <span style={{
                        fontSize: '0.88rem', fontWeight: 700,
                        color: item.highlight ? 'var(--success)' : 'var(--foreground)',
                    }}>{item.value}</span>
                </div>
            ))}
        </div>
    );
}
