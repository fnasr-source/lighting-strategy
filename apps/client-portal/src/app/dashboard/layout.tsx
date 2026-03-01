'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    FileText,
    CreditCard,
    Receipt,
    MessageSquare,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Users,
    Target,
    BookOpen,
} from 'lucide-react';

const clientNav = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    { label: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
    { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
    { label: 'Communications', href: '/dashboard/communications', icon: MessageSquare },
];

const adminNav = [
    { section: 'Operations' },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Clients', href: '/dashboard/clients', icon: Users },
    { label: 'Leads', href: '/dashboard/leads', icon: Target },
    { label: 'Proposals', href: '/dashboard/proposals', icon: FileText },
    { label: 'Strategies', href: '/dashboard/strategies', icon: BookOpen },
    { section: 'Finance' },
    { label: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
    { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
    { section: 'Reports' },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Reports', href: '/dashboard/reports', icon: FileText },
    { section: 'System' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, signOut, isAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!user) return null;

    const nav = isAdmin ? adminNav : clientNav;
    const initials = user.displayName
        ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase()
        : user.email?.substring(0, 2).toUpperCase() || 'U';

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                    position: 'fixed',
                    top: 16,
                    left: 16,
                    zIndex: 50,
                    display: 'none',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 8,
                    padding: 8,
                    cursor: 'pointer',
                    color: 'var(--foreground)',
                }}
                className="mobile-menu-btn"
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">AW</div>
                    <div className="sidebar-logo-text">Admireworks</div>
                </div>

                <nav className="sidebar-nav">
                    {nav.map((item, i) => {
                        if ('section' in item) {
                            return (
                                <div key={i} className="sidebar-section">
                                    {item.section}
                                </div>
                            );
                        }
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href!}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                {Icon && <Icon size={18} />}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.displayName || user.email}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                            {isAdmin ? 'Admin' : 'Client'}
                        </div>
                    </div>
                    <button
                        onClick={signOut}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
                        title="Sign Out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="main-content">
                {children}
            </main>

            <style jsx>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
        </>
    );
}
