import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

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
    let role = getStringClaim(decoded, 'role');

    if (!role) {
      const profileSnap = await adminDb.collection('userProfiles').doc(decoded.uid).get();
      role = profileSnap.exists ? (profileSnap.data()?.role as string | undefined) : undefined;
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      role,
      linkedClientId: getStringClaim(decoded, 'clientId'),
    };
  } catch {
    return null;
  }
}

function getStringClaim(decoded: DecodedIdToken, key: string): string | undefined {
  const value = decoded[key];
  return typeof value === 'string' ? value : undefined;
}

export function isSchedulingManager(role?: string): boolean {
  return ['owner', 'admin', 'team'].includes(role || '');
}
