import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import type { SupportedPlatform } from '@/lib/performance-intelligence/types';

type UpsertPayload = {
  connectionId?: string;
  clientId?: string;
  platform?: SupportedPlatform;
  credentials?: Record<string, string>;
  currency?: string;
  timezone?: string;
};

type DeletePayload = {
  connectionId?: string;
};

const SUPPORTED: SupportedPlatform[] = [
  'meta_ads',
  'google_ads',
  'tiktok_ads',
  'ga4',
  'shopify',
  'woocommerce',
  'meta_social',
];

function maskCredential(value: string): string {
  if (value.length <= 6) return '******';
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthorizedUser(request);
    if ('error' in authResult) return authResult.error;

    const { decoded } = authResult;
    const body = (await request.json()) as UpsertPayload;

    if (!body.clientId || !body.platform || !SUPPORTED.includes(body.platform)) {
      return NextResponse.json({ success: false, error: 'clientId and valid platform are required' }, { status: 400 });
    }

    const db = getAdminDb();
    const profileSnap = await db.collection('userProfiles').doc(decoded.uid).get();
    const profile = profileSnap.data() || {};
    if (!canManageClient(profile, body.clientId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const credentials = body.credentials || {};

    const key = `${body.clientId}_${body.platform}`;
    const integrationSecretsRef = db.collection('systemConfig').doc('integrationSecrets');

    const secretPayload: Record<string, unknown> = {
      ...credentials,
      updatedAt: new Date().toISOString(),
      key,
    };

    await integrationSecretsRef.set(
      {
        [key]: secretPayload,
      },
      { merge: true },
    );

    const maskedCredentials = Object.fromEntries(
      Object.entries(credentials).map(([field, value]) => [field, maskCredential(String(value))]),
    );

    const connectionPayload = {
      clientId: body.clientId,
      platform: body.platform,
      isConnected: true,
      credentialRef: {
        provider: 'firestore',
        key,
        version: Date.now(),
      },
      credentialsMasked: maskedCredentials,
      currency: body.currency || 'USD',
      timezone: body.timezone || 'UTC',
      updatedAt: new Date().toISOString(),
      lastError: null,
    };

    if (body.connectionId) {
      await db.collection('platformConnections').doc(body.connectionId).set(connectionPayload, { merge: true });
      return NextResponse.json({ success: true, id: body.connectionId, key });
    }

    const docRef = await db.collection('platformConnections').add({
      ...connectionPayload,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: docRef.id, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upsert integration';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthorizedUser(request);
    if ('error' in authResult) return authResult.error;

    const { decoded } = authResult;
    const body = (await request.json()) as DeletePayload;
    if (!body.connectionId) {
      return NextResponse.json({ success: false, error: 'connectionId is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const profileSnap = await db.collection('userProfiles').doc(decoded.uid).get();
    const profile = profileSnap.data() || {};

    const connectionSnap = await db.collection('platformConnections').doc(body.connectionId).get();
    if (!connectionSnap.exists) {
      return NextResponse.json({ success: false, error: 'Integration not found' }, { status: 404 });
    }

    const connection = connectionSnap.data() as { clientId?: string; platform?: string; credentialRef?: { key?: string } };
    const clientId = connection.clientId || '';
    if (!clientId || !canManageClient(profile, clientId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await db.collection('platformConnections').doc(body.connectionId).delete();
    if (connection.credentialRef?.key) {
      await db.collection('systemConfig').doc('integrationSecrets').set(
        { [connection.credentialRef.key]: null },
        { merge: true },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete integration';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

async function verifyAuthorizedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const adminAuth = getAdminAuth();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { decoded };
  } catch {
    return { error: NextResponse.json({ success: false, error: 'Invalid auth token' }, { status: 401 }) };
  }
}

function canManageClient(profile: Record<string, unknown>, clientId: string): boolean {
  const role = String(profile.role || '');
  if (role === 'owner' || role === 'admin') return true;
  if (role !== 'client') return false;

  const linkedClientIds = Array.isArray(profile.linkedClientIds)
    ? profile.linkedClientIds.filter((value): value is string => typeof value === 'string')
    : [];
  const linkedClientId = typeof profile.linkedClientId === 'string' ? profile.linkedClientId : '';
  return linkedClientIds.includes(clientId) || linkedClientId === clientId;
}
