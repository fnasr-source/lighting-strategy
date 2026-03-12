#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const RAW = path.join(ROOT, 'Data-Sources', 'Raw');

const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY;
const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30000);

const INPUT = path.join(RAW, 'asana_growth_reset_candidate_leads_2026-03-10.json');
const REPORT = path.join(RAW, 'simlabs_growth_reset_sync_2026-03-10.json');
const REGISTRY_PATH = path.join(RAW, 'instantly_upload_registry.json');

const ROUTES = {
  decision: {
    instantlyCampaignId: 'baa763fd-32bf-45b2-8fd8-a5d096637d8c',
    instantlyLeadListId: 'b8656a52-5f2b-44a5-9547-0f2787b66215',
    apolloLabelName: 'SimLabs - Education Decision Makers - MENA',
  },
  faculty: {
    instantlyCampaignId: 'a8b5e21b-a626-42fa-96f7-f33e83feefa2',
    instantlyLeadListId: '700777ad-4472-4f3b-9c18-f48439b402db',
    apolloLabelName: 'SimLabs - Faculty / Instructors - MENA',
  },
  recovery: {
    instantlyCampaignId: '6198f69f-22ea-4442-b0db-f77309e3218e',
    instantlyLeadListId: '3d808bd9-35cc-4cf1-80c7-c3a1f3da3c1f',
    apolloLabelName: 'SimLabs - Education Warm Follow-up / CRM Recovery',
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function parseName(fullName = '') {
  const trimmed = `${fullName}`.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

function companyDomain(website = '', email = '') {
  const cleanWebsite = `${website}`.trim();
  if (cleanWebsite) {
    const normalized = cleanWebsite.startsWith('http') ? cleanWebsite : `https://${cleanWebsite}`;
    try {
      return new URL(normalized).hostname.replace(/^www\./, '');
    } catch {}
  }
  const emailDomain = `${email}`.split('@')[1] || '';
  return emailDomain.toLowerCase();
}

async function apiJson({ method, url, headers, payload }) {
  const res = await fetch(url, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const error = new Error(`${method} ${url} failed with ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

function apolloListItems(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.labels || payload?.data || payload?.items || [];
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return { generatedAt: nowIso(), by_campaign: {}, uploaded: [] };
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function saveRegistry(registry) {
  registry.generatedAt = nowIso();
  fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`);
}

async function getApolloLabelIdByName(name) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': APOLLO_API_KEY,
  };
  for (let page = 1; page <= 10; page += 1) {
    const list = await apiJson({
      method: 'GET',
      url: `https://api.apollo.io/api/v1/labels?page=${page}&per_page=200`,
      headers,
    });
    const items = apolloListItems(list);
    const found = items.find((item) => item.name === name);
    if (found) return found.id || found.gid;
    if (!items.length) break;
  }
  try {
    const created = await apiJson({
      method: 'POST',
      url: 'https://api.apollo.io/api/v1/labels',
      headers,
      payload: { name, modality: 'contacts' },
    });
    return created.id || created.label?.id || created.data?.id;
  } catch (error) {
    if (error.status === 422 && /already exists/i.test(JSON.stringify(error.data || {}))) {
      for (let page = 1; page <= 10; page += 1) {
        const list = await apiJson({
          method: 'GET',
          url: `https://api.apollo.io/api/v1/labels?page=${page}&per_page=200`,
          headers,
        });
        const items = apolloListItems(list);
        const found = items.find((item) => item.name === name);
        if (found) return found.id || found.gid;
        if (!items.length) break;
      }
    }
    throw error;
  }
}

async function addApolloContact(labelId, lead) {
  const { firstName, lastName } = parseName(lead.name);
  const payload = {
    first_name: firstName,
    last_name: lastName,
    email: lead.email,
    title: lead.role || '',
    organization_name: lead.company || '',
    website_url: lead.website || '',
    label_ids: [labelId],
    run_dedupe: true,
  };
  return apiJson({
    method: 'POST',
    url: 'https://api.apollo.io/api/v1/contacts',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': APOLLO_API_KEY,
    },
    payload,
  });
}

async function addInstantlyLead(route, lead) {
  const { firstName, lastName } = parseName(lead.name);
  const payload = {
    email: lead.email,
    first_name: firstName,
    last_name: lastName,
    company_name: lead.company || '',
    job_title: lead.role || '',
    company_domain: companyDomain(lead.website, lead.email),
    website: lead.website || '',
    campaign: route.instantlyCampaignId,
    campaign_id: route.instantlyCampaignId,
    custom_variables: {
      source_system: 'asana',
      source_ref: lead.gid,
      growth_reset_segment: lead.segment,
      asana_section: lead.section,
      owner: lead.owner || '',
      use_case: lead.useCase || '',
      phone: lead.phone || '',
    },
  };
  return apiJson({
    method: 'POST',
    url: 'https://api.instantly.ai/api/v2/leads',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${INSTANTLY_API_KEY}`,
    },
    payload,
  });
}

async function main() {
  if (!INSTANTLY_API_KEY) throw new Error('INSTANTLY_API_KEY is required');
  if (!APOLLO_API_KEY) throw new Error('APOLLO_API_KEY is required');
  const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const registry = loadRegistry();
  const uploadedSet = new Set((registry.uploaded || []).map((item) => `${item.email}`.toLowerCase()));
  const leads = (input.leads || []).filter((lead) => ROUTES[lead.segment]);
  const report = {
    generatedAt: nowIso(),
    selected: leads.length,
    instantly: { created: 0, errors: [] },
    apollo: { labeled: 0, errors: [] },
    bySegment: {},
  };
  const persist = () => {
    saveRegistry(registry);
    fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  };

  const labelIds = {};
  for (const segment of Object.keys(ROUTES)) {
    labelIds[segment] = await getApolloLabelIdByName(ROUTES[segment].apolloLabelName);
    await sleep(2600);
  }

  for (const lead of leads) {
    report.bySegment[lead.segment] = report.bySegment[lead.segment] || { selected: 0, created: 0, labeled: 0 };
    report.bySegment[lead.segment].selected += 1;

    if (!lead.email || uploadedSet.has(lead.email.toLowerCase())) {
      continue;
    }

    const route = ROUTES[lead.segment];
    try {
      await addInstantlyLead(route, lead);
      report.instantly.created += 1;
      report.bySegment[lead.segment].created += 1;
      registry.uploaded.push({
        email: lead.email,
        campaign_id: route.instantlyCampaignId,
        lead_list_id: route.instantlyLeadListId,
        segment: `growth_reset_${lead.segment}`,
        uploaded_at: nowIso(),
        dry_run: false,
        source_ref: lead.gid,
      });
      registry.by_campaign[route.instantlyCampaignId] = (registry.by_campaign[route.instantlyCampaignId] || 0) + 1;
      uploadedSet.add(lead.email.toLowerCase());
    } catch (error) {
      report.instantly.errors.push({
        email: lead.email,
        segment: lead.segment,
        status: error.status || null,
        error: error.data || String(error),
      });
      persist();
      continue;
    }
    persist();
    await sleep(2200);

    try {
      await addApolloContact(labelIds[lead.segment], lead);
      report.apollo.labeled += 1;
      report.bySegment[lead.segment].labeled += 1;
    } catch (error) {
      report.apollo.errors.push({
        email: lead.email,
        segment: lead.segment,
        status: error.status || null,
        error: error.data || String(error),
      });
    }
    persist();
    await sleep(2600);
  }

  persist();
  console.log(JSON.stringify({
    generatedAt: report.generatedAt,
    selected: report.selected,
    instantlyCreated: report.instantly.created,
    instantlyErrors: report.instantly.errors.length,
    apolloLabeled: report.apollo.labeled,
    apolloErrors: report.apollo.errors.length,
    bySegment: report.bySegment,
    reportPath: REPORT,
  }));
}

await main();
