'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    clientsService, monthlyRollupsService, monthlyMetricsService, platformConnectionsService,
    dailyMetricsService,
    type Client, type MonthlyClientRollup, type MonthlyPlatformMetric, type PlatformConnection,
    type DailyPlatformMetric,
} from '@/lib/firestore';
import { DailyTrendCharts, AdPlatformMetrics, RevenueSplitCards } from './DashboardCharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Eye, Globe,
    Zap, Target, Users, MousePointer, ArrowRight, ExternalLink, Activity, Percent,
    Sparkles, AlertTriangle, CheckCircle, Brain, RefreshCw,
} from 'lucide-react';

interface AIInsights {
    summary: string;
    health_score: number;
    wins: string[];
    alerts: { severity: string; message: string; metric?: string }[];
    recommendations: { priority: number; action: string; expected_impact: string; category: string }[];
    trends: Record<string, string>;
    benchmarks: Record<string, string>;
}

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
    const [syncing, setSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [allDailyMetrics, setAllDailyMetrics] = useState<DailyPlatformMetric[]>([]);

    useEffect(() => {
        const unsubs = [
            clientsService.subscribe(c => setClients(c)),
            monthlyRollupsService.subscribe(r => { setAllRollups(r); setDataLoaded(true); }),
            monthlyMetricsService.subscribe(setAllMetrics),
            platformConnectionsService.subscribe(setAllConnections),
            dailyMetricsService.subscribe(setAllDailyMetrics),
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

    // Trigger platform data sync
    const triggerSync = async (clientId?: string) => {
        if (syncing) return;
        setSyncing(true);
        setSyncError(null);
        try {
            const params = new URLSearchParams();
            if (clientId) params.set('clientId', clientId);
            params.set('months', '3');
            const resp = await fetch(`/api/sync/platforms?${params}`, { method: 'POST' });
            const json = await resp.json();
            if (json.success) {
                setLastSynced(new Date().toLocaleTimeString());
            } else {
                setSyncError(json.error || 'Sync failed');
            }
        } catch (err: any) {
            setSyncError(err.message);
        }
        setSyncing(false);
    };

    // Auto-sync on first load (background, non-blocking)
    useEffect(() => {
        if (dataLoaded && allConnections.length > 0 && !lastSynced) {
            triggerSync();
        }
    }, [dataLoaded, allConnections.length]);

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
    const selectedClientObj = clients.find(c => c.id === selectedClient);
    const selectedName = selectedClientObj?.name || '';
    const selectedCurrency = selectedClientObj?.baseCurrency || 'EGP';
    const businessType = selectedClientObj?.businessType || 'ecommerce';
    const isLeadGen = businessType === 'lead_gen';

    // Daily metrics for trend charts
    const dailyData = useMemo(() =>
        allDailyMetrics.filter(d => d.clientId === selectedClient)
            .sort((a, b) => a.date.localeCompare(b.date)),
        [allDailyMetrics, selectedClient]);

    // Aggregate ad revenue vs ecom revenue from platform metrics
    const totalAdRevenue = adMetrics.reduce((s, m) => s + m.revenue, 0);
    const totalAdConversions = adMetrics.reduce((s, m) => s + m.conversions, 0);
    const totalEcomRevenue = ecomMetrics.reduce((s, m) => s + m.revenue, 0);
    const totalEcomOrders = ecomMetrics.reduce((s, m) => s + m.orders, 0);

    // Daily aggregates for ad platform metrics cards
    const dailyTotals = useMemo(() => ({
        impressions: dailyData.reduce((s, d) => s + (d.impressions || 0), 0),
        clicks: dailyData.reduce((s, d) => s + (d.clicks || 0), 0),
        spend: dailyData.reduce((s, d) => s + (d.spend || 0), 0),
        conversions: dailyData.reduce((s, d) => s + (d.conversions || 0), 0),
        reach: dailyData.reduce((s, d) => s + (d.reach || 0), 0),
        linkClicks: dailyData.reduce((s, d) => s + (d.linkClicks || 0), 0),
    }), [dailyData]);
    const avgCPL = totalConversions > 0 ? totalSpend / totalConversions : 0;

    // AI Insights
    const fetchInsights = async () => {
        if (!selectedClient || aiLoading) return;
        setAiLoading(true);
        setAiError(null);
        try {
            const resp = await fetch(`/api/ai/insights?clientId=${selectedClient}`, { method: 'POST' });
            const json = await resp.json();
            if (json.success) {
                setAiInsights(json.insights);
            } else {
                setAiError(json.error || 'Failed to generate insights');
            }
        } catch (err: any) {
            setAiError(err.message);
        }
        setAiLoading(false);
    };

    // Reset AI when client changes
    useEffect(() => {
        setAiInsights(null);
        setAiError(null);
    }, [selectedClient]);

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
            {/* ═══════ DARK GRADIENT HERO HEADER ═══════ */}
            <div style={{
                background: 'linear-gradient(135deg, #001a70 0%, #0a1628 60%, #1a0a2e 100%)',
                borderRadius: 16, padding: '28px 28px 20px', marginBottom: 20, position: 'relative', overflow: 'hidden',
            }}>
                {/* Decorative elements */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(212,175,55,0.08)' }} />
                <div style={{ position: 'absolute', bottom: -20, left: '30%', width: 200, height: 60, borderRadius: '50%', background: 'rgba(52,152,219,0.06)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, position: 'relative', zIndex: 1 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                                📊 Campaign Performance
                            </h1>
                            {selectedName && (
                                <span style={{
                                    fontSize: '0.65rem', padding: '3px 10px', borderRadius: 20,
                                    background: isLeadGen ? 'rgba(155,89,182,0.25)' : 'rgba(46,204,113,0.2)',
                                    color: isLeadGen ? '#c39bd3' : '#82e0aa', fontWeight: 600, letterSpacing: '0.03em',
                                    textTransform: 'uppercase', border: `1px solid ${isLeadGen ? 'rgba(155,89,182,0.3)' : 'rgba(46,204,113,0.3)'}`,
                                }}>
                                    {isLeadGen ? '🎯 Lead Gen' : '🛒 E-commerce'}
                                </span>
                            )}
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                            {selectedName || 'Select a client'} — Unified analytics across all platforms
                            {lastSynced && <span style={{ color: '#82e0aa', marginLeft: 8 }}>✓ {lastSynced}</span>}
                            {syncing && <span style={{ color: '#85c1e9', marginLeft: 8 }}>⟳ Syncing...</span>}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {!isClient && (
                            <button onClick={() => triggerSync(selectedClient)} disabled={syncing} style={{
                                padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                                background: syncing ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(10px)', cursor: syncing ? 'wait' : 'pointer',
                                fontSize: '0.76rem', fontWeight: 600, color: '#fff',
                                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s ease',
                            }}>
                                <RefreshCw size={13} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} />
                                {syncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 3 }}>
                            {([['3m', '3M'], ['6m', '6M'], ['12m', '12M'], ['all', 'All']] as const).map(([key, label]) => (
                                <button key={key} onClick={() => setDateRange(key)} style={{
                                    padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                    fontSize: '0.72rem', fontWeight: dateRange === key ? 700 : 400,
                                    background: dateRange === key ? 'rgba(212,175,55,0.3)' : 'transparent',
                                    color: dateRange === key ? '#fff' : 'rgba(255,255,255,0.5)',
                                    transition: 'all 0.15s ease',
                                }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {syncError && <div style={{ padding: '10px 16px', marginBottom: 16, borderRadius: 10, background: 'rgba(231,76,60,0.08)', color: '#e74c3c', fontSize: '0.78rem', border: '1px solid rgba(231,76,60,0.15)' }}>⚠️ Sync error: {syncError}</div>}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.73rem', color: 'var(--muted)', fontWeight: 600 }}>
                            <Globe size={11} style={{ verticalAlign: 'middle' }} /> Platforms:
                        </span>
                        {connections.length === 0 ? (
                            <span style={{ fontSize: '0.73rem', padding: '4px 10px', borderRadius: 6, background: 'rgba(231,76,60,0.08)', color: '#e74c3c' }}>
                                No platforms connected — <a href="/dashboard/integrations" style={{ color: '#e74c3c', fontWeight: 600 }}>Connect now →</a>
                            </span>
                        ) : connections.map(c => {
                            const hasError = c.syncStatus === 'error';
                            const isSyncing = c.syncStatus === 'syncing';
                            const bg = hasError ? 'rgba(231,76,60,0.08)' : isSyncing ? 'rgba(52,152,219,0.08)' : 'rgba(46,204,113,0.08)';
                            const color = hasError ? '#e74c3c' : isSyncing ? '#3498db' : '#27ae60';
                            const icon = hasError ? '⚠' : isSyncing ? '⟳' : '✓';
                            return (
                                <span key={c.id} style={{
                                    fontSize: '0.7rem', padding: '4px 10px', borderRadius: 6,
                                    background: bg, color, fontWeight: 500,
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                }}>
                                    {PLATFORM_ICONS[c.platform] || '🔗'} {PLATFORM_LABELS[c.platform] || c.platform}
                                    {' '}{icon}
                                    {c.lastSync && <span style={{ opacity: 0.6, marginLeft: 2 }}>· {new Date(c.lastSync).toLocaleDateString()}</span>}
                                </span>
                            );
                        })}
                    </div>

                    {/* Connection Error Alerts */}
                    {connections.filter(c => c.syncStatus === 'error' && c.lastError).length > 0 && (
                        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {connections.filter(c => c.syncStatus === 'error' && c.lastError).map(c => (
                                <div key={`err-${c.id}`} style={{
                                    padding: '10px 14px', borderRadius: 8,
                                    background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.15)',
                                    display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.78rem',
                                }}>
                                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: 2 }}>
                                            {PLATFORM_LABELS[c.platform] || c.platform} — Connection Issue
                                        </div>
                                        <div style={{ color: '#7f8c8d', lineHeight: 1.5 }}>
                                            {c.lastError}
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: '#bdc3c7', marginTop: 4 }}>
                                            Last attempted: {c.lastSync ? new Date(c.lastSync).toLocaleString() : 'Never'}
                                            {' · '}<a href="/dashboard/integrations" style={{ color: '#3498db', fontWeight: 600 }}>Check credentials →</a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

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
                            {/* ═══════ AI INSIGHTS CARD ═══════ */}
                            <div style={{
                                marginBottom: 24, padding: '20px', borderRadius: 14,
                                background: 'linear-gradient(135deg, rgba(0,26,112,0.04) 0%, rgba(212,175,55,0.04) 100%)',
                                border: '1px solid rgba(0,26,112,0.1)',
                                backdropFilter: 'blur(10px)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiInsights ? 16 : 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Brain size={18} style={{ color: 'var(--aw-navy)' }} />
                                        <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>AI Performance Insights</span>
                                        <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(0,26,112,0.08)', color: 'var(--aw-navy)', fontWeight: 600 }}>Gemini 2.0</span>
                                    </div>
                                    <button onClick={fetchInsights} disabled={aiLoading} style={{
                                        padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(0,26,112,0.2)',
                                        background: aiLoading ? 'var(--muted-bg)' : 'rgba(0,26,112,0.05)',
                                        cursor: aiLoading ? 'wait' : 'pointer', fontSize: '0.74rem', fontWeight: 600,
                                        color: 'var(--aw-navy)', display: 'flex', alignItems: 'center', gap: 5,
                                    }}>
                                        {aiLoading ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</> : <><Sparkles size={12} /> {aiInsights ? 'Refresh' : 'Generate'} Insights</>}
                                    </button>
                                </div>
                                {aiError && <div style={{ fontSize: '0.78rem', color: '#e74c3c', padding: '8px 12px', background: 'rgba(231,76,60,0.06)', borderRadius: 8, marginBottom: 12 }}>⚠️ {aiError}</div>}
                                {aiInsights && (
                                    <div>
                                        {/* Health Score + Summary */}
                                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                                            <div style={{
                                                width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: `conic-gradient(${aiInsights.health_score >= 70 ? '#27ae60' : aiInsights.health_score >= 40 ? '#f39c12' : '#e74c3c'} ${aiInsights.health_score * 3.6}deg, var(--muted-bg) 0deg)`,
                                                flexShrink: 0, position: 'relative',
                                            }}>
                                                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }}>{aiInsights.health_score}</span>
                                                    <span style={{ fontSize: '0.5rem', color: 'var(--muted)' }}>Health</span>
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 200 }}>
                                                <p style={{ fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--foreground)', margin: 0 }}>{aiInsights.summary}</p>
                                            </div>
                                        </div>
                                        {/* Wins + Alerts + Recs grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                                            {/* Wins */}
                                            {aiInsights.wins.length > 0 && (
                                                <div style={{ padding: 14, borderRadius: 10, background: 'rgba(46,204,113,0.05)', border: '1px solid rgba(46,204,113,0.12)' }}>
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#27ae60', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Wins</div>
                                                    {aiInsights.wins.map((w, i) => <div key={i} style={{ fontSize: '0.76rem', padding: '4px 0', lineHeight: 1.5, color: 'var(--foreground)' }}>• {w}</div>)}
                                                </div>
                                            )}
                                            {/* Alerts */}
                                            {aiInsights.alerts.length > 0 && (
                                                <div style={{ padding: 14, borderRadius: 10, background: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.12)' }}>
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e74c3c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> Alerts</div>
                                                    {aiInsights.alerts.map((a, i) => <div key={i} style={{ fontSize: '0.76rem', padding: '4px 0', lineHeight: 1.5, color: 'var(--foreground)' }}>
                                                        <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4, background: a.severity === 'high' ? '#e74c3c' : a.severity === 'medium' ? '#f39c12' : '#95a5a6', color: '#fff', marginRight: 6 }}>{a.severity}</span>
                                                        {a.message}
                                                    </div>)}
                                                </div>
                                            )}
                                            {/* Recommendations */}
                                            {aiInsights.recommendations.length > 0 && (
                                                <div style={{ padding: 14, borderRadius: 10, background: 'rgba(0,26,112,0.04)', border: '1px solid rgba(0,26,112,0.1)' }}>
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--aw-navy)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles size={12} /> Recommendations</div>
                                                    {aiInsights.recommendations.slice(0, 3).map((r, i) => <div key={i} style={{ fontSize: '0.76rem', padding: '4px 0', lineHeight: 1.5 }}>
                                                        <span style={{ fontWeight: 700, color: 'var(--aw-navy)' }}>{i + 1}.</span> {r.action}
                                                        <div style={{ fontSize: '0.66rem', color: 'var(--muted)', marginTop: 1 }}>↳ {r.expected_impact}</div>
                                                    </div>)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ═══════ SECTION 1: HERO KPIs (ADAPTIVE) ═══════ */}
                            {latest && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                                    {isLeadGen ? (<>
                                        {/* Lead Gen KPIs */}
                                        <HeroKPI icon={<Users size={16} />} label="Leads" value={fmtAmt(latest.conversions)}
                                            change={prev ? pctChange(latest.conversions, prev.conversions) : null} accent="var(--aw-navy)" />
                                        <HeroKPI icon={<DollarSign size={16} />} label="CPL" value={fmtAmt(latest.conversions > 0 ? Math.round(latest.spend / latest.conversions) : 0)} unit={selectedCurrency}
                                            change={prev && prev.conversions > 0 ? pctChange(latest.spend / latest.conversions, prev.spend / prev.conversions) : null} accent="#e67e22" invertChange />
                                        <HeroKPI icon={<Percent size={16} />} label="Conv Rate" value={fmtPct(latest.clicks > 0 ? (latest.conversions / latest.clicks) * 100 : 0)}
                                            change={prev && prev.clicks > 0 ? pctChange(latest.conversions / latest.clicks, prev.conversions / prev.clicks) : null} accent="var(--success)" />
                                        <HeroKPI icon={<Zap size={16} />} label="Spend" value={fmtK(latest.spend)} unit={selectedCurrency}
                                            change={prev ? pctChange(latest.spend, prev.spend) : null} accent="#e74c3c" invertChange />
                                        <HeroKPI icon={<Eye size={16} />} label="Impressions" value={fmtK(latest.impressions)}
                                            change={prev ? pctChange(latest.impressions, prev.impressions) : null} accent="var(--muted)" />
                                        <HeroKPI icon={<MousePointer size={16} />} label="Clicks" value={fmtK(latest.clicks)}
                                            change={prev ? pctChange(latest.clicks, prev.clicks) : null} accent="#3498db" />
                                        <HeroKPI icon={<Target size={16} />} label="CPC" value={fmtAmt(latest.clicks > 0 ? Math.round(latest.spend / latest.clicks) : 0)} unit={selectedCurrency}
                                            change={prev && prev.clicks > 0 ? pctChange(latest.spend / latest.clicks, prev.spend / prev.clicks) : null} accent="#9b59b6" invertChange />
                                        <HeroKPI icon={<MousePointer size={16} />} label="CTR" value={fmtPct(latest.impressions > 0 ? (latest.clicks / latest.impressions) * 100 : 0)}
                                            change={prev && prev.impressions > 0 ? pctChange(latest.clicks / latest.impressions, prev.clicks / prev.impressions) : null} accent="#3498db" />
                                    </>) : (<>
                                        {/* E-commerce KPIs */}
                                        <HeroKPI icon={<DollarSign size={16} />} label="Revenue" value={fmtK(latest.revenue)} unit={selectedCurrency}
                                            change={prev ? pctChange(latest.revenue, prev.revenue) : null} accent="var(--success)" />
                                        <HeroKPI icon={<TrendingUp size={16} />} label="ROAS" value={`${latest.roas.toFixed(1)}x`}
                                            change={prev ? pctChange(latest.roas, prev.roas) : null}
                                            accent={latest.roas >= 8 ? 'var(--success)' : latest.roas >= 5 ? 'var(--aw-gold)' : 'var(--danger)'} />
                                        <HeroKPI icon={<ShoppingCart size={16} />} label="Orders" value={fmtAmt(latest.orders)}
                                            change={prev ? pctChange(latest.orders, prev.orders) : null} accent="var(--aw-navy)" />
                                        <HeroKPI icon={<Target size={16} />} label="AOV" value={fmtAmt(latest.aov)} unit={selectedCurrency}
                                            change={prev ? pctChange(latest.aov, prev.aov) : null} accent="var(--aw-navy)" />
                                        <HeroKPI icon={<Zap size={16} />} label="Spend" value={fmtK(latest.spend)} unit={selectedCurrency}
                                            change={prev ? pctChange(latest.spend, prev.spend) : null} accent="#e74c3c" invertChange />
                                        <HeroKPI icon={<DollarSign size={16} />} label="CPO" value={fmtAmt(latest.cpo)} unit={selectedCurrency}
                                            change={prev ? pctChange(latest.cpo, prev.cpo) : null} accent="#e67e22" invertChange />
                                        <HeroKPI icon={<Eye size={16} />} label="Impressions" value={fmtK(latest.impressions)}
                                            change={prev ? pctChange(latest.impressions, prev.impressions) : null} accent="var(--muted)" />
                                        <HeroKPI icon={<MousePointer size={16} />} label="CTR" value={fmtPct(latest.impressions > 0 ? (latest.clicks / latest.impressions) * 100 : 0)}
                                            change={prev && prev.impressions > 0 ? pctChange(latest.clicks / latest.impressions, prev.clicks / prev.impressions) : null} accent="#3498db" />
                                    </>)}
                                </div>
                            )}

                            {/* ═══════ CONVERSION FUNNEL ═══════ */}
                            {latest && (
                                <div style={{
                                    marginBottom: 24, padding: '20px 24px', borderRadius: 14,
                                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                }}>
                                    <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        🔀 Conversion Funnel
                                        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 400 }}>Latest Month</span>
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
                                        {(() => {
                                            const funnelSteps = isLeadGen
                                                ? [
                                                    { label: 'Impressions', value: latest.impressions, color: '#3498db' },
                                                    { label: 'Clicks', value: latest.clicks, color: '#2ecc71' },
                                                    { label: 'Leads', value: latest.conversions, color: '#9b59b6' },
                                                ]
                                                : [
                                                    { label: 'Impressions', value: latest.impressions, color: '#3498db' },
                                                    { label: 'Clicks', value: latest.clicks, color: '#2ecc71' },
                                                    { label: 'Orders', value: latest.orders, color: '#e67e22' },
                                                ];
                                            const maxVal = Math.max(...funnelSteps.map(s => s.value), 1);
                                            return funnelSteps.map((step, i) => {
                                                const widthPct = Math.max((step.value / maxVal) * 100, 15);
                                                const convRate = i > 0 && funnelSteps[i - 1].value > 0
                                                    ? ((step.value / funnelSteps[i - 1].value) * 100).toFixed(1)
                                                    : null;
                                                return (
                                                    <div key={step.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                                        {convRate && (
                                                            <div style={{
                                                                position: 'absolute', top: -4, left: -16, fontSize: '0.58rem',
                                                                background: 'var(--card-bg)', padding: '1px 6px', borderRadius: 8,
                                                                color: 'var(--muted)', fontWeight: 600, border: '1px solid var(--card-border)',
                                                                zIndex: 2,
                                                            }}>
                                                                {convRate}%
                                                            </div>
                                                        )}
                                                        <div style={{
                                                            width: `${widthPct}%`, minWidth: 60, height: 44, borderRadius: 8,
                                                            background: `linear-gradient(135deg, ${step.color}22, ${step.color}11)`,
                                                            border: `2px solid ${step.color}44`,
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'all 0.3s ease',
                                                        }}>
                                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: step.color }}>{fmtK(step.value)}</div>
                                                        </div>
                                                        <div style={{ fontSize: '0.64rem', color: 'var(--muted)', fontWeight: 600, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                            {step.label}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* ═══════ REVENUE & ORDERS SPLIT (Old Sections B & C) ═══════ */}
                            <RevenueSplitCards
                                adRevenue={totalAdRevenue}
                                ecomRevenue={totalEcomRevenue}
                                adConversions={totalAdConversions}
                                ecomOrders={totalEcomOrders}
                                currency={selectedCurrency}
                            />

                            {/* ═══════ DAILY TREND CHARTS (Old Charts 1-3) ═══════ */}
                            {dailyData.length > 0 && (
                                <DailyTrendCharts data={dailyData} currency={selectedCurrency} />
                            )}

                            {/* ═══════ AD PLATFORM METRICS (Old Section D — 7 cards) ═══════ */}
                            <AdPlatformMetrics
                                impressions={totalImpressions}
                                clicks={totalClicks}
                                spend={totalSpend}
                                conversions={totalConversions}
                                reach={dailyTotals.reach}
                                linkClicks={dailyTotals.linkClicks}
                                currency={selectedCurrency}
                            />

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

                            {/* ═══════ SECTION 3: EFFICIENCY SCORECARD (ADAPTIVE) ═══════ */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
                                <ScoreCard title="Traffic" icon="🌐" items={[
                                    { label: 'Total Impressions', value: fmtK(totalImpressions) },
                                    { label: 'Total Clicks', value: fmtK(totalClicks) },
                                    { label: 'Avg CTR', value: fmtPct(avgCTR), highlight: avgCTR > 2 },
                                ]} />
                                {isLeadGen ? (
                                    <ScoreCard title="Lead Generation" icon="🎯" items={[
                                        { label: 'Total Leads', value: fmtAmt(totalConversions) },
                                        { label: 'Avg CPL', value: `${fmtAmt(Math.round(avgCPL))} ${selectedCurrency}`, highlight: false },
                                        { label: 'Conv Rate', value: fmtPct(avgConvRate), highlight: avgConvRate > 3 },
                                    ]} />
                                ) : (
                                    <ScoreCard title="Conversion" icon="🎯" items={[
                                        { label: 'Total Conversions', value: fmtK(totalConversions) },
                                        { label: 'Total Orders', value: fmtAmt(totalOrders) },
                                        { label: 'Conv Rate', value: fmtPct(avgConvRate), highlight: avgConvRate > 3 },
                                    ]} />
                                )}
                                {isLeadGen ? (
                                    <ScoreCard title="Cost Efficiency" icon="💰" items={[
                                        { label: 'Total Spend', value: `${fmtK(totalSpend)} ${selectedCurrency}` },
                                        { label: 'Avg CPC', value: `${fmtAmt(totalClicks > 0 ? Math.round(totalSpend / totalClicks) : 0)} ${selectedCurrency}` },
                                        { label: 'Avg CPM', value: `${(totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0).toFixed(1)}` },
                                    ]} />
                                ) : (
                                    <ScoreCard title="Value" icon="💰" items={[
                                        { label: 'Total Revenue', value: `${fmtK(totalRevenue)} ${selectedCurrency}` },
                                        { label: 'Avg AOV', value: `${fmtAmt(Math.round(avgAOV))} ${selectedCurrency}` },
                                        { label: 'Overall ROAS', value: `${avgROAS.toFixed(1)}x`, highlight: avgROAS >= 5 },
                                    ]} />
                                )}
                                <ScoreCard title="Efficiency" icon="⚡" items={[
                                    { label: 'Total Spend', value: `${fmtK(totalSpend)} ${selectedCurrency}` },
                                    ...(isLeadGen ? [
                                        { label: 'Cost per Lead', value: `${fmtAmt(Math.round(avgCPL))} ${selectedCurrency}` },
                                        { label: 'Avg CPM', value: `${(totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0).toFixed(1)}` },
                                    ] : [
                                        { label: 'Avg CPO', value: `${fmtAmt(Math.round(avgCPO))} ${selectedCurrency}` },
                                        { label: 'Avg CPM', value: `${(totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0).toFixed(1)}`, highlight: false as boolean },
                                    ]),
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

function HeroKPI({ icon, label, value, unit, change, accent, invertChange }: {
    icon: React.ReactNode; label: string; value: string; unit?: string;
    change: string | null; accent: string; invertChange?: boolean;
}) {
    const isNeg = change && parseFloat(change) < 0;
    const isGood = invertChange ? isNeg : !isNeg;
    return (
        <div style={{
            padding: '20px 18px', borderRadius: 14, background: 'var(--card-bg)',
            border: '1px solid var(--card-border)', position: 'relative', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
        >
            {/* Gradient accent bar */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${accent}, ${accent}88)`,
                borderRadius: '14px 14px 0 0',
            }} />
            {/* Icon circle */}
            <div style={{
                width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${accent}15`, color: accent, marginBottom: 10,
            }}>
                {icon}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 4, letterSpacing: '-0.02em' }}>
                {value}
                {unit && <span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--muted)', marginLeft: 4 }}>{unit}</span>}
            </div>
            {change !== null && (
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 600,
                    padding: '2px 8px', borderRadius: 6,
                    background: isGood ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
                    color: isGood ? '#27ae60' : '#e74c3c',
                }}>
                    {isNeg ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                    {change}%
                </div>
            )}
        </div>
    );
}

function ScoreCard({ title, icon, items }: { title: string; icon: string; items: { label: string; value: string; highlight?: boolean }[] }) {
    return (
        <div style={{
            padding: '20px 18px', borderRadius: 14, background: 'var(--card-bg)',
            border: '1px solid var(--card-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
            <div style={{
                fontSize: '0.78rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
                paddingBottom: 10, borderBottom: '1px solid var(--card-border)',
            }}>
                <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                <span style={{ letterSpacing: '-0.01em' }}>{title}</span>
            </div>
            {items.map((item, i) => (
                <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{item.label}</span>
                    <span style={{
                        fontSize: '0.92rem', fontWeight: 700,
                        color: item.highlight ? '#27ae60' : 'var(--foreground)',
                    }}>{item.value}</span>
                </div>
            ))}
        </div>
    );
}
