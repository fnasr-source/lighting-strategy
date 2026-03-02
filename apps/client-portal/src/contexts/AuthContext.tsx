'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    onIdTokenChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
    type UserProfile,
    type UserRole,
    type Permission,
    ROLE_PERMISSIONS,
    userProfilesService,
} from '@/lib/firestore';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    // Role checks
    isOwner: boolean;
    isAdmin: boolean;     // owner OR admin
    isTeam: boolean;      // owner OR admin OR team
    isClient: boolean;    // client role
    isInternal: boolean;  // owner OR admin OR team (not client)
    role: UserRole | null;
    // Permission checks
    hasPermission: (permission: Permission) => boolean;
    canAccessClient: (clientId: string) => boolean;
}

const googleProvider = new GoogleAuthProvider();

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signIn: async () => { },
    signInWithGoogle: async () => { },
    signOut: async () => { },
    isOwner: false,
    isAdmin: false,
    isTeam: false,
    isClient: false,
    isInternal: false,
    role: null,
    hasPermission: () => false,
    canAccessClient: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Load UserProfile from Firestore after Firebase Auth
    const loadProfile = async (firebaseUser: User) => {
        try {
            let p = await userProfilesService.getByUid(firebaseUser.uid);

            if (!p) {
                // First-time login: force token refresh for fresh custom claims
                const tokenResult = await firebaseUser.getIdTokenResult(true);
                const claimRole = tokenResult.claims.role as string | undefined;
                const claimClientId = tokenResult.claims.clientId as string | undefined;

                // Determine role: custom claims > email domain > default
                let role: UserRole;
                if (claimRole === 'owner') role = 'owner';
                else if (claimRole === 'admin') role = 'admin';
                else if (claimRole === 'team') role = 'team';
                else if (claimRole === 'client') role = 'client';
                else if (firebaseUser.email?.endsWith('@admireworks.com')) role = 'admin';
                else role = 'client';

                const newProfile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    displayName: firebaseUser.displayName || firebaseUser.email || 'User',
                    role,
                    permissions: ROLE_PERMISSIONS[role],
                    isActive: true,
                    ...(claimClientId ? { linkedClientId: claimClientId } : {}),
                };

                await userProfilesService.create(firebaseUser.uid, newProfile);
                p = { ...newProfile, id: firebaseUser.uid } as UserProfile;
            }

            // Update last login
            userProfilesService.update(firebaseUser.uid, {
                lastLoginAt: new Date().toISOString(),
                // Sync displayName/email from Firebase Auth
                email: firebaseUser.email || p.email,
                displayName: firebaseUser.displayName || p.displayName,
            }).catch(() => { }); // non-blocking

            setProfile(p);
            return p;
        } catch (e) {
            console.error('Error loading profile:', e);
            return null;
        }
    };

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                await loadProfile(firebaseUser);
            } else {
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const handleGoogleSignIn = async () => {
        await signInWithPopup(auth, googleProvider);
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    const role = profile?.role ?? null;
    const isOwner = role === 'owner';
    const isAdmin = role === 'owner' || role === 'admin';
    const isTeam = role === 'owner' || role === 'admin' || role === 'team';
    const isClient = role === 'client';
    const isInternal = !isClient && role !== null;

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                signIn,
                signInWithGoogle: handleGoogleSignIn,
                signOut,
                isOwner,
                isAdmin,
                isTeam,
                isClient,
                isInternal,
                role,
                hasPermission: (perm) => userProfilesService.hasPermission(profile, perm),
                canAccessClient: (clientId) => userProfilesService.canAccessClient(profile, clientId),
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
