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
    Zap,
    Globe,
    Shield,
    Wallet,
    CalendarClock,
    type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/lib/firestore';

/** A nav item can be a link or a section header */
type NavItem =
    | { section: string }
    | { label: string; href: string; icon: LucideIcon; permission?: Permission };

/** All nav items — filtered by permissions at render time */
const allNavItems: NavItem[] = [
    { section: 'Operations' },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Clients', href: '/dashboard/clients', icon: Users, permission: 'clients:read' },
    { label: 'Leads', href: '/dashboard/leads', icon: Target, permission: 'leads:read' },
    { label: 'Proposals', href: '/dashboard/proposals', icon: FileText, permission: 'proposals:read' },
    { section: 'Performance' },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, permission: 'performance:read' },
    { label: 'Campaigns', href: '/dashboard/campaigns', icon: Zap, permission: 'campaigns:read' },
    { label: 'Campaign Leads', href: '/dashboard/campaign-leads', icon: Target, permission: 'campaigns:read' },
    { label: 'Scheduling', href: '/dashboard/scheduling', icon: CalendarClock, permission: 'campaigns:read' },
    { label: 'Integrations', href: '/dashboard/integrations', icon: Globe, permission: 'campaigns:read' },
    { section: 'Finance' },
    { label: 'Invoices', href: '/dashboard/invoices', icon: Receipt, permission: 'invoices:read' },
    { label: 'Payments', href: '/dashboard/payments', icon: CreditCard, permission: 'payments:read' },
    { label: 'Billing', href: '/dashboard/billing', icon: Zap, permission: 'billing:read' },
    { label: 'Expenses', href: '/dashboard/expenses', icon: Wallet, permission: 'billing:read' },
    { section: 'Communication' },
    { label: 'Messages', href: '/dashboard/communications', icon: MessageSquare, permission: 'communications:read' },
    { section: 'Reports & Strategy' },
    { label: 'Reports', href: '/dashboard/reports', icon: FileText, permission: 'reports:read' },
    { label: 'Strategies', href: '/dashboard/strategies', icon: BookOpen, permission: 'reports:read' },
    { section: 'System' },
    { label: 'Team', href: '/dashboard/team', icon: Users, permission: 'team:read' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings:read' },
];

/** Client portal nav — simplified view */
const clientNavItems: NavItem[] = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Campaigns', href: '/dashboard/campaigns', icon: Zap },
    { label: 'Reports', href: '/dashboard/reports', icon: FileText },
    { label: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
    { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
    { label: 'Messages', href: '/dashboard/communications', icon: MessageSquare },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile, loading, signOut, isClient, hasPermission, role } = useAuth();
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

    // Build nav based on role
    const rawNav = isClient ? clientNavItems : allNavItems;
    const nav: NavItem[] = [];

    for (const item of rawNav) {
        if ('section' in item) {
            nav.push(item);
        } else {
            // Check permission
            if (item.permission && !hasPermission(item.permission)) {
                continue;
            }
            nav.push(item);
        }
    }

    // Remove trailing section headers and consecutive section headers
    const filteredNav: NavItem[] = [];
    for (let i = 0; i < nav.length; i++) {
        if ('section' in nav[i]) {
            // Check if next non-section item exists
            let hasChild = false;
            for (let j = i + 1; j < nav.length; j++) {
                if ('section' in nav[j]) break;
                hasChild = true;
                break;
            }
            if (hasChild) filteredNav.push(nav[i]);
        } else {
            filteredNav.push(nav[i]);
        }
    }

    const displayName = profile?.displayName || user.displayName || user.email || 'User';
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
    const roleLabel = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : role === 'team' ? 'Team' : 'Client';

    return (
        <>
            {/* Mobile top bar */}
            <div className="mobile-topbar">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="mobile-menu-btn"
                    aria-label="Toggle menu"
                >
                    {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                <div className="mobile-topbar-brand">
                    <div className="mobile-topbar-logo">AW</div>
                    <span className="mobile-topbar-title">Admireworks</span>
                </div>
            </div>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">AW</div>
                    <div className="sidebar-logo-text">Admireworks</div>
                </div>

                <nav className="sidebar-nav">
                    {filteredNav.map((item, i) => {
                        if ('section' in item) {
                            return (
                                <div key={i} className="sidebar-section">
                                    {item.section}
                                </div>
                            );
                        }
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                            (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
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
                            {displayName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Shield size={10} />
                            {roleLabel}
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

            {/* Backdrop overlay (mobile) */}
            {sidebarOpen && (
                <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Main content */}
            <main className="main-content">
                {children}
            </main>

        </>
    );
}
