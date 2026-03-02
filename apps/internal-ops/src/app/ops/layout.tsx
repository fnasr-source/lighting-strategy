'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutDashboard, Users, FolderKanban, Zap, BookOpen, Settings, LogOut, FileText, Mail } from 'lucide-react';
import Link from 'next/link';

const navItems = [
    {
        section: 'OPERATIONS', items: [
            { href: '/ops', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/ops/team', label: 'Team', icon: Users },
            { href: '/ops/threads', label: 'Working Threads', icon: FolderKanban },
        ]
    },
    {
        section: 'TOOLS', items: [
            { href: '/ops/automations', label: 'Automations', icon: Zap },
            { href: '/ops/knowledge', label: 'Knowledge Base', icon: BookOpen },
            { href: '/ops/templates', label: 'Templates', icon: FileText },
            { href: '/ops/outreach', label: 'Outreach', icon: Mail },
        ]
    },
    {
        section: 'SYSTEM', items: [
            { href: '/ops/settings', label: 'Settings', icon: Settings },
        ]
    },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isAdmin, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) router.replace('/login');
    }, [user, loading, isAdmin, router]);

    if (loading || !user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span>Loading...</span></div>;

    return (
        <div>
            <div className="sidebar">
                <div className="sidebar-brand">
                    <div className="logo">AW</div>
                    <span>Internal Ops</span>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map(group => (
                        <div key={group.section}>
                            <div className="sidebar-section">{group.section}</div>
                            {group.items.map(item => (
                                <Link key={item.href} href={item.href} className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}>
                                    <item.icon size={16} /> {item.label}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>
                <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 12px', marginBottom: 4 }}>{user.email}</div>
                    <button onClick={() => { logout(); router.push('/login'); }} className="sidebar-link" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>
            <main className="main">{children}</main>
        </div>
    );
}
