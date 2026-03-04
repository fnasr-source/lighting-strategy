import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { buildDashboardIntelligence } from '@/lib/performance-intelligence/intelligence';
import { buildRecommendations } from '@/lib/performance-intelligence/recommendations';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      clientId?: string;
      from?: string;
      to?: string;
      kpiSnapshotId?: string;
      granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
    };

    if (!body.clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const clientDoc = await db.collection('clients').doc(body.clientId).get();
    if (!clientDoc.exists) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const client = clientDoc.data() || {};
    const currency = typeof client.baseCurrency === 'string' ? client.baseCurrency : 'USD';
    const businessType =
      client.businessType === 'lead_gen' || client.businessType === 'hybrid' || client.businessType === 'saas'
        ? client.businessType
        : 'ecommerce';

    const intelligence = await buildDashboardIntelligence({
      clientId: body.clientId,
      currency,
      businessType,
      from: body.from,
      to: body.to,
      granularity: body.granularity || 'daily',
      view: 'executive',
    });

    const kpiSnapshotId = body.kpiSnapshotId || `${body.clientId}_adhoc_${Date.now()}`;
    const recommendations = buildRecommendations({
      clientId: body.clientId,
      kpiSnapshotId,
      intelligence,
    });

    const batch = db.batch();
    for (const recommendation of recommendations) {
      const id = `${body.clientId}_${recommendation.category}_${recommendation.priority}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const payload = {
        ...recommendation,
        ...(recommendation.kpiSnapshotId ? { kpiSnapshotId: recommendation.kpiSnapshotId } : {}),
      };
      batch.set(db.collection('aiRecommendations').doc(id), payload, { merge: true });
    }
    await batch.commit();

    return NextResponse.json({
      success: true,
      clientId: body.clientId,
      recommendations,
      generatedAt: new Date().toISOString(),
      source: 'rules',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build recommendations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
