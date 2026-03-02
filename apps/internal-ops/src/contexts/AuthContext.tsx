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
        return onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const token = await u.getIdTokenResult(true);
                setIsAdmin(token.claims.role === 'admin');
                setIsSuperAdmin(!!token.claims.superAdmin);
            } else {
                setIsAdmin(false);
                setIsSuperAdmin(false);
            }
            setLoading(false);
        });
    }, []);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async () => {
        await signInWithPopup(auth, googleProvider);
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
