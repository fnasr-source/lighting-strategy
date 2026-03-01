'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { clientsService, invoicesService, paymentsService, leadsService, proposalsService, type Client, type Invoice, type Lead, type Proposal } from '@/lib/firestore';
import {
    BarChart3,
    CreditCard,
    Receipt,
    FileText,
    Users,
    Target,
    ArrowUpRight,
    Clock,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const { isAdmin } = useAuth();
    return isAdmin ? <AdminDashboard /> : <ClientDashboard />;
}

function AdminDashboard() {
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);

    useEffect(() => {
        const unsub1 = clientsService.subscribe(setClients);
        const unsub2 = invoicesService.subscribe(setInvoices);
        const unsub3 = leadsService.subscribe(setLeads);
        const unsub4 = proposalsService.subscribe(setProposals);
        return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
    }, []);

    const activeClients = clients.filter(c => c.status === 'active').length;
    const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalDue, 0);
    const openProposals = proposals.filter(p => ['ready', 'sent'].includes(p.status)).length;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Admireworks Operations Overview</p>
            </div>

            <div className="kpi-grid">
                <KPICard label="Active Clients" value={String(activeClients)} icon={<Users size={18} />} sub={`${clients.length} total`} />
                <KPICard label="Open Proposals" value={String(openProposals)} icon={<FileText size={18} />} sub={`${proposals.length} total`} />
                <KPICard label="Pending Invoices" value={String(pendingInvoices)} icon={<Receipt size={18} />} sub={`${invoices.length} total`} />
                <KPICard label="Pipeline Leads" value={String(leads.length)} icon={<Target size={18} />} sub="In pipeline" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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

function ClientDashboard() {
    const { user } = useAuth();
    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Welcome{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</h1>
                <p className="page-subtitle">Your Admireworks client dashboard</p>
            </div>
            <div className="kpi-grid">
                <KPICard label="Open Invoices" value="—" icon={<Receipt size={18} />} sub="Pending" />
                <KPICard label="Total Paid" value="—" icon={<CreditCard size={18} />} sub="All time" />
                <KPICard label="Active Campaigns" value="—" icon={<BarChart3 size={18} />} sub="Running" />
                <KPICard label="Reports" value="—" icon={<FileText size={18} />} sub="Available" />
            </div>
            <div className="card">
                <div className="empty-state" style={{ padding: '32px 0' }}>
                    <div className="empty-state-icon">🎯</div>
                    <div className="empty-state-title">Getting Started</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Your updates will appear here.</p>
                </div>
            </div>
        </>
    );
}

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

function QuickAction({ label, icon, href }: { label: string; icon: string; href: string }) {
    return (
        <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, background: 'var(--muted-bg)', textDecoration: 'none', color: 'var(--foreground)', fontSize: '0.85rem', fontWeight: 500 }}>
            <span>{icon}</span><span>{label}</span>
            <ArrowUpRight size={14} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
        </Link>
    );
}
