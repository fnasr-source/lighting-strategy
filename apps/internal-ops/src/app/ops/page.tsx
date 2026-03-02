'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Users, FileText, FolderKanban, Zap } from 'lucide-react';

export default function OpsDashboard() {
    const [stats, setStats] = useState({ clients: 0, invoices: 0, threads: 0, automations: 0 });

    useEffect(() => {
        const unsubs = [
            onSnapshot(collection(db, 'clients'), s => setStats(p => ({ ...p, clients: s.size }))),
            onSnapshot(collection(db, 'invoices'), s => setStats(p => ({ ...p, invoices: s.size }))),
            onSnapshot(collection(db, 'workingThreads'), s => setStats(p => ({ ...p, threads: s.size }))),
            onSnapshot(collection(db, 'automations'), s => setStats(p => ({ ...p, automations: s.size }))),
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    return (
        <>
            <h1 className="page-title">Operations Dashboard</h1>
            <p className="page-sub" style={{ marginBottom: 24 }}>Internal ops overview</p>

            <div className="kpi-grid">
                <KPI icon={<Users size={18} />} label="Active Clients" value={stats.clients} />
                <KPI icon={<FileText size={18} />} label="Open Invoices" value={stats.invoices} />
                <KPI icon={<FolderKanban size={18} />} label="Working Threads" value={stats.threads} />
                <KPI icon={<Zap size={18} />} label="Automations" value={stats.automations} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card">
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16 }}>Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                            { label: 'Create Working Thread', href: '/ops/threads', icon: '📋' },
                            { label: 'Add Automation', href: '/ops/automations', icon: '⚡' },
                            { label: 'Update Knowledge Base', href: '/ops/knowledge', icon: '📖' },
                            { label: 'Draft Outreach', href: '/ops/outreach', icon: '📧' },
                        ].map(a => (
                            <a key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text)', fontSize: '0.85rem' }}>
                                <span>{a.icon}</span>{a.label}
                            </a>
                        ))}
                    </div>
                </div>
                <div className="card">
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16 }}>System Status</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { name: 'Firebase', status: 'operational' },
                            { name: 'Stripe Webhooks', status: 'operational' },
                            { name: 'Resend Email', status: 'operational' },
                            { name: 'Client Portal', status: 'operational' },
                        ].map(s => (
                            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.85rem' }}>{s.name}</span>
                                <span className="status-pill status-active">{s.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="kpi-label">{label}</span>
                <span style={{ color: 'var(--aw-gold)', opacity: 0.6 }}>{icon}</span>
            </div>
            <div className="kpi-value">{value}</div>
        </div>
    );
}
