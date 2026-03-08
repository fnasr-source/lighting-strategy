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

// ── Cached intelligence loader ─────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function loadCachedOrComputeIntelligence(params: {
  clientId: string;
  currency: string;
  businessType: 'ecommerce' | 'lead_gen' | 'hybrid' | 'saas';
  from?: string;
  to?: string;
  granularity: IntelligenceGranularity;
  view: IntelligenceView;
}): Promise<DashboardIntelligenceResponse> {
  const db = getAdminDb();
  const range = params.from && params.to ? { from: params.from, to: params.to } : defaultDateRange();
  const cacheKey = `${params.clientId}_${range.from}_${range.to}`;

  try {
    const cached = await db.collection('kpi_snapshots_daily').doc(cacheKey).get();
    if (cached.exists) {
      const data = cached.data()!;
      const generatedAt = typeof data.generatedAt === 'string' ? new Date(data.generatedAt).getTime() : 0;
      if (Date.now() - generatedAt < CACHE_TTL_MS) {
        return {
          success: true,
          clientId: params.clientId,
          from: range.from,
          to: range.to,
          granularity: params.granularity,
          view: params.view,
          currency: params.currency,
          attributionModel: 'canonical_last_click_7d',
          executive: data.executive ?? { healthScore: 0, spend: 0, value: 0, efficiencyIndex: 0, conversionEfficiency: 0, pacing: 0, topRisks: [], topOpportunities: [] },
          channels: data.channels ?? [],
          funnel: data.funnel ?? { impressions: 0, clicks: 0, sessions: 0, leads: 0, orders: 0, qualifiedLeads: 0, clickThroughRate: 0, conversionRate: 0 },
          social: data.social ?? { interactions: 0, unresolved: 0, negativeShare: 0, sentimentScore: 0, topTopics: [], slaBreaches: 0 },
          series: data.series ?? [],
          generatedAt: data.generatedAt,
        };
      }
    }
  } catch {
    // Cache miss — compute fresh
  }

  return buildDashboardIntelligence(params);
}

// ── Multi-client aggregation ───────────────────────────

export interface AggregateClientEntry {
  clientId: string;
  clientName: string;
  healthScore: number;
  healthGrade: string;
  spend: number;
  value: number;
  roas: number;
  conversions: number;
  topRisks: string[];
  topOpportunities: string[];
}

export interface AggregateIntelligenceResponse {
  success: boolean;
  from: string;
  to: string;
  currency: string;
  totals: {
    spend: number;
    value: number;
    blendedRoas: number;
    avgHealthScore: number;
    totalConversions: number;
    totalImpressions: number;
    totalClicks: number;
    totalLeads: number;
    activeClients: number;
  };
  clients: AggregateClientEntry[];
  channels: Array<{
    platform: string;
    spend: number;
    value: number;
    conversions: number;
    share: number;
    efficiency: number;
  }>;
  series: Array<{
    date: string;
    spend: number;
    value: number;
    conversions: number;
    roas: number;
  }>;
  topRisks: string[];
  topOpportunities: string[];
  generatedAt: string;
}

export async function loadAllClientsIntelligence(params: {
  currency: string;
  from?: string;
  to?: string;
}): Promise<AggregateIntelligenceResponse> {
  const db = getAdminDb();
  const range = params.from && params.to ? { from: params.from, to: params.to } : defaultDateRange();

  // Load all active clients
  const clientsSnap = await db.collection('clients').where('status', '==', 'active').get();
  const clients = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const clientEntries: AggregateClientEntry[] = [];
  const allChannels = new Map<string, { spend: number; value: number; conversions: number }>();
  const allSeries = new Map<string, { spend: number; value: number; conversions: number }>();
  let totalSpend = 0;
  let totalValue = 0;
  let totalConversions = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalLeads = 0;
  let healthScoreSum = 0;
  const allRisks: string[] = [];
  const allOpportunities: string[] = [];

  // Process each client (using cached data when available)
  const results = await Promise.allSettled(
    clients.map(async (client) => {
      const clientId = client.id;
      const businessType =
        (client as Record<string, unknown>).businessType === 'lead_gen' ||
          (client as Record<string, unknown>).businessType === 'hybrid' ||
          (client as Record<string, unknown>).businessType === 'saas'
          ? ((client as Record<string, unknown>).businessType as 'lead_gen' | 'hybrid' | 'saas')
          : 'ecommerce';

      const intel = await loadCachedOrComputeIntelligence({
        clientId,
        currency: params.currency,
        businessType,
        from: range.from,
        to: range.to,
        granularity: 'daily',
        view: 'executive',
      });

      return { clientId, clientName: (client as Record<string, unknown>).name as string || clientId, intel };
    }),
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { clientId, clientName, intel } = result.value;

    const spend = intel.executive.spend;
    const value = intel.executive.value;
    const roas = spend > 0 ? value / spend : 0;
    const healthScore = intel.executive.healthScore;

    clientEntries.push({
      clientId,
      clientName,
      healthScore,
      healthGrade: healthScore >= 85 ? 'A' : healthScore >= 75 ? 'B' : healthScore >= 65 ? 'C' : healthScore >= 50 ? 'D' : 'F',
      spend,
      value,
      roas,
      conversions: intel.funnel.leads + intel.funnel.orders,
      topRisks: intel.executive.topRisks,
      topOpportunities: intel.executive.topOpportunities,
    });

    totalSpend += spend;
    totalValue += value;
    totalConversions += intel.funnel.leads + intel.funnel.orders;
    totalImpressions += intel.funnel.impressions;
    totalClicks += intel.funnel.clicks;
    totalLeads += intel.funnel.leads;
    healthScoreSum += healthScore;

    allRisks.push(...intel.executive.topRisks.map((r) => `[${clientName}] ${r}`));
    allOpportunities.push(...intel.executive.topOpportunities.map((o) => `[${clientName}] ${o}`));

    for (const ch of intel.channels) {
      const existing = allChannels.get(ch.platform) ?? { spend: 0, value: 0, conversions: 0 };
      existing.spend += ch.spend;
      existing.value += ch.value;
      existing.conversions += ch.conversions;
      allChannels.set(ch.platform, existing);
    }

    for (const s of intel.series) {
      const existing = allSeries.get(s.date) ?? { spend: 0, value: 0, conversions: 0 };
      existing.spend += s.spend;
      existing.value += s.value;
      existing.conversions += s.conversions;
      allSeries.set(s.date, existing);
    }
  }

  const activeClients = clientEntries.length;
  const blendedRoas = totalSpend > 0 ? totalValue / totalSpend : 0;
  const avgHealthScore = activeClients > 0 ? Math.round(healthScoreSum / activeClients) : 0;

  const channelsArr = [...allChannels.entries()].map(([platform, data]) => ({
    platform,
    spend: data.spend,
    value: data.value,
    conversions: data.conversions,
    share: totalSpend > 0 ? data.spend / totalSpend : 0,
    efficiency: data.spend > 0 ? data.value / data.spend : 0,
  })).sort((a, b) => b.spend - a.spend);

  const seriesArr = [...allSeries.entries()]
    .map(([date, data]) => ({
      date,
      spend: Math.round(data.spend * 100) / 100,
      value: Math.round(data.value * 100) / 100,
      conversions: data.conversions,
      roas: data.spend > 0 ? data.value / data.spend : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  clientEntries.sort((a, b) => b.spend - a.spend);

  return {
    success: true,
    from: range.from,
    to: range.to,
    currency: params.currency,
    totals: {
      spend: totalSpend,
      value: totalValue,
      blendedRoas,
      avgHealthScore,
      totalConversions,
      totalImpressions,
      totalClicks,
      totalLeads,
      activeClients,
    },
    clients: clientEntries,
    channels: channelsArr,
    series: seriesArr,
    topRisks: allRisks.slice(0, 10),
    topOpportunities: allOpportunities.slice(0, 10),
    generatedAt: new Date().toISOString(),
  };
}
