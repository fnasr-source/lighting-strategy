import { getAdminDb } from '@/lib/firebase-admin';
import { normalizeCurrencyAmount } from '@/lib/performance-intelligence/fx';
import { computeKpis } from '@/lib/performance-intelligence/kpi';
import type {
  CanonicalMetricRow,
  DashboardIntelligenceResponse,
  IntelligenceGranularity,
  IntelligenceView,
  SocialInteraction,
} from '@/lib/performance-intelligence/types';

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export async function loadCanonicalRows(params: {
  clientId: string;
  from?: string;
  to?: string;
  preferredCurrency: string;
}): Promise<CanonicalMetricRow[]> {
  const db = getAdminDb();
  const range = params.from && params.to ? { from: params.from, to: params.to } : defaultDateRange();

  const dailySnap = await db
    .collection('dailyPlatformMetrics')
    .where('clientId', '==', params.clientId)
    .where('date', '>=', range.from)
    .where('date', '<=', range.to)
    .get();

  const normalized: CanonicalMetricRow[] = [];

  for (const doc of dailySnap.docs) {
    const row = doc.data();
    const nativeCurrency = typeof row.currency === 'string' ? row.currency : params.preferredCurrency;
    const spendNative = Number(row.spend || 0);
    const revenueNative = Number(row.revenue || 0);

    const spendNorm = await normalizeCurrencyAmount({
      amount: spendNative,
      fromCurrency: nativeCurrency,
      toCurrency: params.preferredCurrency,
      date: row.date,
    });

    const revNorm = await normalizeCurrencyAmount({
      amount: revenueNative,
      fromCurrency: nativeCurrency,
      toCurrency: params.preferredCurrency,
      date: row.date,
    });

    normalized.push({
      id: doc.id,
      clientId: params.clientId,
      platform: row.platform,
      platformType: row.platformType,
      date: row.date,
      timezone: typeof row.timezone === 'string' ? row.timezone : 'UTC',
      granularity: 'daily',
      attributionModel: 'canonical_last_click_7d',
      nativeCurrency,
      normalizedCurrency: params.preferredCurrency,
      fxRate: spendNorm.rate,
      spendNative,
      spendNormalized: spendNorm.normalized,
      revenueNative,
      revenueNormalized: revNorm.normalized,
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      sessions: Number(row.sessions || row.clicks || 0),
      leads: Number(row.leads || row.conversions || 0),
      orders: Number(row.orders || 0),
      conversions: Number(row.conversions || row.orders || 0),
      qualifiedLeads: Number(row.qualifiedLeads || 0),
      source: typeof row.source === 'string' ? row.source : 'platform_sync',
      updatedAt: typeof row.aggregatedAt === 'string' ? row.aggregatedAt : new Date().toISOString(),
    });
  }

  return normalized;
}

export async function loadSocialStats(params: {
  clientId: string;
  from: string;
  to: string;
}): Promise<{
  interactions: SocialInteraction[];
  unresolved: number;
  sentimentScore: number;
  negativeShare: number;
  topTopics: Array<{ topic: string; count: number }>;
  slaBreaches: number;
}> {
  const db = getAdminDb();

  const snap = await db
    .collection('fact_social_interaction')
    .where('clientId', '==', params.clientId)
    .where('occurredAt', '>=', `${params.from}T00:00:00.000Z`)
    .where('occurredAt', '<=', `${params.to}T23:59:59.999Z`)
    .get();

  const interactions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SocialInteraction));

  const unresolved = interactions.filter((item) => !item.isResolved).length;
  const sentimentScore = interactions.length > 0
    ? interactions.reduce((acc, item) => acc + item.sentimentScore, 0) / interactions.length
    : 0;
  const negativeShare = interactions.length > 0
    ? interactions.filter((item) => item.sentimentLabel === 'negative').length / interactions.length
    : 0;

  const topicCounts = new Map<string, number>();
  for (const item of interactions) {
    for (const topic of item.topics || ['general']) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const topTopics = [...topicCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const slaBreaches = interactions.filter((item) => item.severity === 'high' && !item.isResolved).length;

  return {
    interactions,
    unresolved,
    sentimentScore,
    negativeShare,
    topTopics,
    slaBreaches,
  };
}

export async function buildDashboardIntelligence(params: {
  clientId: string;
  currency: string;
  businessType: 'ecommerce' | 'lead_gen' | 'hybrid' | 'saas';
  from?: string;
  to?: string;
  granularity: IntelligenceGranularity;
  view: IntelligenceView;
}): Promise<DashboardIntelligenceResponse> {
  const range = params.from && params.to ? { from: params.from, to: params.to } : defaultDateRange();
  const rows = await loadCanonicalRows({
    clientId: params.clientId,
    from: range.from,
    to: range.to,
    preferredCurrency: params.currency,
  });

  const socialStats = await loadSocialStats({
    clientId: params.clientId,
    from: range.from,
    to: range.to,
  });

  const { snapshot, health } = computeKpis({
    clientId: params.clientId,
    currency: params.currency,
    businessType: params.businessType,
    from: range.from,
    to: range.to,
    granularity: params.granularity,
    rows,
    socialSentimentScore: socialStats.sentimentScore,
    unresolvedSocialCount: socialStats.unresolved,
  });

  const clickThroughRate = snapshot.funnel.impressions > 0 ? snapshot.funnel.clicks / snapshot.funnel.impressions : 0;
  const conversionNumerator = snapshot.funnel.orders > 0 ? snapshot.funnel.orders : snapshot.funnel.leads;
  const conversionRate = snapshot.funnel.clicks > 0 ? conversionNumerator / snapshot.funnel.clicks : 0;

  return {
    success: true,
    clientId: params.clientId,
    from: range.from,
    to: range.to,
    granularity: params.granularity,
    view: params.view,
    currency: params.currency,
    attributionModel: 'canonical_last_click_7d',
    executive: {
      healthScore: health.score,
      spend: snapshot.kpis.spend,
      value: snapshot.kpis.value,
      efficiencyIndex: snapshot.kpis.efficiencyIndex,
      conversionEfficiency: snapshot.kpis.conversionEfficiency,
      pacing: snapshot.kpis.pacing,
      topRisks: health.topRisks,
      topOpportunities: health.topOpportunities,
    },
    channels: snapshot.channels,
    funnel: {
      ...snapshot.funnel,
      clickThroughRate,
      conversionRate,
    },
    social: {
      interactions: socialStats.interactions.length,
      unresolved: socialStats.unresolved,
      negativeShare: socialStats.negativeShare,
      sentimentScore: socialStats.sentimentScore,
      topTopics: socialStats.topTopics,
      slaBreaches: socialStats.slaBreaches,
    },
    series: snapshot.trends,
    generatedAt: new Date().toISOString(),
  };
}
