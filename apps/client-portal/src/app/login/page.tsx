'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { signIn } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">AW</div>
                    <div className="login-logo-text">Admireworks</div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 6 }}>
                        Welcome Back
                    </h2>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                        Sign in to access your dashboard
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '100%', marginTop: 8, padding: '12px 20px', fontSize: '0.95rem' }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <p style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                        Admireworks — Admirable Venture Services
                    </p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 4 }}>
                        Dubai, UAE · hello@admireworks.com
                    </p>
                </div>
            </div>
        </div>
    );
}
