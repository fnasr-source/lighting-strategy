import { readFileSync } from 'fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_ID = 'nasseredin';
const CLIENT_NAME = 'Nasseredin';
const USER_EMAIL = 'khaled@nasseredin.com';

function initAdmin() {
  if (getApps().length > 0) return;

  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidates = [
    envPath,
    join(__dirname, 'service-account.json'),
    join(__dirname, 'service-account-key.json'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const raw = readFileSync(resolve(candidate), 'utf8');
      const serviceAccount = JSON.parse(raw);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      return;
    } catch {
      // continue
    }
  }

  throw new Error('No Firebase service account file found for Admireworks.');
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
  const impressions = Math.round(9000 + seed * 22000);
  const clicks = Math.round(impressions * (0.011 + seed * 0.013));
  const spend = platform === 'ga4' ? 0 : Number((180 + seed * 1250).toFixed(2));
  const conversions = Math.round(clicks * (0.016 + seed * 0.03));
  const orders = Math.round(conversions * (0.68 + seed * 0.18));
  const revenue = platform === 'ga4'
    ? Number((conversions * (70 + seed * 85)).toFixed(2))
    : Number(((spend * (2 + seed * 2.2)) + orders * 12).toFixed(2));

  return {
    date: dateIso,
    impressions,
    clicks,
    spend,
    revenue,
    conversions,
    orders,
    sessions: Math.round(clicks * (1.08 + seed * 0.35)),
    leads: conversions,
    qualifiedLeads: Math.round(conversions * (0.42 + seed * 0.25)),
    reach: Math.round(impressions * (0.65 + seed * 0.14)),
    frequency: Number((1.2 + seed * 2.1).toFixed(2)),
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

async function upsertClient(db) {
  await db.collection('clients').doc(CLIENT_ID).set({
    name: CLIENT_NAME,
    company: CLIENT_NAME,
    region: 'AE',
    baseCurrency: 'AED',
    status: 'active',
    businessType: 'hybrid',
    industry: 'family_office',
    timezone: 'Asia/Dubai',
    dashboardFallbackLegacy: false,
    performanceDashboardVersion: 'intelligence',
    notes: 'Provisioned for Khaled Nasseredin Google login access.',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }, { merge: true });
}

async function upsertInvite(db) {
  const existing = await db
    .collection('pendingInvites')
    .where('email', '==', USER_EMAIL)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (!existing.empty) {
    await db.collection('pendingInvites').doc(existing.docs[0].id).set({
      role: 'client',
      linkedClientId: CLIENT_ID,
      linkedClientIds: [CLIENT_ID],
      invitedByName: 'Codex Provisioning',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return;
  }

  await db.collection('pendingInvites').add({
    email: USER_EMAIL,
    role: 'client',
    linkedClientId: CLIENT_ID,
    linkedClientIds: [CLIENT_ID],
    invitedBy: 'system',
    invitedByName: 'Codex Provisioning',
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

async function seedMetrics(db) {
  const platforms = [
    { key: 'meta_ads', type: 'ad' },
    { key: 'google_ads', type: 'ad' },
    { key: 'tiktok_ads', type: 'ad' },
    { key: 'ga4', type: 'analytics' },
  ];

  const dailyByPlatform = new Map();

  for (const platform of platforms) {
    const rows = [];
    for (let day = 90; day >= 0; day -= 1) {
      const dateIso = daysAgoISO(day);
      const row = buildDay(CLIENT_ID, platform.key, dateIso);
      rows.push(row);

      const dailyId = `${CLIENT_ID}_${platform.key}_daily_${dateIso}`;
      const payload = {
        clientId: CLIENT_ID,
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
        source: 'nasseredin_seed',
        aggregatedAt: new Date().toISOString(),
      };

      await db.collection('dailyPlatformMetrics').doc(dailyId).set(payload, { merge: true });
      await db.collection('fact_marketing_daily').doc(dailyId).set(payload, { merge: true });
    }

    dailyByPlatform.set(platform.key, rows);

    const monthMap = new Map();
    for (const row of rows) {
      const end = monthEnd(row.date);
      const list = monthMap.get(end) || [];
      list.push(row);
      monthMap.set(end, list);
    }

    for (const [end, monthRows] of monthMap) {
      const totals = aggregateMonth(monthRows);
      await db.collection('monthlyPlatformMetrics').doc(`${CLIENT_ID}_${platform.key}_${end}`).set({
        clientId: CLIENT_ID,
        platform: platform.key,
        platformType: platform.type,
        monthEndDate: end,
        currency: 'AED',
        ...totals,
        frequency: totals.reach > 0 ? totals.impressions / totals.reach : 0,
        cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
        source: 'nasseredin_seed',
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
    await db.collection('monthlyClientRollups').doc(`${CLIENT_ID}_combined_${end}`).set({
      clientId: CLIENT_ID,
      platformType: 'combined',
      monthEndDate: end,
      currency: 'AED',
      ...totals,
      roas,
      cpo: totals.orders > 0 ? totals.spend / totals.orders : 0,
      aov: totals.orders > 0 ? totals.revenue / totals.orders : 0,
      cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
      source: 'nasseredin_seed',
      aggregatedAt: new Date().toISOString(),
    }, { merge: true });
  }
}

async function seedSocial(db) {
  const topics = ['leads', 'brand', 'support', 'delivery'];
  for (let i = 0; i < 40; i += 1) {
    const occurredAt = new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString();
    const sentimentScore = Number(((seededRandom(`${CLIENT_ID}:social:${i}`) * 2) - 1).toFixed(2));
    await db.collection('fact_social_interaction').doc(`${CLIENT_ID}_social_${i}`).set({
      clientId: CLIENT_ID,
      platform: 'meta_social',
      platformType: 'social',
      channel: i % 2 === 0 ? 'instagram' : 'facebook',
      interactionType: i % 3 === 0 ? 'comment' : 'dm',
      conversationId: `${CLIENT_ID}_conversation_${Math.floor(i / 2)}`,
      externalId: `${CLIENT_ID}_social_${i}`,
      authorName: `Nasseredin Contact ${i + 1}`,
      authorHandle: `nasseredin_contact_${i + 1}`,
      message: `Seeded ${topics[i % topics.length]} conversation ${i + 1}`,
      language: 'en',
      sentimentScore,
      sentimentLabel: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
      topics: [topics[i % topics.length]],
      severity: sentimentScore < -0.45 ? 'high' : 'low',
      isResolved: i % 5 !== 0,
      occurredAt,
      mediaUrl: '',
      permalink: '',
      source: 'nasseredin_seed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }
}

async function seedCreative(db) {
  const platforms = ['meta_ads', 'google_ads', 'tiktok_ads'];
  for (let i = 0; i < 12; i += 1) {
    const platform = platforms[i % platforms.length];
    const spend = Number((180 + seededRandom(`${CLIENT_ID}:creative:${i}`) * 1400).toFixed(2));
    const revenue = Number((spend * (2 + seededRandom(`${CLIENT_ID}:creative:roas:${i}`) * 2)).toFixed(2));

    await db.collection('creativePerformance').doc(`${CLIENT_ID}_creative_${i}`).set({
      clientId: CLIENT_ID,
      platform,
      name: `Nasseredin Creative ${i + 1}`,
      headline: `Nasseredin headline ${i + 1}`,
      primaryText: `Seeded creative copy variant ${i + 1}`,
      thumbnail: '',
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      impressions: Math.round(6000 + seededRandom(`${CLIENT_ID}:imp:${i}`) * 24000),
      clicks: Math.round(140 + seededRandom(`${CLIENT_ID}:clk:${i}`) * 1300),
      purchases: Math.round(4 + seededRandom(`${CLIENT_ID}:pur:${i}`) * 40),
      updatedAt: new Date().toISOString(),
      source: 'nasseredin_seed',
    }, { merge: true });
  }
}

async function seedKpis(db) {
  await db.collection('kpi_snapshots_daily').doc(`${CLIENT_ID}_latest`).set({
    clientId: CLIENT_ID,
    timeframe: 'rolling_30d',
    generatedAt: new Date().toISOString(),
    source: 'nasseredin_seed',
    executive: {
      healthScore: 74,
      spend: 58240,
      value: 171460,
      efficiencyIndex: 77,
      conversionEfficiency: 72,
      pacing: 91,
      topRisks: ['Meta lead quality dipped in the last 7 days'],
      topOpportunities: ['Increase budget on the best-performing Google segments'],
    },
  }, { merge: true });

  await db.collection('client_health_scores').doc(CLIENT_ID).set({
    clientId: CLIENT_ID,
    score: 74,
    grade: 'B',
    generatedAt: new Date().toISOString(),
    topRisks: ['Meta lead quality dipped in the last 7 days'],
    topOpportunities: ['Increase budget on the best-performing Google segments'],
    source: 'nasseredin_seed',
  }, { merge: true });
}

async function main() {
  initAdmin();
  const db = getFirestore();

  await upsertClient(db);
  await upsertInvite(db);
  await seedMetrics(db);
  await seedSocial(db);
  await seedCreative(db);
  await seedKpis(db);

  console.log('Provisioned Nasseredin client area.');
  console.log(`Client ID: ${CLIENT_ID}`);
  console.log(`Invite email: ${USER_EMAIL}`);
}

main().catch((error) => {
  console.error('Failed provisioning Nasseredin client area:', error);
  process.exit(1);
});
