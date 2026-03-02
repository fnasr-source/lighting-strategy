'use client';

import { useEffect, useState } from 'react';
import { clientsService, invoicesService, paymentsService, leadsService, proposalsService, type Client, type Invoice, type Payment, type Lead, type Proposal } from '@/lib/firestore';
import { BarChart3, TrendingUp, DollarSign, Users, FileText, Target } from 'lucide-react';

export default function AnalyticsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);

    useEffect(() => {
        const u1 = clientsService.subscribe(setClients);
        const u2 = invoicesService.subscribe(setInvoices);
        const u3 = paymentsService.subscribe(setPayments);
        const u4 = leadsService.subscribe(setLeads);
        const u5 = proposalsService.subscribe(setProposals);
        return () => { u1(); u2(); u3(); u4(); u5(); };
    }, []);

    const totalRevenue = payments.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0);
    const pendingRevenue = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.totalDue, 0);
    const activeClients = clients.filter(c => c.status === 'active').length;
    const conversionRate = proposals.length > 0 ? Math.round((proposals.filter(p => p.status === 'accepted').length / proposals.length) * 100) : 0;
    const leadConversion = leads.length > 0 ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100) : 0;

    // Regional breakdown
    const regions = clients.reduce((acc, c) => { acc[c.region] = (acc[c.region] || 0) + 1; return acc; }, {} as Record<string, number>);
    // Currency breakdown
    const currencies = invoices.reduce((acc, i) => { acc[i.currency] = (acc[i.currency] || 0) + i.totalDue; return acc; }, {} as Record<string, number>);

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">Cross-client performance metrics</p>
            </div>

            <div className="kpi-grid">
                <MetricCard label="Total Revenue" value={totalRevenue > 0 ? totalRevenue.toLocaleString() : '0'} icon={<DollarSign size={18} />} sub="All time collected" />
                <MetricCard label="Pending Revenue" value={pendingRevenue > 0 ? pendingRevenue.toLocaleString() : '0'} icon={<TrendingUp size={18} />} sub="Open invoices" />
                <MetricCard label="Active Clients" value={String(activeClients)} icon={<Users size={18} />} sub={`${clients.length} total`} />
                <MetricCard label="Proposal Win Rate" value={`${conversionRate}%`} icon={<FileText size={18} />} sub={`${proposals.length} total proposals`} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 4 }}>
                {/* Regional Distribution */}
                <div className="card">
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Client Distribution by Region</h3>
                    {Object.keys(regions).length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>No data yet</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {Object.entries(regions).sort(([, a], [, b]) => b - a).map(([region, count]) => (
                                <div key={region} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: 40 }}>{region}</span>
                                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--muted-bg)', overflow: 'hidden' }}>
                                        <div style={{ width: `${(count / clients.length) * 100}%`, height: '100%', background: 'var(--aw-navy)', borderRadius: 4 }} />
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', minWidth: 20 }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Revenue by Currency */}
                <div className="card">
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Revenue by Currency</h3>
                    {Object.keys(currencies).length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>No data yet</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {Object.entries(currencies).sort(([, a], [, b]) => b - a).map(([curr, amount]) => (
                                <div key={curr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--card-border)' }}>
                                    <span style={{ fontWeight: 600 }}>{curr}</span>
                                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pipeline Health */}
                <div className="card">
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Pipeline Health</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <PipelineStat label="Leads" total={leads.length} active={leads.filter(l => !['converted'].includes(l.status)).length} color="var(--aw-navy)" />
                        <PipelineStat label="Proposals" total={proposals.length} active={proposals.filter(p => ['ready', 'sent'].includes(p.status)).length} color="var(--aw-gold)" />
                        <PipelineStat label="Invoices" total={invoices.length} active={invoices.filter(i => i.status === 'pending').length} color="var(--aw-berry)" />
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="card">
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Conversion Funnel</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <FunnelStep label="Leads" count={leads.length} width={100} />
                        <FunnelStep label="Qualified" count={leads.filter(l => ['qualified', 'proposal_sent', 'converted'].includes(l.status)).length} width={leads.length ? (leads.filter(l => ['qualified', 'proposal_sent', 'converted'].includes(l.status)).length / leads.length) * 100 : 0} />
                        <FunnelStep label="Proposals Sent" count={proposals.filter(p => ['sent', 'accepted'].includes(p.status)).length} width={leads.length ? (proposals.filter(p => ['sent', 'accepted'].includes(p.status)).length / Math.max(leads.length, 1)) * 100 : 0} />
                        <FunnelStep label="Won" count={proposals.filter(p => p.status === 'accepted').length} width={leads.length ? (proposals.filter(p => p.status === 'accepted').length / Math.max(leads.length, 1)) * 100 : 0} />
                    </div>
                </div>
            </div>
        </>
    );
}

function MetricCard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
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

function PipelineStat({ label, total, active, color }: { label: string; total: number; active: number; color: string }) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{active} active / {total} total</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--muted-bg)', overflow: 'hidden' }}>
                <div style={{ width: total ? `${(active / total) * 100}%` : '0%', height: '100%', background: color, borderRadius: 3 }} />
            </div>
        </div>
    );
}

function FunnelStep({ label, count, width }: { label: string; count: number; width: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.78rem', minWidth: 100, color: 'var(--muted)' }}>{label}</span>
            <div style={{ flex: 1, height: 24, borderRadius: 4, background: 'var(--muted-bg)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(width, count > 0 ? 5 : 0)}%`, height: '100%', background: 'linear-gradient(90deg, var(--aw-navy), var(--aw-gold))', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                    {count > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>{count}</span>}
                </div>
            </div>
        </div>
    );
}
