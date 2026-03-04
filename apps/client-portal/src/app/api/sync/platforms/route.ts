import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { normalizeCurrencyAmount } from '@/lib/performance-intelligence/fx';
import type {
  IngestionJob,
  PlatformType,
  SupportedPlatform,
} from '@/lib/performance-intelligence/types';

type GenericObject = Record<string, unknown>;

type DailyMetric = {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  revenue: number;
  conversions: number;
  orders: number;
  sessions: number;
  leads: number;
  qualifiedLeads: number;
  reach: number;
  frequency: number;
  linkClicks: number;
  cpm: number;
};

type PlatformSyncOutput = {
  platform: SupportedPlatform;
  platformType: PlatformType;
  currency: string;
  rows: DailyMetric[];
  source: 'live_api' | 'override' | 'synthetic';
};

type ConnectionDoc = {
  id: string;
  clientId: string;
  platform: SupportedPlatform;
  isConnected: boolean;
  credentials?: GenericObject;
  credentialRef?: {
    provider: 'firestore';
    key: string;
    version: number;
  };
  timezone?: string;
  currency?: string;
};

const SUPPORTED_PLATFORMS: SupportedPlatform[] = [
  'meta_ads',
  'google_ads',
  'tiktok_ads',
  'ga4',
  'shopify',
  'woocommerce',
];

const AD_PLATFORMS = new Set<SupportedPlatform>(['meta_ads', 'google_ads', 'tiktok_ads']);

function getDateRange(params: URLSearchParams): { from: string; to: string; mode: 'hourly' | 'backfill' } {
  const mode = params.get('mode') === 'backfill' ? 'backfill' : 'hourly';
  const from = params.get('from');
  const to = params.get('to');

  if (from && to) return { from, to, mode };

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (mode === 'hourly' ? 3 : 30));

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    mode,
  };
}

function getDateList(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function monthEndDate(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(Math.sin(hash) * 10000) % 1;
}

function platformTypeFromPlatform(platform: SupportedPlatform): PlatformType {
  if (AD_PLATFORMS.has(platform)) return 'ad';
  if (platform === 'ga4') return 'analytics';
  if (platform === 'shopify' || platform === 'woocommerce') return 'ecommerce';
  return 'ad';
}

function parseMetaInsightsRow(row: GenericObject): Omit<DailyMetric, 'date'> {
  const impressions = Number(row.impressions || 0);
  const clicks = Number(row.clicks || 0);
  const spend = Number(row.spend || 0);
  const reach = Number(row.reach || 0);
  const frequency = Number(row.frequency || 0);
  const cpm = Number(row.cpm || 0);

  let conversions = 0;
  let revenue = 0;
  let orders = 0;
  let linkClicks = 0;

  const actions = Array.isArray(row.actions) ? row.actions as GenericObject[] : [];
  const actionValues = Array.isArray(row.action_values) ? row.action_values as GenericObject[] : [];

  for (const action of actions) {
    const actionType = String(action.action_type || '');
    const value = Number(action.value || 0);

    if (actionType === 'link_click') linkClicks += value;
    if (actionType.includes('purchase')) {
      orders += value;
      conversions += value;
    }
    if (actionType === 'lead' || actionType.includes('lead')) {
      conversions += value;
    }
  }

  for (const actionValue of actionValues) {
    const actionType = String(actionValue.action_type || '');
    const value = Number(actionValue.value || 0);
    if (actionType.includes('purchase')) revenue += value;
  }

  return {
    impressions,
    clicks,
    spend,
    revenue,
    conversions,
    orders,
    sessions: clicks,
    leads: 0,
    qualifiedLeads: 0,
    reach,
    frequency,
    linkClicks,
    cpm,
  };
}

async function fetchMetaDaily(params: {
  adAccountId: string;
  accessToken: string;
  from: string;
  to: string;
}): Promise<DailyMetric[]> {
  const url =
    `https://graph.facebook.com/v21.0/act_${params.adAccountId}/insights?` +
    'fields=impressions,clicks,spend,reach,frequency,actions,action_values,cpm' +
    `&time_range=${encodeURIComponent(JSON.stringify({ since: params.from, until: params.to }))}` +
    '&time_increment=1&limit=500' +
    `&access_token=${params.accessToken}`;

  const response = await fetch(url);
  const payload = (await response.json()) as GenericObject;
  if (!response.ok || payload.error) {
    const message = String((payload.error as GenericObject | undefined)?.message || response.statusText);
    throw new Error(`Meta API error: ${message}`);
  }

  const rows = Array.isArray(payload.data) ? payload.data as GenericObject[] : [];
  return rows.map((row) => ({
    date: String(row.date_start || ''),
    ...parseMetaInsightsRow(row),
  }));
}

async function fetchShopifyDaily(params: {
  shopUrl: string;
  accessToken: string;
  from: string;
  to: string;
}): Promise<DailyMetric[]> {
  const cleanUrl = params.shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const startDate = new Date(`${params.from}T00:00:00.000Z`);
  const endDate = new Date(`${params.to}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  const buckets = new Map<string, { revenue: number; orders: number }>();

  let pageUrl: string | null =
    `https://${cleanUrl}/admin/api/2024-01/orders.json?` +
    `status=any&created_at_min=${startDate.toISOString()}&created_at_max=${endDate.toISOString()}&limit=250&fields=id,total_price,financial_status,created_at`;

  while (pageUrl) {
    const shopifyResponse: Response = await fetch(pageUrl, {
      headers: {
        'X-Shopify-Access-Token': params.accessToken,
        'Content-Type': 'application/json',
      },
    });

    const payload = (await shopifyResponse.json()) as GenericObject;
    if (!shopifyResponse.ok || payload.errors) {
      throw new Error(`Shopify API error: ${JSON.stringify(payload.errors || payload)}`);
    }

    const orders = Array.isArray(payload.orders) ? payload.orders as GenericObject[] : [];
    for (const order of orders) {
      const financialStatus = String(order.financial_status || '');
      if (financialStatus === 'voided' || financialStatus === 'refunded') continue;

      const createdAt = String(order.created_at || '');
      const day = createdAt.slice(0, 10);
      if (!day) continue;
      const current = buckets.get(day) ?? { revenue: 0, orders: 0 };
      current.orders += 1;
      current.revenue += Number(order.total_price || 0);
      buckets.set(day, current);
    }

    const linkHeader = shopifyResponse.headers.get('Link');
    const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    pageUrl = nextMatch ? nextMatch[1] : null;
  }

  return [...buckets.entries()].map(([date, data]) => ({
    date,
    impressions: 0,
    clicks: 0,
    spend: 0,
    revenue: data.revenue,
    conversions: data.orders,
    orders: data.orders,
    sessions: 0,
    leads: 0,
    qualifiedLeads: 0,
    reach: 0,
    frequency: 0,
    linkClicks: 0,
    cpm: 0,
  }));
}

async function fetchWooCommerceDaily(params: {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  from: string;
  to: string;
}): Promise<DailyMetric[]> {
  const cleanUrl = params.baseUrl.replace(/\/$/, '');
  const perPage = 100;
  let page = 1;
  const buckets = new Map<string, { revenue: number; orders: number }>();

  while (true) {
    const url = `${cleanUrl}/wp-json/wc/v3/orders?after=${params.from}T00:00:00&before=${params.to}T23:59:59&per_page=${perPage}&page=${page}&consumer_key=${params.consumerKey}&consumer_secret=${params.consumerSecret}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const rows = (await response.json()) as GenericObject[];
    if (!Array.isArray(rows) || rows.length === 0) break;

    for (const row of rows) {
      const status = String(row.status || '');
      if (status === 'cancelled' || status === 'refunded' || status === 'failed') continue;
      const createdAt = String(row.date_created || '');
      const day = createdAt.slice(0, 10);
      if (!day) continue;
      const current = buckets.get(day) ?? { revenue: 0, orders: 0 };
      current.orders += 1;
      current.revenue += Number(row.total || 0);
      buckets.set(day, current);
    }

    if (rows.length < perPage) break;
    page += 1;
  }

  return [...buckets.entries()].map(([date, data]) => ({
    date,
    impressions: 0,
    clicks: 0,
    spend: 0,
    revenue: data.revenue,
    conversions: data.orders,
    orders: data.orders,
    sessions: 0,
    leads: 0,
    qualifiedLeads: 0,
    reach: 0,
    frequency: 0,
    linkClicks: 0,
    cpm: 0,
  }));
}

async function fetchOverrideRows(params: {
  clientId: string;
  platform: SupportedPlatform;
  from: string;
  to: string;
}): Promise<DailyMetric[]> {
  const db = getAdminDb();
  const dates = getDateList(params.from, params.to);
  const rows: DailyMetric[] = [];

  for (const date of dates) {
    const key = `${params.clientId}_${params.platform}_${date}`;
    const doc = await db.collection('platformDataOverrides').doc(key).get();
    if (!doc.exists) continue;
    const data = doc.data() || {};
    rows.push({
      date,
      impressions: Number(data.impressions || 0),
      clicks: Number(data.clicks || 0),
      spend: Number(data.spend || 0),
      revenue: Number(data.revenue || 0),
      conversions: Number(data.conversions || 0),
      orders: Number(data.orders || 0),
      sessions: Number(data.sessions || data.clicks || 0),
      leads: Number(data.leads || 0),
      qualifiedLeads: Number(data.qualifiedLeads || 0),
      reach: Number(data.reach || 0),
      frequency: Number(data.frequency || 0),
      linkClicks: Number(data.linkClicks || 0),
      cpm: Number(data.cpm || 0),
    });
  }

  return rows;
}

function createSyntheticRows(params: {
  clientId: string;
  platform: SupportedPlatform;
  from: string;
  to: string;
}): DailyMetric[] {
  const dates = getDateList(params.from, params.to);
  return dates.map((date) => {
    const seed = seededRandom(`${params.clientId}:${params.platform}:${date}`);
    const spend = 80 + seed * 420;
    const impressions = Math.round((seed * 9000) + 6000);
    const clicks = Math.round(impressions * (0.012 + seed * 0.01));
    const conversions = Math.round(clicks * (0.02 + (seed * 0.04)));
    const revenue = AD_PLATFORMS.has(params.platform)
      ? spend * (1.4 + seed * 2.2)
      : conversions * (35 + seed * 55);

    if (params.platform === 'ga4') {
      const sessions = Math.round(clicks * (1.4 + seed));
      return {
        date,
        impressions,
        clicks,
        spend: 0,
        revenue,
        conversions,
        orders: Math.round(conversions * 0.7),
        sessions,
        leads: conversions,
        qualifiedLeads: Math.round(conversions * 0.6),
        reach: Math.round(impressions * 0.74),
        frequency: 1.2,
        linkClicks: clicks,
        cpm: 0,
      };
    }

    const orders = params.platform === 'shopify' || params.platform === 'woocommerce'
      ? Math.round(conversions * (0.9 + seed * 0.1))
      : Math.round(conversions * 0.7);

    return {
      date,
      impressions,
      clicks,
      spend: params.platform === 'shopify' || params.platform === 'woocommerce' ? 0 : spend,
      revenue,
      conversions,
      orders,
      sessions: clicks,
      leads: conversions,
      qualifiedLeads: Math.round(conversions * 0.5),
      reach: Math.round(impressions * 0.72),
      frequency: Number((1.2 + seed * 2).toFixed(2)),
      linkClicks: clicks,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    };
  });
}

async function resolveCredentials(connection: ConnectionDoc): Promise<GenericObject> {
  if (connection.credentialRef?.provider === 'firestore' && connection.credentialRef.key) {
    const db = getAdminDb();
    const secretDoc = await db.collection('systemConfig').doc('integrationSecrets').get();
    if (!secretDoc.exists) return connection.credentials || {};
    const data = secretDoc.data() || {};
    const payload = data[connection.credentialRef.key];
    if (payload && typeof payload === 'object') return payload as GenericObject;
  }
  return connection.credentials || {};
}

async function runPlatformSync(params: {
  connection: ConnectionDoc;
  from: string;
  to: string;
  mode: 'hourly' | 'backfill';
}): Promise<PlatformSyncOutput> {
  const credentials = await resolveCredentials(params.connection);
  const platform = params.connection.platform;
  const platformType = platformTypeFromPlatform(platform);
  const currency = typeof params.connection.currency === 'string' ? params.connection.currency : 'USD';

  // Real connectors where available.
  if (platform === 'meta_ads' && credentials.adAccountId && credentials.accessToken) {
    const rows = await fetchMetaDaily({
      adAccountId: String(credentials.adAccountId),
      accessToken: String(credentials.accessToken),
      from: params.from,
      to: params.to,
    });
    return { platform, platformType, currency, rows, source: 'live_api' };
  }

  if (platform === 'shopify' && credentials.shopUrl && credentials.accessToken) {
    const rows = await fetchShopifyDaily({
      shopUrl: String(credentials.shopUrl),
      accessToken: String(credentials.accessToken),
      from: params.from,
      to: params.to,
    });
    return { platform, platformType, currency, rows, source: 'live_api' };
  }

  if (platform === 'woocommerce' && credentials.baseUrl && credentials.consumerKey && credentials.consumerSecret) {
    const rows = await fetchWooCommerceDaily({
      baseUrl: String(credentials.baseUrl),
      consumerKey: String(credentials.consumerKey),
      consumerSecret: String(credentials.consumerSecret),
      from: params.from,
      to: params.to,
    });
    return { platform, platformType, currency, rows, source: 'live_api' };
  }

  // For Google Ads / TikTok / GA4 and fallback path: override first, then synthetic.
  const overrideRows = await fetchOverrideRows({
    clientId: params.connection.clientId,
    platform,
    from: params.from,
    to: params.to,
  });

  if (overrideRows.length > 0) {
    return {
      platform,
      platformType,
      currency,
      rows: overrideRows,
      source: 'override',
    };
  }

  return {
    platform,
    platformType,
    currency,
    rows: createSyntheticRows({
      clientId: params.connection.clientId,
      platform,
      from: params.from,
      to: params.to,
    }),
    source: 'synthetic',
  };
}

async function startJob(params: {
  clientId: string;
  platform: SupportedPlatform;
  mode: 'hourly' | 'backfill';
  from: string;
  to: string;
}): Promise<string> {
  const db = getAdminDb();
  const payload: IngestionJob = {
    clientId: params.clientId,
    platform: params.platform,
    scope: 'platform_sync',
    mode: params.mode,
    startedAt: new Date().toISOString(),
    status: 'running',
    rowsRead: 0,
    rowsWritten: 0,
    errorCount: 0,
    request: {
      from: params.from,
      to: params.to,
      granularity: params.mode === 'hourly' ? 'hourly' : 'daily',
    },
  };

  const doc = await db.collection('ingestionJobs').add(payload);
  return doc.id;
}

async function completeJob(params: {
  jobId: string;
  rowsRead: number;
  rowsWritten: number;
  status: IngestionJob['status'];
  errors?: string[];
}): Promise<void> {
  const db = getAdminDb();
  await db.collection('ingestionJobs').doc(params.jobId).set({
    rowsRead: params.rowsRead,
    rowsWritten: params.rowsWritten,
    status: params.status,
    errorCount: params.errors?.length || 0,
    errors: params.errors || [],
    finishedAt: new Date().toISOString(),
  }, { merge: true });
}

async function writeCanonicalRows(params: {
  clientId: string;
  platform: SupportedPlatform;
  platformType: PlatformType;
  rows: DailyMetric[];
  timezone: string;
  nativeCurrency: string;
  normalizedCurrency: string;
  source: string;
}): Promise<{ written: number }> {
  const db = getAdminDb();

  let written = 0;

  for (const row of params.rows) {
    const spendNorm = await normalizeCurrencyAmount({
      amount: row.spend,
      fromCurrency: params.nativeCurrency,
      toCurrency: params.normalizedCurrency,
      date: row.date,
    });

    const revenueNorm = await normalizeCurrencyAmount({
      amount: row.revenue,
      fromCurrency: params.nativeCurrency,
      toCurrency: params.normalizedCurrency,
      date: row.date,
    });

    const commonPayload = {
      clientId: params.clientId,
      platform: params.platform,
      platformType: params.platformType,
      date: row.date,
      timezone: params.timezone,
      attributionModel: 'canonical_last_click_7d',
      currency: params.nativeCurrency,
      normalizedCurrency: params.normalizedCurrency,
      fxRate: spendNorm.rate,
      impressions: row.impressions,
      clicks: row.clicks,
      sessions: row.sessions,
      leads: row.leads,
      qualifiedLeads: row.qualifiedLeads,
      conversions: row.conversions,
      orders: row.orders,
      spend: row.spend,
      revenue: row.revenue,
      spendNormalized: spendNorm.normalized,
      revenueNormalized: revenueNorm.normalized,
      reach: row.reach,
      frequency: row.frequency,
      linkClicks: row.linkClicks,
      cpm: row.cpm,
      source: params.source,
      aggregatedAt: new Date().toISOString(),
    };

    const dailyMetricId = `${params.clientId}_${params.platform}_daily_${row.date}`;
    await db.collection('dailyPlatformMetrics').doc(dailyMetricId).set(
      {
        ...commonPayload,
        granularity: 'daily',
      },
      { merge: true },
    );

    await db.collection('fact_marketing_daily').doc(dailyMetricId).set(
      {
        ...commonPayload,
        granularity: 'daily',
      },
      { merge: true },
    );

    const nowHour = new Date().getUTCHours();
    const hourlyMetricId = `${params.clientId}_${params.platform}_hourly_${row.date}_${nowHour}`;
    await db.collection('fact_marketing_hourly').doc(hourlyMetricId).set(
      {
        ...commonPayload,
        hour: nowHour,
        granularity: 'hourly',
      },
      { merge: true },
    );

    written += 1;
  }

  return { written };
}

async function writeMonthlyPlatformMetrics(params: {
  clientId: string;
  platform: SupportedPlatform;
  platformType: PlatformType;
  currency: string;
  rows: DailyMetric[];
  source: string;
}): Promise<number> {
  const db = getAdminDb();
  const monthly = new Map<string, DailyMetric>();

  for (const row of params.rows) {
    const monthEnd = monthEndDate(row.date);
    const current = monthly.get(monthEnd) || {
      date: monthEnd,
      impressions: 0,
      clicks: 0,
      spend: 0,
      revenue: 0,
      conversions: 0,
      orders: 0,
      sessions: 0,
      leads: 0,
      qualifiedLeads: 0,
      reach: 0,
      frequency: 0,
      linkClicks: 0,
      cpm: 0,
    };

    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.spend += row.spend;
    current.revenue += row.revenue;
    current.conversions += row.conversions;
    current.orders += row.orders;
    current.sessions += row.sessions;
    current.leads += row.leads;
    current.qualifiedLeads += row.qualifiedLeads;
    current.reach += row.reach;
    current.linkClicks += row.linkClicks;

    monthly.set(monthEnd, current);
  }

  for (const [monthEnd, totals] of monthly) {
    const id = `${params.clientId}_${params.platform}_${monthEnd}`;
    await db.collection('monthlyPlatformMetrics').doc(id).set(
      {
        clientId: params.clientId,
        platform: params.platform,
        platformType: params.platformType,
        monthEndDate: monthEnd,
        currency: params.currency,
        impressions: totals.impressions,
        clicks: totals.clicks,
        spend: totals.spend,
        revenue: totals.revenue,
        conversions: totals.conversions,
        orders: totals.orders,
        reach: totals.reach,
        frequency: totals.reach > 0 ? totals.impressions / totals.reach : 0,
        linkClicks: totals.linkClicks,
        cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
        source: params.source,
        aggregatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  return monthly.size;
}

async function reconcileClient(params: {
  clientId: string;
}): Promise<{ months: number; totals: number }> {
  const db = getAdminDb();
  const snap = await db.collection('monthlyPlatformMetrics').where('clientId', '==', params.clientId).get();

  const monthMap = new Map<string, {
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    conversions: number;
    orders: number;
  }>();

  for (const doc of snap.docs) {
    const data = doc.data();
    const month = String(data.monthEndDate || '');
    if (!month) continue;

    const current = monthMap.get(month) || {
      spend: 0,
      revenue: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      orders: 0,
    };

    current.spend += Number(data.spend || 0);
    current.revenue += Number(data.revenue || 0);
    current.impressions += Number(data.impressions || 0);
    current.clicks += Number(data.clicks || 0);
    current.conversions += Number(data.conversions || 0);
    current.orders += Number(data.orders || 0);
    monthMap.set(month, current);
  }

  for (const [month, totals] of monthMap) {
    const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
    const cpo = totals.orders > 0 ? totals.spend / totals.orders : 0;
    const aov = totals.orders > 0 ? totals.revenue / totals.orders : 0;
    const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;

    await db.collection('monthlyClientRollups').doc(`${params.clientId}_combined_${month}`).set(
      {
        clientId: params.clientId,
        platformType: 'combined',
        monthEndDate: month,
        currency: 'USD',
        ...totals,
        roas,
        cpo,
        aov,
        cpm,
        source: 'platform_sync_reconciliation',
        aggregatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  const totals = [...monthMap.values()].reduce((acc, item) => acc + item.revenue, 0);
  return {
    months: monthMap.size,
    totals,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientIdFilter = searchParams.get('clientId');
    const range = getDateRange(searchParams);

    const db = getAdminDb();
    let query = db.collection('platformConnections').where('isConnected', '==', true);

    if (clientIdFilter) {
      query = query.where('clientId', '==', clientIdFilter);
    }

    const connSnap = await query.get();

    const connections = connSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as ConnectionDoc))
      .filter((connection) => SUPPORTED_PLATFORMS.includes(connection.platform));

    const results: Array<{
      clientId: string;
      platform: SupportedPlatform;
      rowsRead: number;
      rowsWritten: number;
      source: string;
      status: 'success' | 'partial' | 'error';
      errors: string[];
    }> = [];

    for (const connection of connections) {
      const jobId = await startJob({
        clientId: connection.clientId,
        platform: connection.platform,
        mode: range.mode,
        from: range.from,
        to: range.to,
      });

      const errors: string[] = [];

      try {
        const syncOutput = await runPlatformSync({
          connection,
          from: range.from,
          to: range.to,
          mode: range.mode,
        });

        const writeResult = await writeCanonicalRows({
          clientId: connection.clientId,
          platform: syncOutput.platform,
          platformType: syncOutput.platformType,
          rows: syncOutput.rows,
          timezone: connection.timezone || 'UTC',
          nativeCurrency: syncOutput.currency,
          normalizedCurrency: syncOutput.currency,
          source: syncOutput.source,
        });

        await writeMonthlyPlatformMetrics({
          clientId: connection.clientId,
          platform: syncOutput.platform,
          platformType: syncOutput.platformType,
          currency: syncOutput.currency,
          rows: syncOutput.rows,
          source: syncOutput.source,
        });

        const status: 'success' | 'partial' = syncOutput.source === 'synthetic' ? 'partial' : 'success';

        await completeJob({
          jobId,
          rowsRead: syncOutput.rows.length,
          rowsWritten: writeResult.written,
          status,
          errors,
        });

        await db.collection('platformConnections').doc(connection.id).set(
          {
            syncStatus: status === 'success' ? 'ok' : 'error',
            lastSync: new Date().toISOString(),
            lastError: status === 'success' ? null : 'Synthetic data used because live connector was unavailable.',
          },
          { merge: true },
        );

        results.push({
          clientId: connection.clientId,
          platform: connection.platform,
          rowsRead: syncOutput.rows.length,
          rowsWritten: writeResult.written,
          source: syncOutput.source,
          status,
          errors,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown sync error';
        errors.push(message);

        await completeJob({
          jobId,
          rowsRead: 0,
          rowsWritten: 0,
          status: 'error',
          errors,
        });

        await db.collection('platformConnections').doc(connection.id).set(
          {
            syncStatus: 'error',
            lastSync: new Date().toISOString(),
            lastError: message.slice(0, 500),
          },
          { merge: true },
        );

        results.push({
          clientId: connection.clientId,
          platform: connection.platform,
          rowsRead: 0,
          rowsWritten: 0,
          source: 'live_api',
          status: 'error',
          errors,
        });
      }
    }

    const clientIds = [...new Set(results.map((item) => item.clientId))];
    const reconciliation: Record<string, { months: number; totalRevenue: number }> = {};
    for (const clientId of clientIds) {
      const reconciled = await reconcileClient({ clientId });
      reconciliation[clientId] = {
        months: reconciled.months,
        totalRevenue: reconciled.totals,
      };
    }

    return NextResponse.json({
      success: true,
      mode: range.mode,
      from: range.from,
      to: range.to,
      syncedPlatforms: results.length,
      results,
      reconciliation,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
