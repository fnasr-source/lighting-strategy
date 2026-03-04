import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function initAdmin() {
  if (getApps().length > 0) return;

  const candidates = ['service-account-key.json', 'service-account.json'];
  for (const file of candidates) {
    try {
      const raw = readFileSync(join(__dirname, file), 'utf8');
      const serviceAccount = JSON.parse(raw);
      initializeApp({ credential: cert(serviceAccount) });
      return;
    } catch {
      // continue
    }
  }

  throw new Error('No Firebase service account file found in firebase/');
}

function seededRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(Math.sin(hash) * 10000) % 1;
}

function daysAgoISO(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function monthEnd(dateIso) {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

function buildDay(clientId, platform, dateIso) {
  const seed = seededRandom(`${clientId}:${platform}:${dateIso}`);
  const impressions = Math.round(12000 + seed * 28000);
  const clicks = Math.round(impressions * (0.012 + seed * 0.012));
  const spend = platform === 'shopify' || platform === 'woocommerce' || platform === 'ga4'
    ? 0
    : Number((150 + seed * 950).toFixed(2));
  const conversions = Math.round(clicks * (0.018 + seed * 0.03));
  const orders = platform === 'lead_gen' ? 0 : Math.round(conversions * (0.75 + seed * 0.2));
  const revenue = platform === 'ga4'
    ? Number((conversions * (55 + seed * 70)).toFixed(2))
    : Number(((spend * (2.2 + seed * 2.6)) + orders * 7).toFixed(2));

  return {
    date: dateIso,
    impressions,
    clicks,
    spend,
    revenue,
    conversions,
    orders,
    sessions: Math.round(clicks * (1.1 + seed * 0.4)),
    leads: conversions,
    qualifiedLeads: Math.round(conversions * (0.45 + seed * 0.3)),
    reach: Math.round(impressions * (0.68 + seed * 0.12)),
    frequency: Number((1.1 + seed * 2.1).toFixed(2)),
    linkClicks: clicks,
    cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0,
  };
}

function aggregateMonth(rows) {
  return rows.reduce((acc, row) => {
    acc.impressions += row.impressions;
    acc.clicks += row.clicks;
    acc.spend += row.spend;
    acc.revenue += row.revenue;
    acc.conversions += row.conversions;
    acc.orders += row.orders;
    acc.reach += row.reach;
    acc.linkClicks += row.linkClicks;
    return acc;
  }, {
    impressions: 0,
    clicks: 0,
    spend: 0,
    revenue: 0,
    conversions: 0,
    orders: 0,
    reach: 0,
    linkClicks: 0,
  });
}

async function upsertDemoClient(db) {
  const demoId = 'aw-intelligence-demo';
  await db.collection('clients').doc(demoId).set({
    name: 'AW Intelligence Demo',
    company: 'Admireworks Demo Labs',
    region: 'AE',
    baseCurrency: 'AED',
    status: 'active',
    businessType: 'hybrid',
    industry: 'retail',
    timezone: 'Asia/Dubai',
    isDemo: true,
    dashboardFallbackLegacy: false,
    performanceDashboardVersion: 'intelligence',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }, { merge: true });

  const platforms = ['meta_ads', 'google_ads', 'tiktok_ads', 'ga4', 'shopify', 'woocommerce'];
  for (const platform of platforms) {
    await db.collection('platformConnections').doc(`${demoId}_${platform}`).set({
      clientId: demoId,
      platform,
      isConnected: true,
      currency: 'AED',
      timezone: 'Asia/Dubai',
      syncStatus: 'ok',
      lastSync: new Date().toISOString(),
      lastError: null,
      credentialRef: {
        provider: 'firestore',
        key: `${demoId}_${platform}`,
        version: 1,
      },
      credentialsMasked: {
        account: 'DEM***001',
      },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }, { merge: true });
  }

  return demoId;
}

async function seedMetrics(db, clientId) {
  const platforms = [
    { key: 'meta_ads', type: 'ad' },
    { key: 'google_ads', type: 'ad' },
    { key: 'tiktok_ads', type: 'ad' },
    { key: 'ga4', type: 'analytics' },
    { key: 'shopify', type: 'ecommerce' },
    { key: 'woocommerce', type: 'ecommerce' },
  ];

  const dailyByPlatform = new Map();

  for (const platform of platforms) {
    const rows = [];
    for (let day = 365; day >= 0; day -= 1) {
      const dateIso = daysAgoISO(day);
      const row = buildDay(clientId, platform.key, dateIso);
      rows.push(row);

      const dailyId = `${clientId}_${platform.key}_daily_${dateIso}`;
      const payload = {
        clientId,
        platform: platform.key,
        platformType: platform.type,
        date: dateIso,
        granularity: 'daily',
        currency: 'AED',
        normalizedCurrency: 'AED',
        timezone: 'Asia/Dubai',
        attributionModel: 'canonical_last_click_7d',
        spend: row.spend,
        revenue: row.revenue,
        spendNormalized: row.spend,
        revenueNormalized: row.revenue,
        impressions: row.impressions,
        clicks: row.clicks,
        sessions: row.sessions,
        leads: row.leads,
        qualifiedLeads: row.qualifiedLeads,
        conversions: row.conversions,
        orders: row.orders,
        reach: row.reach,
        frequency: row.frequency,
        linkClicks: row.linkClicks,
        cpm: row.cpm,
        source: 'demo_seed',
        aggregatedAt: new Date().toISOString(),
      };

      await db.collection('dailyPlatformMetrics').doc(dailyId).set(payload, { merge: true });
      await db.collection('fact_marketing_daily').doc(dailyId).set(payload, { merge: true });

      if (day <= 30) {
        for (let hour = 0; hour < 24; hour += 1) {
          const hSeed = seededRandom(`${clientId}:${platform.key}:${dateIso}:${hour}`);
          const hourlyId = `${clientId}_${platform.key}_hourly_${dateIso}_${hour}`;
          await db.collection('fact_marketing_hourly').doc(hourlyId).set({
            ...payload,
            hour,
            granularity: 'hourly',
            spend: Number((row.spend * (0.02 + hSeed * 0.08)).toFixed(2)),
            revenue: Number((row.revenue * (0.02 + hSeed * 0.08)).toFixed(2)),
            spendNormalized: Number((row.spend * (0.02 + hSeed * 0.08)).toFixed(2)),
            revenueNormalized: Number((row.revenue * (0.02 + hSeed * 0.08)).toFixed(2)),
            impressions: Math.round(row.impressions * (0.02 + hSeed * 0.08)),
            clicks: Math.round(row.clicks * (0.02 + hSeed * 0.08)),
            conversions: Math.round(row.conversions * (0.02 + hSeed * 0.08)),
            orders: Math.round(row.orders * (0.02 + hSeed * 0.08)),
            sessions: Math.round(row.sessions * (0.02 + hSeed * 0.08)),
          }, { merge: true });
        }
      }
    }

    dailyByPlatform.set(platform, rows);

    const monthMap = new Map();
    for (const row of rows) {
      const end = monthEnd(row.date);
      const list = monthMap.get(end) || [];
      list.push(row);
      monthMap.set(end, list);
    }

    for (const [end, monthRows] of monthMap) {
      const totals = aggregateMonth(monthRows);
      await db.collection('monthlyPlatformMetrics').doc(`${clientId}_${platform.key}_${end}`).set({
        clientId,
        platform: platform.key,
        platformType: platform.type,
        monthEndDate: end,
        currency: 'AED',
        ...totals,
        frequency: totals.reach > 0 ? totals.impressions / totals.reach : 0,
        cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
        source: 'demo_seed',
        aggregatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  }

  const combinedByMonth = new Map();
  for (const rows of dailyByPlatform.values()) {
    for (const row of rows) {
      const end = monthEnd(row.date);
      const list = combinedByMonth.get(end) || [];
      list.push(row);
      combinedByMonth.set(end, list);
    }
  }

  for (const [end, rows] of combinedByMonth) {
    const totals = aggregateMonth(rows);
    const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
    await db.collection('monthlyClientRollups').doc(`${clientId}_combined_${end}`).set({
      clientId,
      platformType: 'combined',
      monthEndDate: end,
      currency: 'AED',
      ...totals,
      roas,
      cpo: totals.orders > 0 ? totals.spend / totals.orders : 0,
      aov: totals.orders > 0 ? totals.revenue / totals.orders : 0,
      cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
      source: 'demo_seed',
      aggregatedAt: new Date().toISOString(),
    }, { merge: true });
  }
}

async function seedSocial(db, clientId) {
  const topics = ['pricing', 'delivery', 'support', 'quality', 'product_fit'];
  const channels = ['facebook', 'instagram', 'messenger'];

  for (let i = 0; i < 180; i += 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - Math.floor(i / 6));
    date.setUTCHours((i * 3) % 24, (i * 11) % 60, 0, 0);

    const seed = seededRandom(`${clientId}:social:${i}`);
    const sentiment = Number((seed * 2 - 1).toFixed(2));
    const channel = channels[i % channels.length];
    const topic = topics[i % topics.length];
    const interactionId = `${clientId}_social_${i}`;

    const interaction = {
      clientId,
      platform: 'meta_social',
      platformType: 'social',
      channel,
      interactionType: i % 5 === 0 ? 'dm' : i % 4 === 0 ? 'mention' : 'comment',
      conversationId: `${clientId}_conversation_${Math.floor(i / 3)}`,
      externalId: interactionId,
      authorName: `Demo User ${i + 1}`,
      authorHandle: `demo_user_${i + 1}`,
      message: `Demo ${topic} message ${i + 1}`,
      language: i % 4 === 0 ? 'ar' : 'en',
      sentimentScore: sentiment,
      sentimentLabel: sentiment > 0.2 ? 'positive' : sentiment < -0.2 ? 'negative' : 'neutral',
      topics: [topic],
      severity: sentiment < -0.5 ? 'high' : sentiment < -0.1 ? 'medium' : 'low',
      isResolved: i % 7 !== 0,
      occurredAt: date.toISOString(),
      mediaUrl: '',
      permalink: '',
      source: 'demo_seed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('fact_social_interaction').doc(`${clientId}_${interactionId}`).set(interaction, { merge: true });
  }

  const interactionSnap = await db.collection('fact_social_interaction').where('clientId', '==', clientId).get();
  const grouped = new Map();

  for (const doc of interactionSnap.docs) {
    const data = doc.data();
    const key = data.conversationId;
    const list = grouped.get(key) || [];
    list.push(data);
    grouped.set(key, list);
  }

  for (const [conversationId, list] of grouped) {
    list.sort((a, b) => (a.occurredAt || '').localeCompare(b.occurredAt || ''));
    const latest = list[list.length - 1];
    const avgSentiment = list.reduce((acc, item) => acc + (item.sentimentScore || 0), 0) / list.length;
    const unresolved = list.filter((item) => !item.isResolved).length;

    await db.collection('fact_social_conversation').doc(`${clientId}_${conversationId}`).set({
      clientId,
      platform: 'meta_social',
      channel: latest.channel || 'facebook',
      conversationId,
      participantKey: latest.authorHandle || 'demo',
      latestMessage: latest.message,
      latestMessageAt: latest.occurredAt,
      interactionCount: list.length,
      unresolvedCount: unresolved,
      sentimentScore: avgSentiment,
      sentimentLabel: avgSentiment > 0.2 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'neutral',
      dominantTopics: [latest.topics?.[0] || 'general'],
      status: unresolved > 0 ? 'open' : 'closed',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }
}

async function seedCreativeMedia(db, clientId) {
  const platforms = ['meta_ads', 'google_ads', 'tiktok_ads'];
  for (let i = 0; i < 30; i += 1) {
    const platform = platforms[i % platforms.length];
    const seed = seededRandom(`${clientId}:creative:${i}`);
    const spend = Number((240 + seed * 1500).toFixed(2));
    const revenue = Number((spend * (1.9 + seed * 2.5)).toFixed(2));

    await db.collection('creativePerformance').doc(`${clientId}_creative_${i}`).set({
      clientId,
      platform,
      name: `Demo Creative ${i + 1}`,
      headline: `Headline Variant ${i + 1}`,
      primaryText: `Demo creative messaging variation ${i + 1}`,
      thumbnail: '',
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      impressions: Math.round(7000 + seed * 38000),
      clicks: Math.round(120 + seed * 1900),
      purchases: Math.round(7 + seed * 110),
      updatedAt: new Date().toISOString(),
      source: 'demo_seed',
    }, { merge: true });
  }
}

async function seedKpiAndRecommendations(db, clientId) {
  await db.collection('kpi_snapshots_daily').doc(`${clientId}_latest`).set({
    clientId,
    timeframe: 'demo_rolling_30d',
    generatedAt: new Date().toISOString(),
    source: 'demo_seed',
    executive: {
      healthScore: 78,
      spend: 94882,
      value: 286534,
      efficiencyIndex: 82,
      conversionEfficiency: 75,
      pacing: 94,
      topRisks: ['Support backlog grew by 12% week over week'],
      topOpportunities: ['Scale Google high-intent segments by 15%'],
    },
  }, { merge: true });

  await db.collection('client_health_scores').doc(clientId).set({
    clientId,
    score: 78,
    grade: 'B',
    generatedAt: new Date().toISOString(),
    topRisks: ['Support backlog grew by 12% week over week'],
    topOpportunities: ['Scale Google high-intent segments by 15%'],
    source: 'demo_seed',
  }, { merge: true });

  const recs = [
    {
      title: 'Reallocate 20% budget to best efficiency channel',
      action: 'Shift spend from low-efficiency ad sets to top two channels with efficiency >2.4x.',
      category: 'budget',
      priority: 1,
      confidence: 0.83,
      expectedImpact: 'Projected +12% blended value in 14 days.',
    },
    {
      title: 'Address negative social clusters on delivery',
      action: 'Apply priority response playbook for delivery complaints within 4-hour SLA.',
      category: 'social_care',
      priority: 1,
      confidence: 0.79,
      expectedImpact: 'Reduce unresolved negatives by 35% over two weeks.',
    },
  ];

  for (let i = 0; i < recs.length; i += 1) {
    await db.collection('aiRecommendations').doc(`${clientId}_demo_${i + 1}`).set({
      clientId,
      kpiSnapshotId: `${clientId}_latest`,
      ...recs[i],
      evidence: [
        {
          metric: 'efficiency_index',
          current: 82,
          baseline: 70,
          deltaPct: 17.14,
          period: 'rolling_30d',
        },
      ],
      guardrails: ['Do not increase daily spend by more than 20%'],
      status: 'active',
      source: 'demo_seed',
      createdAt: new Date().toISOString(),
    }, { merge: true });
  }
}

async function seed() {
  initAdmin();
  const db = getFirestore();
  const clientId = await upsertDemoClient(db);

  await seedMetrics(db, clientId);
  await seedSocial(db, clientId);
  await seedCreativeMedia(db, clientId);
  await seedKpiAndRecommendations(db, clientId);

  console.log('✅ Seeded AW Intelligence Demo data successfully');
  console.log(`Client ID: ${clientId}`);
}

seed().catch((error) => {
  console.error('❌ Failed seeding demo client:', error);
  process.exit(1);
});
