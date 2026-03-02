'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            router.push('/ops');
        } catch {
            setError('Invalid credentials or not an admin account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 12, background: 'var(--aw-navy)', marginBottom: 12 }}>
                        <span style={{ color: 'var(--aw-gold)', fontWeight: 800, fontSize: 20 }}>AW</span>
                    </div>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4 }}>Internal Operations</h1>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Admin access only</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                    {error && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: 12 }}>{error}</div>}
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
