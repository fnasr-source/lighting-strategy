import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { buildDashboardIntelligence } from '@/lib/performance-intelligence/intelligence';
import type { IntelligenceGranularity, IntelligenceView } from '@/lib/performance-intelligence/types';

const GRANULARITIES: IntelligenceGranularity[] = ['hourly', 'daily', 'weekly', 'monthly'];
const VIEWS: IntelligenceView[] = ['executive', 'channel', 'social', 'funnel'];

function coerceGranularity(value: string | null): IntelligenceGranularity {
  if (!value) return 'daily';
  return GRANULARITIES.includes(value as IntelligenceGranularity)
    ? (value as IntelligenceGranularity)
    : 'daily';
}

function coerceView(value: string | null): IntelligenceView {
  if (!value) return 'executive';
  return VIEWS.includes(value as IntelligenceView) ? (value as IntelligenceView) : 'executive';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const client = clientDoc.data() || {};
    const currency = typeof client.baseCurrency === 'string' ? client.baseCurrency : 'USD';
    const businessType =
      client.businessType === 'lead_gen' || client.businessType === 'hybrid' || client.businessType === 'saas'
        ? client.businessType
        : 'ecommerce';

    const response = await buildDashboardIntelligence({
      clientId,
      currency,
      businessType,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      granularity: coerceGranularity(searchParams.get('granularity')),
      view: coerceView(searchParams.get('view')),
    });

    await db.collection('kpi_snapshots_daily').doc(`${clientId}_${response.from}_${response.to}`).set(
      {
        clientId,
        timeframe: `${response.from}_${response.to}`,
        granularity: response.granularity,
        generatedAt: response.generatedAt,
        executive: response.executive,
        channels: response.channels,
        funnel: response.funnel,
        social: response.social,
        series: response.series,
        source: 'dashboard_intelligence_api',
      },
      { merge: true },
    );

    await db.collection('client_health_scores').doc(clientId).set(
      {
        clientId,
        score: response.executive.healthScore,
        topRisks: response.executive.topRisks,
        topOpportunities: response.executive.topOpportunities,
        generatedAt: response.generatedAt,
      },
      { merge: true },
    );

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build dashboard intelligence';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
