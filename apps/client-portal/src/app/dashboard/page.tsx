'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { clientsService, invoicesService, leadsService, proposalsService, type Client, type Invoice, type Lead, type Proposal } from '@/lib/firestore';
import type { AggregateIntelligenceResponse } from '@/lib/performance-intelligence/intelligence';
import type { DashboardIntelligenceResponse } from '@/lib/performance-intelligence/types';
import {
    BarChart3,
    CreditCard,
    Receipt,
    FileText,
    Users,
    Target,
    ArrowUpRight,
    TrendingUp,
    Loader2,
    Activity,
    DollarSign,
    Gauge,
    Zap,
} from 'lucide-react';
import Link from 'next/link';

// Admin widgets
import { ClientHealthTable, AggregatedTrendChart, ChannelDistributionChart, RiskOpportunityPanels, HealthScoreBadge } from './AdminPerformanceWidgets';

// Client widgets
import { PerformanceKPICards, ClientTrendChart, ChannelCards, FunnelVisualization, ClientQuickLinks } from './ClientPerformanceWidgets';

export default function DashboardPage() {
    const { isAdmin } = useAuth();
    return isAdmin ? <AdminDashboard /> : <ClientDashboard />;
}

// ── Admin Dashboard ─────────────────────────────────────

function AdminDashboard() {
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [aggregate, setAggregate] = useState<AggregateIntelligenceResponse | null>(null);
    const [perfLoading, setPerfLoading] = useState(true);

    useEffect(() => {
        const unsub1 = clientsService.subscribe(setClients);
        const unsub2 = invoicesService.subscribe(setInvoices);
        const unsub3 = leadsService.subscribe(setLeads);
        const unsub4 = proposalsService.subscribe(setProposals);
        return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
    }, []);

    useEffect(() => {
        setPerfLoading(true);
        fetch('/api/dashboard/intelligence-aggregate?currency=USD')
            .then((r) => r.json())
            .then((data) => {
                if (data.success) setAggregate(data);
            })
            .catch(() => { })
            .finally(() => setPerfLoading(false));
    }, []);

    const activeClients = clients.filter(c => c.status === 'active').length;
    const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalDue, 0);
    const openProposals = proposals.filter(p => ['ready', 'sent'].includes(p.status)).length;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Admireworks Performance Intelligence Center</p>
            </div>

            {/* Section 1: Performance KPIs */}
            {perfLoading ? (
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
                    <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Loading performance intelligence…</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : aggregate ? (
                <>
                    {/* Performance KPI Row */}
                    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                        <PerfKPICard
                            label="Total Ad Spend"
                            value={fmtCurrency(aggregate.totals.spend)}
                            icon={<DollarSign size={18} />}
                            color="#ef4444"
                        />
                        <PerfKPICard
                            label="Total Revenue"
                            value={fmtCurrency(aggregate.totals.value)}
                            icon={<TrendingUp size={18} />}
                            color="#16a34a"
                        />
                        <PerfKPICard
                            label="Blended ROAS"
                            value={`${aggregate.totals.blendedRoas.toFixed(2)}x`}
                            icon={<Target size={18} />}
                            color={aggregate.totals.blendedRoas >= 2 ? '#16a34a' : '#ca8a04'}
                        />
                        <PerfKPICard
                            label="Avg Health Score"
                            value={`${aggregate.totals.avgHealthScore}/100`}
                            icon={<Activity size={18} />}
                            badge={<HealthScoreBadge score={aggregate.totals.avgHealthScore} size="sm" />}
                            color={aggregate.totals.avgHealthScore >= 75 ? '#16a34a' : '#ca8a04'}
                        />
                        <PerfKPICard
                            label="Total Conversions"
                            value={fmtNumber(aggregate.totals.totalConversions)}
                            icon={<Zap size={18} />}
                            color="#7c3aed"
                        />
                        <PerfKPICard
                            label="Active Clients"
                            value={String(aggregate.totals.activeClients)}
                            icon={<Users size={18} />}
                            color="#001a70"
                        />
                    </div>
                </>
            ) : null}

            {/* Section 2: Business Operations KPIs */}
            <div className="kpi-grid" style={{ marginTop: aggregate ? 0 : undefined }}>
                <KPICard label="Active Clients" value={String(activeClients)} icon={<Users size={18} />} sub={`${clients.length} total`} />
                <KPICard label="Open Proposals" value={String(openProposals)} icon={<FileText size={18} />} sub={`${proposals.length} total`} />
                <KPICard label="Pending Invoices" value={String(pendingInvoices)} icon={<Receipt size={18} />} sub={`${invoices.length} total`} />
                <KPICard label="Pipeline Leads" value={String(leads.length)} icon={<Target size={18} />} sub="In pipeline" />
            </div>

            {/* Section 3: Performance Charts + Health Scoreboard */}
            {aggregate && (
                <>
                    {/* Trend Chart + Channel Distribution */}
                    <div className="dashboard-charts-grid">
                        <AggregatedTrendChart series={aggregate.series} currency={aggregate.currency} />
                        <ChannelDistributionChart channels={aggregate.channels} currency={aggregate.currency} />
                    </div>

                    {/* Client Health Scoreboard */}
                    <div style={{ marginTop: 20 }}>
                        <ClientHealthTable clients={aggregate.clients} currency={aggregate.currency} />
                    </div>

                    {/* Risks & Opportunities */}
                    <div style={{ marginTop: 20 }}>
                        <RiskOpportunityPanels risks={aggregate.topRisks} opportunities={aggregate.topOpportunities} />
                    </div>
                </>
            )}

            {/* Section 4: Recent Clients + Quick Actions */}
            <div className="dashboard-charts-grid" style={{ marginTop: 20 }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Clients</h3>
                        <Link href="/dashboard/clients" style={{ fontSize: '0.78rem', color: 'var(--aw-navy)', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
                    </div>
                    {clients.length === 0 ? (
                        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No clients yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {clients.slice(0, 5).map(c => (
                                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--card-border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.company} · {c.region}</div>
                                    </div>
                                    <span className={`status-pill status-${c.status === 'active' ? 'active' : 'pending'}`}>{c.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Quick Actions</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <QuickAction label="Add New Client" icon="👤" href="/dashboard/clients" />
                        <QuickAction label="Create Invoice" icon="🧾" href="/dashboard/invoices" />
                        <QuickAction label="Add Lead" icon="🎯" href="/dashboard/leads" />
                        <QuickAction label="Create Proposal" icon="📝" href="/dashboard/proposals" />
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Client Dashboard ────────────────────────────────────

function ClientDashboard() {
    const { user, profile } = useAuth();
    const [intelligence, setIntelligence] = useState<DashboardIntelligenceResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const clientId = profile?.linkedClientId;
        if (!clientId) {
            setLoading(false);
            return;
        }

        fetch(`/api/dashboard/intelligence?clientId=${clientId}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.success) setIntelligence(data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [profile?.linkedClientId]);

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Welcome{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</h1>
                <p className="page-subtitle">Your performance dashboard</p>
            </div>

            {loading ? (
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Loading your performance data…</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : intelligence ? (
                <>
                    {/* KPI Cards */}
                    <PerformanceKPICards data={intelligence} currency={intelligence.currency} />

                    {/* Trend + Channels */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                        <ClientTrendChart series={intelligence.series} currency={intelligence.currency} />
                        <ChannelCards channels={intelligence.channels} currency={intelligence.currency} />
                    </div>

                    {/* Funnel + Quick Links */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                        <FunnelVisualization funnel={intelligence.funnel} />
                        <ClientQuickLinks />
                    </div>
                </>
            ) : (
                <>
                    {/* No linked client — show getting started */}
                    <div className="kpi-grid">
                        <KPICard label="Open Invoices" value="—" icon={<Receipt size={18} />} sub="Pending" />
                        <KPICard label="Total Paid" value="—" icon={<CreditCard size={18} />} sub="All time" />
                        <KPICard label="Active Campaigns" value="—" icon={<BarChart3 size={18} />} sub="Running" />
                        <KPICard label="Reports" value="—" icon={<FileText size={18} />} sub="Available" />
                    </div>
                    <div className="card" style={{ marginTop: 20 }}>
                        <div className="empty-state" style={{ padding: '32px 0' }}>
                            <div className="empty-state-icon">🎯</div>
                            <div className="empty-state-title">Getting Started</div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                                {profile?.linkedClientId
                                    ? 'Your performance data is being set up. Check back soon.'
                                    : 'Your account is not yet linked to a client profile. Contact your account manager for access.'}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

// ── Shared Components ────────────────────────────────────

function KPICard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
    return (
        <div className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div className="kpi-label">{label}</div>
                <div style={{ color: 'var(--aw-gold)', opacity: 0.7 }}>{icon}</div>
            </div>
            <div className="kpi-value">{value}</div>
            {sub && <div className="kpi-trend" style={{ color: 'var(--muted)' }}>{sub}</div>}
        </div>
    );
}

function PerfKPICard({ label, value, icon, color, badge }: { label: string; value: string; icon: React.ReactNode; color: string; badge?: React.ReactNode }) {
    return (
        <div className="kpi-card" style={{ borderTop: `3px solid ${color}`, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div className="kpi-label">{label}</div>
                <div style={{ color, opacity: 0.7 }}>{icon}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="kpi-value" style={{ color }}>{value}</div>
                {badge}
            </div>
        </div>
    );
}

function QuickAction({ label, icon, href }: { label: string; icon: string; href: string }) {
    return (
        <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, background: 'var(--muted-bg)', textDecoration: 'none', color: 'var(--foreground)', fontSize: '0.85rem', fontWeight: 500 }}>
            <span>{icon}</span><span>{label}</span>
            <ArrowUpRight size={14} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
        </Link>
    );
}

// ── Formatters ──────────────────────────────────────────

function fmtCurrency(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
}

function fmtNumber(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
}
