'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Settings as SettingsIcon, User, Shield, Bell, Key } from 'lucide-react';

export default function SettingsPage() {
    const { user, isAdmin } = useAuth();
    const [config, setConfig] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isAdmin) {
            getDoc(doc(db, 'systemConfig', 'settings')).then(snap => {
                if (snap.exists()) setConfig(snap.data());
            });
        }
    }, [isAdmin]);

    const saveConfig = async () => {
        if (!config) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'systemConfig', 'settings'), config);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Account & system configuration</p>
            </div>

            {/* Account Info */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <User size={18} style={{ color: 'var(--aw-navy)' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Account</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" value={user?.email || ''} disabled />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Display Name</label>
                        <input className="form-input" value={user?.displayName || user?.email || ''} disabled />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <input className="form-input" value={isAdmin ? 'Admin' : 'Client'} disabled />
                    </div>
                    <div className="form-group">
                        <label className="form-label">UID</label>
                        <input className="form-input" value={user?.uid || ''} disabled style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
                    </div>
                </div>
            </div>

            {/* System Config (Admin Only) */}
            {isAdmin && config && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Shield size={18} style={{ color: 'var(--aw-navy)' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>System Configuration</h3>
                        </div>
                        <button className="btn btn-primary" onClick={saveConfig} disabled={saving} style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Company Name</label>
                            <input className="form-input" value={config.companyName || ''} onChange={e => setConfig({ ...config, companyName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company Tagline</label>
                            <input className="form-input" value={config.companyTagline || ''} onChange={e => setConfig({ ...config, companyTagline: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company Email</label>
                            <input className="form-input" value={config.companyEmail || ''} onChange={e => setConfig({ ...config, companyEmail: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company Phone</label>
                            <input className="form-input" value={config.companyPhone || ''} onChange={e => setConfig({ ...config, companyPhone: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Company Address</label>
                        <input className="form-input" value={config.companyAddress || ''} onChange={e => setConfig({ ...config, companyAddress: e.target.value })} />
                    </div>
                </div>
            )}

            {/* Integrations */}
            {isAdmin && (
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <Key size={18} style={{ color: 'var(--aw-navy)' }} />
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Integrations</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <IntegrationRow name="Firebase Auth" status="connected" detail="Email/Password + Custom Claims" />
                        <IntegrationRow name="Firestore" status="connected" detail="eur3 (Europe Multi-Region)" />
                        <IntegrationRow name="Stripe" status="connected" detail="Live mode — Checkout Sessions + Webhooks" />
                        <IntegrationRow name="Resend" status="connected" detail="hello@admireworks.com — Invoice + Notification Emails" />
                    </div>
                </div>
            )}
        </>
    );
}

function IntegrationRow({ name, status, detail }: { name: string; status: 'connected' | 'disconnected'; detail: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--card-border)' }}>
            <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{detail}</div>
            </div>
            <span className={`status-pill status-${status === 'connected' ? 'paid' : 'overdue'}`}>{status}</span>
        </div>
    );
}
