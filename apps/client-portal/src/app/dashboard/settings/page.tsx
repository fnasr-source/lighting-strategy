'use client';

import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
    const { user, isAdmin } = useAuth();

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">
                    {isAdmin ? 'System configuration and user management' : 'Account settings'}
                </p>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Account</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Email</span>
                    <span>{user?.email}</span>
                    <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Name</span>
                    <span>{user?.displayName || '—'}</span>
                    <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Role</span>
                    <span>
                        <span className={`status-pill ${isAdmin ? 'status-active' : 'status-pending'}`}>
                            {isAdmin ? 'Admin' : 'Client'}
                        </span>
                    </span>
                </div>
            </div>

            {isAdmin && (
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>System</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Platform</span>
                        <span>Admireworks Unified Platform</span>
                        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Firebase</span>
                        <span>admireworks---internal-os</span>
                        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Region</span>
                        <span>Europe (eur3)</span>
                    </div>
                </div>
            )}
        </>
    );
}
