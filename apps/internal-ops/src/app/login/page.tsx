'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { login, loginWithGoogle } = useAuth();
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

    const handleGoogle = async () => {
        setLoading(true);
        setError('');
        try {
            await loginWithGoogle();
            router.push('/ops');
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed');
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

                {/* Google Sign-In */}
                <button
                    onClick={handleGoogle}
                    disabled={loading}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        padding: '12px 20px', borderRadius: 8, border: '1px solid var(--border)',
                        background: '#fff', color: '#333', fontWeight: 600, fontSize: '0.88rem',
                        cursor: 'pointer', marginBottom: 20, transition: 'all 0.15s',
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                    Continue with Google
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 500 }}>or sign in with email</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
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
