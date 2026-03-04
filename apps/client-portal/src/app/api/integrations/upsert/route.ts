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
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    let decoded: { uid: string };
    try {
      const verified = await adminAuth.verifyIdToken(token);
      decoded = { uid: verified.uid };
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid auth token' }, { status: 401 });
    }

    const body = (await request.json()) as UpsertPayload;

    if (!body.clientId || !body.platform || !SUPPORTED.includes(body.platform)) {
      return NextResponse.json({ success: false, error: 'clientId and valid platform are required' }, { status: 400 });
    }

    const db = getAdminDb();
    const profileDoc = await db.collection('userProfiles').doc(decoded.uid).get();
    const role = profileDoc.data()?.role;
    if (!['owner', 'admin'].includes(role)) {
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
