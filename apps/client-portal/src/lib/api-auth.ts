import { adminAuth, adminDb } from '@/lib/firebase-admin';

export interface VerifiedApiUser {
  uid: string;
  email?: string;
  role?: string;
  linkedClientId?: string;
}

export async function verifyApiUser(authHeader: string | null | undefined): Promise<VerifiedApiUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    let role = (decoded as any).role as string | undefined;

    if (!role) {
      const profileSnap = await adminDb.collection('userProfiles').doc(decoded.uid).get();
      role = profileSnap.exists ? (profileSnap.data()?.role as string | undefined) : undefined;
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      role,
      linkedClientId: (decoded as any).clientId as string | undefined,
    };
  } catch {
    return null;
  }
}

export function isSchedulingManager(role?: string): boolean {
  return ['owner', 'admin', 'team'].includes(role || '');
}
