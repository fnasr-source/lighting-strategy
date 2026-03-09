#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

const ROOT = path.resolve(process.cwd(), '..', '..');
const OUT_DIR = path.join(ROOT, 'campaigns', 'lup-2026', 'monitoring');
const CAMPAIGN_ID = 'lup-2026';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

const LUP_CAMPAIGNS = {
  master: { id: '9dd178cd-33ca-47ef-a6a2-25ae11b6806f', name: 'Leading Under Pressure 2026 | ICP Outreach | Draft' },
  exec: { id: '630f3ff9-113c-451c-84de-cc4c336a30a6', name: 'Leading Under Pressure 2026 | Executive Outreach | Draft' },
  hr: { id: 'f204b2a1-ad17-4252-8e9a-a4d4e5a692db', name: 'Leading Under Pressure 2026 | L&D-HR Outreach | Draft' },
  warm: { id: 'b81bf8cf-4ae8-4ebb-a111-e1eba7583ee5', name: 'Leading Under Pressure 2026 | Warm Network Outreach | Draft' },
  nurture: { id: '28f160fc-c4bd-47cd-9be1-459d91692175', name: 'Leading Under Pressure 2026 | Nurture Sequence | Draft' },
};

function isoNow() {
  return new Date().toISOString();
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.resolve(process.cwd(), '../../firebase/service-account.json');
  const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id });
}

async function getDb() {
  ensureAdmin();
  return admin.firestore();
}

async function fetchJson(url, headers = {}, body) {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return await res.json();
}

function countBy(rows, getter) {
  const out = {};
  for (const row of rows) {
    const key = getter(row) || 'unknown';
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function topEntries(map, limit = 10) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

async function loadFirestoreSummary() {
  const db = await getDb();

  const leadsSnap = await db.collection('campaigns').doc(CAMPAIGN_ID).collection('leads').get();
  const eventSnap = await db.collection('campaigns').doc(CAMPAIGN_ID).collection('analytics_events').get();

  const leads = leadsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const events = eventSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    leads: {
      total: leads.length,
      by_form: countBy(leads, (row) => row.form_type),
      by_status: countBy(leads, (row) => row.status),
      by_intent: countBy(leads, (row) => row.lead_intent),
      top_referrers: topEntries(countBy(leads, (row) => row.meta?.referrer || '(direct)')),
      top_landing_urls: topEntries(countBy(leads, (row) => row.meta?.landing_url || '(unknown)')),
    },
    analytics: {
      total_events: events.length,
      unique_sessions: new Set(events.map((row) => row.session_id).filter(Boolean)).size,
      unique_visitors: new Set(events.map((row) => row.visitor_id).filter(Boolean)).size,
      by_event: countBy(events, (row) => row.event_name),
      top_pages: topEntries(countBy(events, (row) => row.path || '(unknown)')),
      top_referrers: topEntries(countBy(events, (row) => row.referrer || '(direct)')),
      top_ctas: topEntries(countBy(events, (row) => row.cta_type || '(none)')),
    },
  };
}

async function loadInstantlySummary() {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) {
    return { available: false, error: 'Missing INSTANTLY_API_KEY' };
  }

  const configEntries = await Promise.all(
    Object.values(LUP_CAMPAIGNS).map(async (campaign) => {
      try {
        const data = await fetchJson(
          `https://api.instantly.ai/api/v2/campaigns/${campaign.id}`,
          { Authorization: `Bearer ${key}`, Accept: 'application/json' },
        );
        return [campaign.id, data];
      } catch (error) {
        return [campaign.id, null];
      }
    }),
  );
  const configMap = Object.fromEntries(configEntries);

  let analyticsRows;
  try {
    analyticsRows = await fetchJson(
      'https://api.instantly.ai/api/v2/campaigns/analytics',
      { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    );
  } catch (error) {
    return {
      available: false,
      error: String(error.message || error),
      campaign_configs_available: Object.values(configMap).filter(Boolean).length,
    };
  }

  const lupRows = analyticsRows.filter((row) =>
    Object.values(LUP_CAMPAIGNS).some((campaign) => campaign.id === row.campaign_id),
  );

  return {
    available: true,
    total_sent: lupRows.reduce((sum, row) => sum + Number(row.emails_sent_count || 0), 0),
    total_contacted: lupRows.reduce((sum, row) => sum + Number(row.contacted_count || 0), 0),
    total_replies: lupRows.reduce((sum, row) => sum + Number(row.reply_count || 0), 0),
    total_bounces: lupRows.reduce((sum, row) => sum + Number(row.bounced_count || 0), 0),
    campaign_configs_available: Object.values(configMap).filter(Boolean).length,
    campaigns: lupRows.map((row) => ({
      id: row.campaign_id,
      name: configMap[row.campaign_id]?.name || row.campaign_name || LUP_CAMPAIGNS[Object.keys(LUP_CAMPAIGNS).find((keyName) => LUP_CAMPAIGNS[keyName].id === row.campaign_id)]?.name,
      status: configMap[row.campaign_id]?.status ?? row.campaign_status,
      leads: Number(row.leads_count || 0),
      contacted: Number(row.contacted_count || 0),
      sent: Number(row.emails_sent_count || 0),
      replies: Number(row.reply_count || 0),
      bounces: Number(row.bounced_count || 0),
      unsubscribed: Number(row.unsubscribed_count || 0),
    })),
  };
}

function toMarkdown(summary) {
  const lines = [];
  lines.push('# LUP Monitoring Report');
  lines.push('');
  lines.push(`- Generated at: ${summary.generated_at}`);
  lines.push(`- Outreach sent: ${summary.instantly.total_sent ?? 0}`);
  lines.push(`- Outreach contacted: ${summary.instantly.total_contacted ?? 0}`);
  lines.push(`- Replies: ${summary.instantly.total_replies ?? 0}`);
  lines.push(`- Bounces: ${summary.instantly.total_bounces ?? 0}`);
  lines.push(`- Landing events: ${summary.firestore.analytics.total_events}`);
  lines.push(`- Landing sessions: ${summary.firestore.analytics.unique_sessions}`);
  lines.push(`- Landing leads: ${summary.firestore.leads.total}`);
  lines.push('');
  lines.push('## Campaigns');
  lines.push('');
  lines.push('| Campaign | Leads | Contacted | Sent | Replies | Bounces |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const row of summary.instantly.campaigns || []) {
    lines.push(`| ${row.name} | ${row.leads} | ${row.contacted} | ${row.sent} | ${row.replies} | ${row.bounces} |`);
  }
  lines.push('');
  lines.push('## Landing Top Events');
  lines.push('');
  for (const [eventName, count] of Object.entries(summary.firestore.analytics.by_event || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    lines.push(`- ${eventName}: ${count}`);
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const summary = {
    generated_at: isoNow(),
    instantly: await loadInstantlySummary(),
    firestore: await loadFirestoreSummary(),
  };

  const stamp = summary.generated_at.replace(/[:.]/g, '-');
  const jsonPath = path.join(OUT_DIR, `lup_monitor_${stamp}.json`);
  const mdPath = path.join(OUT_DIR, `lup_monitor_${stamp}.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdPath, toMarkdown(summary), 'utf8');

  console.log(JSON.stringify({ jsonPath, mdPath, summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
