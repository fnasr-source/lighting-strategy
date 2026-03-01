'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onIdTokenChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthUser extends User {
    role?: string;
    clientId?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    isAdmin: boolean;
    isClient: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => { },
    signOut: async () => { },
    isAdmin: false,
    isClient: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [claims, setClaims] = useState<{ role?: string; clientId?: string }>({});

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const tokenResult = await firebaseUser.getIdTokenResult();
                const customClaims = {
                    role: tokenResult.claims.role as string | undefined,
                    clientId: tokenResult.claims.clientId as string | undefined,
                };
                setClaims(customClaims);
                setUser(Object.assign(firebaseUser, customClaims));
            } else {
                setUser(null);
                setClaims({});
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                signIn,
                signOut,
                isAdmin: claims.role === 'admin',
                isClient: claims.role === 'client',
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
