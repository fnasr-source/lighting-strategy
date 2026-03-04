import type {
  BusinessType,
  CanonicalMetricRow,
  ClientHealthScore,
  KpiSnapshot,
  SupportedPlatform,
} from '@/lib/performance-intelligence/types';

const safeDiv = (a: number, b: number): number => (b > 0 ? a / b : 0);
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

export interface KpiComputeInput {
  clientId: string;
  currency: string;
  businessType: BusinessType;
  from: string;
  to: string;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  rows: CanonicalMetricRow[];
  socialSentimentScore?: number;
  unresolvedSocialCount?: number;
}

function bucketByDate(rows: CanonicalMetricRow[]): Map<string, CanonicalMetricRow[]> {
  const map = new Map<string, CanonicalMetricRow[]>();
  for (const row of rows) {
    const list = map.get(row.date) ?? [];
    list.push(row);
    map.set(row.date, list);
  }
  return map;
}

function aggregateRows(rows: CanonicalMetricRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.spend += row.spendNormalized;
      acc.value += row.revenueNormalized;
      acc.impressions += row.impressions;
      acc.clicks += row.clicks;
      acc.sessions += row.sessions;
      acc.leads += row.leads;
      acc.orders += row.orders;
      acc.conversions += row.conversions;
      acc.qualifiedLeads += row.qualifiedLeads;
      return acc;
    },
    {
      spend: 0,
      value: 0,
      impressions: 0,
      clicks: 0,
      sessions: 0,
      leads: 0,
      orders: 0,
      conversions: 0,
      qualifiedLeads: 0,
    },
  );
}

function getGrade(score: number): ClientHealthScore['grade'] {
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function computeKpis(input: KpiComputeInput): {
  snapshot: KpiSnapshot;
  health: ClientHealthScore;
} {
  const totals = aggregateRows(input.rows);
  const roas = safeDiv(totals.value, totals.spend);
  const cvr = safeDiv(totals.conversions, totals.clicks);
  const ctr = safeDiv(totals.clicks, totals.impressions);
  const pacing = clamp(roas * 12, 0, 120);
  const conversionEfficiency = clamp(cvr * 10000, 0, 100);
  const efficiencyIndex = clamp((roas * 30) + (ctr * 700), 0, 100);

  const socialSentiment = clamp(((input.socialSentimentScore ?? 0) + 1) * 50, 0, 100);
  const unresolvedPenalty = Math.min(20, (input.unresolvedSocialCount ?? 0) * 0.5);

  const healthScoreRaw =
    efficiencyIndex * 0.35 +
    conversionEfficiency * 0.25 +
    clamp(pacing, 0, 100) * 0.2 +
    socialSentiment * 0.1 +
    90 * 0.1 - unresolvedPenalty;

  const healthScore = clamp(Math.round(healthScoreRaw), 0, 100);

  const rowsByDate = bucketByDate(input.rows);
  const trendDates = [...rowsByDate.keys()].sort((a, b) => a.localeCompare(b));

  const trends = trendDates.map((date) => {
    const dayRows = rowsByDate.get(date) ?? [];
    const dayTotals = aggregateRows(dayRows);
    return {
      date,
      spend: Math.round(dayTotals.spend * 100) / 100,
      value: Math.round(dayTotals.value * 100) / 100,
      conversions: dayTotals.conversions,
      roas: safeDiv(dayTotals.value, dayTotals.spend),
      cvr: safeDiv(dayTotals.conversions, dayTotals.clicks),
    };
  });

  const byPlatform = new Map<SupportedPlatform, ReturnType<typeof aggregateRows>>();
  for (const row of input.rows) {
    const current = byPlatform.get(row.platform) ?? {
      spend: 0,
      value: 0,
      impressions: 0,
      clicks: 0,
      sessions: 0,
      leads: 0,
      orders: 0,
      conversions: 0,
      qualifiedLeads: 0,
    };

    current.spend += row.spendNormalized;
    current.value += row.revenueNormalized;
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.sessions += row.sessions;
    current.leads += row.leads;
    current.orders += row.orders;
    current.conversions += row.conversions;
    current.qualifiedLeads += row.qualifiedLeads;
    byPlatform.set(row.platform, current);
  }

  const channels = [...byPlatform.entries()].map(([platform, value]) => ({
    platform,
    spend: value.spend,
    value: value.value,
    conversions: value.conversions,
    share: safeDiv(value.spend, totals.spend),
    efficiency: safeDiv(value.value, value.spend),
  }));

  channels.sort((a, b) => b.spend - a.spend);

  const isLeadGen = input.businessType === 'lead_gen';
  const leads = isLeadGen ? totals.conversions : totals.leads;

  const snapshot: KpiSnapshot = {
    clientId: input.clientId,
    businessType: input.businessType,
    timeframe: `${input.from}_${input.to}`,
    granularity: input.granularity,
    attributionModel: 'canonical_last_click_7d',
    currency: input.currency,
    kpis: {
      spend: totals.spend,
      value: totals.value,
      efficiencyIndex,
      conversionEfficiency,
      pacing,
      healthScore,
      alertCount: Math.round((input.unresolvedSocialCount ?? 0) + (roas < 1.5 ? 2 : 0)),
      roas,
      merProxy: roas,
      cacProxy: safeDiv(totals.spend, totals.orders || totals.qualifiedLeads || totals.conversions),
      aov: safeDiv(totals.value, totals.orders),
      cvr,
      leads,
      cpl: safeDiv(totals.spend, leads),
      cpc: safeDiv(totals.spend, totals.clicks),
      costPerQualifiedLeadProxy: safeDiv(totals.spend, totals.qualifiedLeads),
    },
    trends,
    channels,
    funnel: {
      impressions: totals.impressions,
      clicks: totals.clicks,
      sessions: totals.sessions,
      leads: totals.leads,
      orders: totals.orders,
      qualifiedLeads: totals.qualifiedLeads,
    },
    generatedAt: new Date().toISOString(),
    source: 'computed',
  };

  const topRisks: string[] = [];
  const topOpportunities: string[] = [];

  if (roas < 1.8) topRisks.push('ROAS is below target threshold (1.8x).');
  if (cvr < 0.015) topRisks.push('Conversion rate is low versus internal benchmark.');
  if ((input.unresolvedSocialCount ?? 0) > 10) topRisks.push('Social unresolved conversations exceed SLA threshold.');

  if (roas >= 2.5) topOpportunities.push('Scale budget on high-ROAS channels with guardrails.');
  if (ctr >= 0.01) topOpportunities.push('Creative engagement is healthy; test landing-page velocity.');
  if ((input.socialSentimentScore ?? 0) > 0.2) topOpportunities.push('Positive sentiment supports expansion and referral programs.');

  const health: ClientHealthScore = {
    clientId: input.clientId,
    score: healthScore,
    grade: getGrade(healthScore),
    components: {
      efficiency: Math.round(efficiencyIndex),
      conversion: Math.round(conversionEfficiency),
      pacing: Math.round(clamp(pacing, 0, 100)),
      socialSentiment: Math.round(socialSentiment),
      dataFreshness: 90,
    },
    topRisks,
    topOpportunities,
    generatedAt: new Date().toISOString(),
  };

  return {
    snapshot,
    health,
  };
}
