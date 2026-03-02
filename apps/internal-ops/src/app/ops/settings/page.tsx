'use client';
import { useAuth } from '@/contexts/AuthContext';
import { Settings as SettingsIcon, Shield, Key } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();

    return (
        <>
            <h1 className="page-title">Settings</h1>
            <p className="page-sub" style={{ marginBottom: 24 }}>System configuration</p>

            <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><Shield size={16} style={{ color: 'var(--aw-gold)' }} /><h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Account</h3></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={user?.email || ''} disabled /></div>
                    <div className="form-group"><label className="form-label">Role</label><input className="form-input" value="Admin" disabled /></div>
                    <div className="form-group"><label className="form-label">UID</label><input className="form-input" value={user?.uid || ''} disabled style={{ fontFamily: 'monospace', fontSize: '0.78rem' }} /></div>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><Key size={16} style={{ color: 'var(--aw-gold)' }} /><h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Services</h3></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                        { name: 'Firebase Auth', detail: 'Custom claims (admin/client)', status: 'connected' },
                        { name: 'Firestore', detail: 'eur3 Multi-Region', status: 'connected' },
                        { name: 'Resend', detail: 'hello@admireworks.com', status: 'connected' },
                        { name: 'Client Portal', detail: 'my.admireworks.com', status: 'connected' },
                    ].map(s => (
                        <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                            <div><div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.detail}</div></div>
                            <span className="status-pill status-active">{s.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
