'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    type User,
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

interface AuthCtx {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    login: (e: string, p: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
    user: null, loading: true, isAdmin: false, isSuperAdmin: false,
    login: async () => { }, loginWithGoogle: async () => { }, logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                try {
                    const tokenResult = await u.getIdTokenResult();
                    setIsAdmin(tokenResult.claims.role === 'admin');
                    setIsSuperAdmin(!!tokenResult.claims.superAdmin);
                } catch (e) {
                    console.error('Error getting token:', e);
                    setIsAdmin(false);
                    setIsSuperAdmin(false);
                }
            } else {
                setIsAdmin(false);
                setIsSuperAdmin(false);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        // Force token refresh to get latest custom claims
        if (result.user) {
            const tokenResult = await result.user.getIdTokenResult(true);
            setIsAdmin(tokenResult.claims.role === 'admin');
            setIsSuperAdmin(!!tokenResult.claims.superAdmin);
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, isSuperAdmin, login, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
