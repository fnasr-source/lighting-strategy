'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';

interface AuthCtx {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    login: (e: string, p: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, isAdmin: false, login: async () => { }, logout: async () => { } });

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        return onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const token = await u.getIdTokenResult(true);
                setIsAdmin(token.claims.role === 'admin');
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        });
    }, []);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    return <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
