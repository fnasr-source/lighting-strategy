import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

type SupportedRole = 'owner' | 'admin' | 'team' | 'client';
type PendingInviteRecord = {
  id: string;
  role?: string;
  linkedClientId?: string;
  linkedClientIds?: unknown[];
  createdAt?: { toDate?: () => Date } | string;
  expiresAt?: string;
};

const ROLE_PERMISSIONS: Record<SupportedRole, string[]> = {
  owner: [
    'clients:read', 'clients:write', 'invoices:read', 'invoices:write',
    'payments:read', 'payments:write', 'leads:read', 'leads:write',
    'proposals:read', 'proposals:write', 'reports:read', 'reports:write',
    'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
    'settings:read', 'settings:write', 'team:read', 'team:write',
    'billing:read', 'billing:write', 'scheduling:read', 'scheduling:write',
    'performance:read', 'performance:write',
  ],
  admin: [
    'clients:read', 'clients:write', 'invoices:read', 'invoices:write',
    'payments:read', 'payments:write', 'leads:read', 'leads:write',
    'proposals:read', 'proposals:write', 'reports:read', 'reports:write',
    'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
    'settings:read', 'team:read', 'team:write', 'scheduling:read', 'scheduling:write',
    'performance:read', 'performance:write',
  ],
  team: [
    'clients:read', 'invoices:read', 'reports:read', 'reports:write',
    'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
    'scheduling:read', 'scheduling:write', 'performance:read',
  ],
  client: [
    'invoices:read', 'payments:read', 'reports:read',
    'campaigns:read', 'communications:read', 'performance:read',
  ],
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);
    const email = String(decoded.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Authenticated email is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const existingProfileSnap = await db.collection('userProfiles').doc(decoded.uid).get();
    const existingProfile = existingProfileSnap.exists ? existingProfileSnap.data() : null;

    const inviteSnap = await db
      .collection('pendingInvites')
      .where('email', '==', email)
      .where('status', '==', 'pending')
      .limit(5)
      .get();

    const inviteDoc = inviteSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as PendingInviteRecord)
      .filter((invite) => !invite.expiresAt || new Date(invite.expiresAt).getTime() > Date.now())
      .sort((a, b) => String(b.createdAt?.toDate?.() || b.createdAt || '').localeCompare(String(a.createdAt?.toDate?.() || a.createdAt || '')))[0];

    if (!inviteDoc) {
      return NextResponse.json({ success: false, error: 'No pending invite found' }, { status: 404 });
    }

    const role = (inviteDoc.role || existingProfile?.role || 'client') as SupportedRole;
    const linkedClientIds = Array.isArray(inviteDoc.linkedClientIds)
      ? inviteDoc.linkedClientIds.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
      : (typeof inviteDoc.linkedClientId === 'string' && inviteDoc.linkedClientId ? [inviteDoc.linkedClientId] : []);

    const profilePayload: Record<string, unknown> = {
      uid: decoded.uid,
      email,
      displayName: decoded.name || existingProfile?.displayName || email,
      role,
      permissions: ROLE_PERMISSIONS[role],
      isActive: true,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (role === 'team') {
      profilePayload.assignedClients = linkedClientIds;
    }

    if (role === 'client') {
      profilePayload.linkedClientId = linkedClientIds[0] || '';
      profilePayload.linkedClientIds = linkedClientIds;
    }

    if (!existingProfileSnap.exists) {
      profilePayload.createdAt = new Date().toISOString();
    }

    await db.collection('userProfiles').doc(decoded.uid).set(profilePayload, { merge: true });
    await db.collection('pendingInvites').doc(inviteDoc.id).set(
      {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        acceptedByUid: decoded.uid,
      },
      { merge: true },
    );

    const profileSnap = await db.collection('userProfiles').doc(decoded.uid).get();
    return NextResponse.json({
      success: true,
      profile: {
        id: profileSnap.id,
        ...profileSnap.data(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to claim invite';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


