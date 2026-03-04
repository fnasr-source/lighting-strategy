import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

function getBaseUrl(request: NextRequest): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL;
  if (envBase) return envBase;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function runForClient(baseUrl: string, clientId: string): Promise<{
  clientId: string;
  platformSync: 'ok' | 'error';
  socialSync: 'ok' | 'error';
  recommendations: 'ok' | 'error';
  errors: string[];
}> {
  const errors: string[] = [];

  let platformSync: 'ok' | 'error' = 'ok';
  let socialSync: 'ok' | 'error' = 'ok';
  let recommendations: 'ok' | 'error' = 'ok';

  const platformResp = await fetch(`${baseUrl}/api/sync/platforms?clientId=${clientId}&mode=hourly`, {
    method: 'POST',
  });
  if (!platformResp.ok) {
    platformSync = 'error';
    errors.push(`platform_sync_http_${platformResp.status}`);
  } else {
    const json = await platformResp.json();
    if (!json.success) {
      platformSync = 'error';
      errors.push(`platform_sync_${json.error || 'unknown'}`);
    }
  }

  const socialResp = await fetch(`${baseUrl}/api/sync/social-listening?clientId=${clientId}&days=14&limit=40`, {
    method: 'POST',
  });
  if (!socialResp.ok) {
    socialSync = 'error';
    errors.push(`social_sync_http_${socialResp.status}`);
  } else {
    const json = await socialResp.json();
    if (!json.success) {
      socialSync = 'error';
      errors.push(`social_sync_${json.error || 'unknown'}`);
    }
  }

  const recoResp = await fetch(`${baseUrl}/api/ai/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      granularity: 'daily',
    }),
  });
  if (!recoResp.ok) {
    recommendations = 'error';
    errors.push(`recommendations_http_${recoResp.status}`);
  } else {
    const json = await recoResp.json();
    if (!json.success) {
      recommendations = 'error';
      errors.push(`recommendations_${json.error || 'unknown'}`);
    }
  }

  return {
    clientId,
    platformSync,
    socialSync,
    recommendations,
    errors,
  };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'admireworks-cron-2026';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forceClient = searchParams.get('clientId');

    const db = getAdminDb();
    const baseUrl = getBaseUrl(request);

    let clientIds: string[] = [];

    if (forceClient) {
      clientIds = [forceClient];
    } else {
      const clientsSnap = await db.collection('clients').where('status', '==', 'active').get();
      clientIds = clientsSnap.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
        .filter((client: { id: string; isDemo?: boolean }) => !client.isDemo)
        .map((client: { id: string }) => client.id);
    }

    const runStartedAt = new Date().toISOString();
    const results: Array<Awaited<ReturnType<typeof runForClient>>> = [];

    for (const clientId of clientIds) {
      const result = await runForClient(baseUrl, clientId);
      results.push(result);
    }

    const runEndedAt = new Date().toISOString();
    const successCount = results.filter((item) => item.errors.length === 0).length;

    await db.collection('intelligenceCronRuns').add({
      runStartedAt,
      runEndedAt,
      baseUrl,
      totalClients: clientIds.length,
      successCount,
      failedCount: clientIds.length - successCount,
      results,
      mode: 'hourly',
      source: 'cron',
      createdAt: runEndedAt,
    });

    return NextResponse.json({
      success: true,
      runStartedAt,
      runEndedAt,
      totalClients: clientIds.length,
      successCount,
      failedCount: clientIds.length - successCount,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Intelligence cron sync failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
