#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PATHS = {
  raw: path.join(ROOT, 'Data-Sources', 'Raw'),
  baselines: path.join(ROOT, 'Data-Sources', 'Baselines'),
  leadsInsights: path.join(ROOT, 'Knowledge-Base', 'Leads-Insights'),
  apolloInsights: path.join(ROOT, 'Knowledge-Base', 'Leads-Insights', 'Apollo-Enrichment'),
  scorecards: path.join(ROOT, 'Knowledge-Base', 'Leads-Insights', 'Daily-Scorecards'),
  masterLeadsJson: path.join(ROOT, 'Knowledge-Base', 'Leads-Insights', 'simlabs_master_leads.json'),
  masterLeadsCsv: path.join(ROOT, 'Knowledge-Base', 'Leads-Insights', 'simlabs_master_leads.csv'),
  suppressionJson: path.join(ROOT, 'Knowledge-Base', 'Leads-Insights', 'simlabs_suppression_sets.json'),
  uploadRegistry: path.join(ROOT, 'Data-Sources', 'Raw', 'instantly_upload_registry.json'),
};
const PROCESS_LOCK_FILE = path.join(PATHS.raw, '.simlabs_outreach_manager.lock.json');

const SIMLABS_DOMAINS = ['trysimlabs.com', 'simlabs-team.com', 'getsimlabs.com'];

const REQUIRED_FIELDS = [
  'lead_key',
  'email',
  'first_name',
  'last_name',
  'title',
  'company',
  'company_domain',
  'country',
  'segment',
  'source_system',
  'source_ref',
  'apollo_person_id',
  'instantly_campaign_id',
  'instantly_list_name',
  'email_status',
  'lifecycle_stage',
  'assigned_owner',
  'last_activity_at',
  'replied_flag',
  'bounced_flag',
  'suppression_reason',
];

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'live.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'qq.com',
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asPositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseRetryAfterMs(headerValue) {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const ts = Date.parse(headerValue);
  if (Number.isFinite(ts)) {
    const diff = ts - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
}

function backoffMs(attempt, baseMs = 1200, jitterMs = 350, maxMs = 45_000) {
  const expo = baseMs * (2 ** attempt);
  const jitter = Math.floor(Math.random() * jitterMs);
  return Math.min(maxMs, expo + jitter);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonSafe(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function processExists(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireProcessLock(command, args) {
  ensureDir(PATHS.raw);

  const current = {
    pid: process.pid,
    command,
    args,
    started_at: isoNow(),
  };

  const writeLock = () => {
    fs.writeFileSync(PROCESS_LOCK_FILE, `${JSON.stringify(current, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
  };

  try {
    writeLock();
  } catch (err) {
    if (err?.code !== 'EEXIST') throw err;

    const existing = readJsonSafe(PROCESS_LOCK_FILE, {});
    const activePid = Number(existing?.pid || 0);
    if (processExists(activePid)) {
      throw new Error(
        `Another simlabs_outreach_manager run is active (pid=${activePid}, command=${existing?.command || 'unknown'}, started_at=${existing?.started_at || 'unknown'}).`,
      );
    }

    try {
      fs.unlinkSync(PROCESS_LOCK_FILE);
    } catch {
      // Ignore races; retry lock write once below.
    }
    writeLock();
  }

  return () => {
    const existing = readJsonSafe(PROCESS_LOCK_FILE, {});
    if (Number(existing?.pid || 0) === process.pid) {
      try {
        fs.unlinkSync(PROCESS_LOCK_FILE);
      } catch {
        // Ignore cleanup races.
      }
    }
  };
}

function quoteCsv(value) {
  const v = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function writeCsv(filePath, rows, headers) {
  ensureDir(path.dirname(filePath));
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => quoteCsv(row[h] ?? '')).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function isoNow() {
  return new Date().toISOString();
}

function todayStamp() {
  return isoNow().slice(0, 10);
}

function tsStamp() {
  return isoNow().replace(/[:.]/g, '-');
}

function normalizeEmail(email) {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

function emailDomain(email) {
  const e = normalizeEmail(email);
  const idx = e.lastIndexOf('@');
  if (idx <= 0) return '';
  return e.slice(idx + 1);
}

function isBusinessEmail(email) {
  const domain = emailDomain(email);
  if (!domain) return false;
  return !FREE_EMAIL_DOMAINS.has(domain);
}

function isValidEmail(email) {
  const e = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function toLeadKey(email, fallback = '') {
  const basis = normalizeEmail(email) || fallback;
  return crypto.createHash('sha1').update(basis).digest('hex');
}

function boolToInt(value) {
  return value ? 1 : 0;
}

function lowerIncludesAny(text, terms) {
  const t = (text || '').toLowerCase();
  return terms.some((term) => t.includes(term.toLowerCase()));
}

function getArgValue(args, name, fallback = null) {
  const direct = args.find((a) => a.startsWith(`${name}=`));
  if (direct) return direct.split('=').slice(1).join('=');
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

function hasFlag(args, name) {
  return args.includes(name);
}

class InstantlyClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.base = 'https://api.instantly.ai/api/v2';
    this.dryRun = Boolean(options.dryRun);
    this.maxPerMinute = asPositiveNumber(options.maxPerMinute, 16);
    this.minIntervalMs = asPositiveNumber(options.minIntervalMs, 1200);
    this.requestTimeoutMs = asPositiveNumber(options.requestTimeoutMs, 45_000);
    this.requestTimestamps = [];
    this.lastRequestAt = 0;
  }

  async throttle() {
    let now = Date.now();
    const sinceLast = now - this.lastRequestAt;
    if (sinceLast < this.minIntervalMs) {
      await sleep(this.minIntervalMs - sinceLast);
      now = Date.now();
    }
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60_000);
    if (this.requestTimestamps.length >= this.maxPerMinute) {
      const oldest = this.requestTimestamps[0];
      const waitMs = Math.max(250, 60_000 - (now - oldest) + 250);
      await sleep(waitMs);
    }
    const stamped = Date.now();
    this.requestTimestamps.push(stamped);
    this.lastRequestAt = stamped;
  }

  async request(method, endpoint, options = {}) {
    const { params, body, mutating = false, retries = 5 } = options;
    if (mutating && this.dryRun) {
      console.log(`[dry-run] ${method} ${endpoint}`);
      return { dry_run: true, method, endpoint, body };
    }

    const url = new URL(endpoint.startsWith('http') ? endpoint : `${this.base}${endpoint}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }

    for (let attempt = 0; attempt < retries; attempt += 1) {
      await this.throttle();
      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
      };
      if (body !== undefined && body !== null) {
        headers['Content-Type'] = 'application/json';
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      let response;
      let text = '';
      let data;
      try {
        response = await fetch(url, {
          method,
          headers,
          body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (attempt < retries - 1) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw err;
      }
      clearTimeout(timeoutId);

      if (response.status === 429 && attempt < retries - 1) {
        const retryAfter = parseRetryAfterMs(response.headers.get('retry-after'));
        await sleep(Math.max(retryAfter ?? 0, backoffMs(attempt, 2000, 800, 60_000)));
        continue;
      }

      if (response.status >= 500 && response.status <= 599 && attempt < retries - 1) {
        await sleep(backoffMs(attempt));
        continue;
      }

      if (!response.ok) {
        throw new Error(`${method} ${url.pathname}${url.search} failed (${response.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`);
      }

      return data;
    }

    throw new Error(`${method} ${endpoint} failed after retries`);
  }

  async listAllCampaigns() {
    const items = [];
    let cursor = null;
    while (true) {
      const data = await this.request('GET', '/campaigns', {
        params: cursor ? { starting_after: cursor } : {},
      });
      const batch = data.items || [];
      items.push(...batch);
      cursor = data.next_starting_after || null;
      if (!cursor || batch.length === 0) break;
    }
    return items;
  }

  async getCampaign(campaignId) {
    return this.request('GET', `/campaigns/${campaignId}`);
  }

  async patchCampaign(campaignId, payload) {
    return this.request('PATCH', `/campaigns/${campaignId}`, {
      body: payload,
      mutating: true,
    });
  }

  async createCampaign(payload) {
    return this.request('POST', '/campaigns', {
      body: payload,
      mutating: true,
    });
  }

  async activateCampaign(campaignId) {
    return this.request('POST', `/campaigns/${campaignId}/activate`, {
      body: {},
      mutating: true,
    });
  }

  async pauseCampaign(campaignId) {
    return this.request('POST', `/campaigns/${campaignId}/pause`, {
      body: {},
      mutating: true,
    });
  }

  async listLeadLists() {
    const data = await this.request('GET', '/lead-lists');
    return data.items || [];
  }

  async createLeadList(name) {
    return this.request('POST', '/lead-lists', {
      body: { name },
      mutating: true,
    });
  }

  async getCampaignAnalytics() {
    return this.request('GET', '/campaigns/analytics');
  }

  async getEmailsByCampaign(campaignId) {
    const items = [];
    let cursor = null;
    let pages = 0;
    while (true) {
      pages += 1;
      const data = await this.request('GET', '/emails', {
        params: {
          campaign_id: campaignId,
          limit: 100,
          ...(cursor ? { starting_after: cursor } : {}),
        },
      });
      const batch = data.items || [];
      items.push(...batch);
      cursor = data.next_starting_after || null;
      if (!cursor || batch.length === 0 || pages > 500) break;
    }
    return items;
  }

  async createLead(payload) {
    return this.request('POST', '/leads', {
      body: payload,
      mutating: true,
    });
  }

  async previewSupersearch(payload) {
    return this.request('POST', '/supersearch-enrichment/preview-leads-from-supersearch', {
      body: payload,
    });
  }

  async enrichFromSupersearch(payload) {
    return this.request('POST', '/supersearch-enrichment/enrich-leads-from-supersearch', {
      body: payload,
      mutating: true,
    });
  }
}

class ApolloClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.base = 'https://api.apollo.io/v1';
    this.maxPerMinute = asPositiveNumber(options.maxPerMinute, 35);
    this.minIntervalMs = asPositiveNumber(options.minIntervalMs, 1500);
    this.requestTimeoutMs = asPositiveNumber(options.requestTimeoutMs, 45_000);
    this.requestTimestamps = [];
    this.lastRequestAt = 0;
  }

  async throttle() {
    let now = Date.now();
    const sinceLast = now - this.lastRequestAt;
    if (sinceLast < this.minIntervalMs) {
      await sleep(this.minIntervalMs - sinceLast);
      now = Date.now();
    }
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60_000);
    if (this.requestTimestamps.length >= this.maxPerMinute) {
      const oldest = this.requestTimestamps[0];
      const waitMs = Math.max(250, 60_000 - (now - oldest) + 250);
      await sleep(waitMs);
    }
    const stamped = Date.now();
    this.requestTimestamps.push(stamped);
    this.lastRequestAt = stamped;
  }

  async request(method, endpoint, body = null, options = {}) {
    const url = `${this.base}${endpoint}`;
    const retries = asPositiveNumber(options.retries, 6);

    for (let attempt = 0; attempt < retries; attempt += 1) {
      await this.throttle();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      let response;
      let text = '';
      let data;
      try {
        response = await fetch(url, {
          method,
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (attempt < retries - 1) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw err;
      }
      clearTimeout(timeoutId);

      if (response.status === 429 && attempt < retries - 1) {
        const retryAfter = parseRetryAfterMs(response.headers.get('retry-after'));
        await sleep(Math.max(retryAfter ?? 0, backoffMs(attempt, 2500, 900, 60_000)));
        continue;
      }

      if (response.status >= 500 && response.status <= 599 && attempt < retries - 1) {
        await sleep(backoffMs(attempt));
        continue;
      }

      if (!response.ok) {
        throw new Error(`${method} ${endpoint} failed (${response.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`);
      }

      return data;
    }

    throw new Error(`${method} ${endpoint} failed after retries`);
  }

  async health() {
    return this.request('GET', '/auth/health');
  }

  async searchContacts(payload) {
    return this.request('POST', '/contacts/search', payload);
  }
}

function deriveLifecycleFromStatus(status) {
  const s = (status || '').toLowerCase();
  if (!s) return 'new';
  if (s.includes('follow')) return 'follow_up';
  if (s.includes('outreach')) return 'outreach_sent';
  if (s.includes('new')) return 'new';
  if (s.includes('won')) return 'won';
  if (s.includes('lost')) return 'lost';
  return 'active';
}

function deriveSegmentFromUseCase(useCase, source = '') {
  const u = (useCase || '').toLowerCase();
  const s = (source || '').toLowerCase();
  if (u.includes('education') || u.includes('university') || s.includes('demo form')) return 'educators';
  if (u.includes('security') || s.includes('campaign')) return 'security_professionals';
  if (u.includes('ctf')) return 'ctf_organizers';
  return 'general';
}

function parseName(name = '') {
  const n = name.trim();
  if (!n) return { first: '', last: '' };
  const parts = n.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function parseCountryFromAddress(address = '') {
  const parts = String(address).split(',').map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function buildSimlabsCampaignTemplates() {
  const educationDecisionMakersSequence = {
    steps: [
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'A 30-day cyber lab pilot for {{companyName}}?',
            body: '<div>Hi {{firstName}},</div><div><br /></div><div>I am reaching out because many universities and training programs want more hands-on cybersecurity learning, but they do not want to build or maintain lab infrastructure internally.</div><div><br /></div><div>Simulations Labs helps teams launch browser-based cyber labs and simulations without DevOps overhead, while still giving them a measurable way to track learner engagement and readiness.</div><div><br /></div><div>We are opening a small number of <b>30-day pilot slots</b> for education teams in the region.</div><div><br /></div><div>Would you be open to a <b>15-minute pilot scoping call</b> next week?</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 3,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Re: cyber lab pilot for {{companyName}}',
            body: '<div>{{firstName}}, quick follow-up.</div><div><br /></div><div>If useful, I can send a short outline showing how the pilot works, what faculty or program owners need from their side, and which learner outcomes can be measured during the first 30 days.</div><div><br /></div><div>Should I send that before we book a call?</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Keep this open or close it?',
            body: '<div>{{firstName}},</div><div><br /></div><div>I can close this out if a hands-on cyber lab pilot is not a priority right now.</div><div><br /></div><div>If it is worth a quick review, reply with <b>Pilot</b> and I will send times.</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
    ],
  };

  const facultyInstructorsSequence = {
    steps: [
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Could this make cyber labs easier to run this term?',
            body: '<div>Hi {{firstName}},</div><div><br /></div><div>Quick question: are you running cybersecurity labs, assessments, or practical exercises for learners right now?</div><div><br /></div><div>One issue we hear often is that faculty want more hands-on learning, but setting up and managing the technical environment becomes the bottleneck.</div><div><br /></div><div>Simulations Labs gives instructors browser-based, isolated cyber labs without internal setup overhead, and makes it easier to measure participation and performance.</div><div><br /></div><div>Would a short <b>pilot scoping call</b> be useful?</div><div><br /></div><div>Sincerely,<br />Noah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 3,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Re: easier cyber labs this term',
            body: '<div>{{firstName}}, following up in case this is relevant for the current term.</div><div><br /></div><div>I can send a short summary of how education teams use the platform for engagement, assessment credibility, and readiness measurement without building separate lab infrastructure.</div><div><br /></div><div>Should I send that over?</div><div><br /></div><div>Sincerely,<br />Noah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Close the loop on this?',
            body: '<div>{{firstName}},</div><div><br /></div><div>I can close this thread if practical cyber labs are not on your radar right now.</div><div><br /></div><div>If you want the pilot outline, reply with <b>Pilot</b>.</div><div><br /></div><div>Sincerely,<br />Noah</div>',
          },
        ],
      },
    ],
  };

  const educationRecoverySequence = {
    steps: [
      {
        type: 'email',
        delay: 1,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Following up on the Simulations Labs pilot conversation',
            body: '<div>Hi {{firstName}},</div><div><br /></div><div>Following up because your profile looked like a strong fit for an education-focused cybersecurity lab pilot.</div><div><br /></div><div>If the right next step is a short scoping call, I can send a few times and a one-page pilot outline.</div><div><br /></div><div>Would that be useful?</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 3,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Re: Simulations Labs pilot conversation',
            body: '<div>{{firstName}}, checking once more before I close the loop.</div><div><br /></div><div>If a short pilot scoping call still makes sense, reply with <b>Pilot</b> and I will send times.</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
    ],
  };

  const educatorSequence = {
    steps: [
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Quick question about practical cybersecurity labs for your learners',
            body: '<div>Hi {{firstName}},</div><div><br /></div><div>Quick question: are you currently running practical cybersecurity labs or CTF-style activities for your students or trainees?</div><div><br /></div><div>We help education teams launch hosted labs quickly without infrastructure overhead.</div><div><br /></div><div>If relevant, I can share a short pilot path your team can run this month.</div><div><br /></div><div>Would a 15-minute demo be useful?</div><div><br /></div><div>Sincerely,<br />Noah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 3,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Re: practical cyber labs',
            body: '<div>{{firstName}}, following up in case this is relevant this semester.</div><div><br /></div><div>If you want, I can send a sample pilot structure and we can walk through it in a short demo call.</div><div><br /></div><div>Should I send available demo slots?</div><div><br /></div><div>Sincerely,<br />Noah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Close the loop on this?',
            body: '<div>{{firstName}},</div><div><br /></div><div>I can close this out if timing is not right.</div><div><br /></div><div>If a pilot demo is useful, reply with <b>Demo</b> and I will send times.</div><div><br /></div><div>Sincerely,<br />Noah</div>',
          },
        ],
      },
    ],
  };

  const ctfV2Sequence = {
    steps: [
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Spotlight support for your next CTF event',
            body: '<div>Hi {{firstName}},</div><div><br /></div><div>We are opening a Spotlight Program for selected CTF organizers this cycle.</div><div><br /></div><div>The idea: hosted delivery support + event visibility support so you can run faster with less setup risk.</div><div><br /></div><div>If you are planning an upcoming event, I can share eligibility and next steps.</div><div><br /></div><div>Would a quick demo help?</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 3,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Re: CTF Spotlight Program',
            body: '<div>{{firstName}}, just checking if this is relevant for your next CTF.</div><div><br /></div><div>If yes, reply <b>Demo</b> and I will send the shortest route to launch.</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Keep this open or close it?',
            body: '<div>{{firstName}},</div><div><br /></div><div>Happy to close this loop if now is not a fit.</div><div><br /></div><div>If you want details and demo slots, reply with <b>Demo</b>.</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
    ],
  };

  const securityCtaTightened = {
    steps: [
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Quick question about security training at {{companyName}}',
            body: '<div>Hi {{firstName}},</div><div><br /></div><div>Are you currently planning practical cybersecurity training for your team?</div><div><br /></div><div>We run hosted CTF/lab delivery so teams can launch without infrastructure overhead.</div><div><br /></div><div>If relevant, I can walk you through the setup in a short demo.</div><div><br /></div><div>Would a 15-minute demo be useful?</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 3,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Re: security training setup',
            body: '<div>{{firstName}}, quick follow-up.</div><div><br /></div><div>If this is a priority, I can share demo slots and show exactly how teams launch quickly.</div><div><br /></div><div>Should I send times?</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Close the loop?',
            body: '<div>{{firstName}},</div><div><br /></div><div>I can close this thread if timing is not right.</div><div><br /></div><div>If you want a quick demo, reply with <b>Demo</b>.</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
    ],
  };

  const securityConsultantsSequence = {
    steps: [
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Quick question about hands-on security labs for your client programs',
            body: '<div>Hi {{firstName}},</div><div><br /></div><div>Quick question: are you delivering hands-on cyber training, assessments, or workshop-style programs for clients today?</div><div><br /></div><div>We help consulting and advisory teams run hosted labs and CTF-style exercises without spending time on setup and infrastructure.</div><div><br /></div><div>If useful, I can show you the shortest path to running a pilot with one client team.</div><div><br /></div><div>Would a 15-minute demo be useful?</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 3,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Re: hands-on security labs',
            body: '<div>{{firstName}}, quick follow-up.</div><div><br /></div><div>If client-facing lab delivery is relevant, I can send a short example of how consulting teams use hosted labs to speed up delivery.</div><div><br /></div><div>Should I send that over?</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Close the loop?',
            body: '<div>{{firstName}},</div><div><br /></div><div>I can close this thread if client lab delivery is not a priority right now.</div><div><br /></div><div>If a short demo helps, reply with <b>Demo</b>.</div><div><br /></div><div>Sincerely,<br />Hannah</div>',
          },
        ],
      },
    ],
  };

  const securityTrainingLeadersSequence = {
    steps: [
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Quick question about scaling hands-on cyber training at {{companyName}}',
            body: '<div>Hi {{firstName}},</div><div><br /></div><div>Are you responsible for practical cybersecurity training or enablement programs for your teams?</div><div><br /></div><div>We help security program owners launch hosted labs and CTF-style training without internal infrastructure overhead.</div><div><br /></div><div>If useful, I can show you a short pilot path your team could run this month.</div><div><br /></div><div>Would a 15-minute demo be useful?</div><div><br /></div><div>Sincerely,<br />Noah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 3,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Re: practical cyber training rollout',
            body: '<div>{{firstName}}, quick follow-up.</div><div><br /></div><div>If this is relevant, I can send a short outline showing how security teams use hosted labs for internal training and readiness programs.</div><div><br /></div><div>Should I send that over?</div><div><br /></div><div>Sincerely,<br />Noah</div>',
          },
        ],
      },
      {
        type: 'email',
        delay: 2,
        delay_unit: 'days',
        pre_delay_unit: 'days',
        variants: [
          {
            subject: 'Close the loop?',
            body: '<div>{{firstName}},</div><div><br /></div><div>I can close this out if practical cyber training is not a priority right now.</div><div><br /></div><div>If a short demo helps, reply with <b>Demo</b>.</div><div><br /></div><div>Sincerely,<br />Noah</div>',
          },
        ],
      },
    ],
  };

  return {
    educationDecisionMakersSequence,
    facultyInstructorsSequence,
    educationRecoverySequence,
    educatorSequence,
    ctfV2Sequence,
    securityCtaTightened,
    securityConsultantsSequence,
    securityTrainingLeadersSequence,
  };
}

function apolloSegmentQueries() {
  return [
    {
      segment: 'education_decision_makers_mena',
      campaign_name: 'SimLabs | Education Decision Makers - MENA',
      list_name: 'SimLabs - Education Decision Makers - MENA',
      query: {
        person_locations: ['Egypt', 'Saudi Arabia', 'United Arab Emirates'],
        person_titles: [
          'Program Director',
          'Director of Academic Programs',
          'Academic Director',
          'Training Director',
          'Director of Education',
          'Director of Training',
          'Head of Department',
          'Dean',
          'Associate Dean',
          'Assistant Dean',
          'Department Chair',
          'Director of Cybersecurity Program',
          'Cybersecurity Program Manager',
          'Computer Science Program Director',
          'Dean of IT and E-Learning',
          'Dean of Computer Science',
          'Head of Cyber Security Department',
          'Innovation Manager',
          'Learning and Development Manager',
          'Training Manager',
        ],
      },
    },
    {
      segment: 'faculty_instructors_mena',
      campaign_name: 'SimLabs | Faculty / Instructors - MENA',
      list_name: 'SimLabs - Faculty / Instructors - MENA',
      query: {
        person_locations: ['Egypt', 'Saudi Arabia', 'United Arab Emirates'],
        person_titles: [
          'Cybersecurity Instructor',
          'Information Security Instructor',
          'Computer Science Instructor',
          'Security Trainer',
          'Lecturer',
          'Assistant Professor',
          'Associate Professor',
          'Professor',
          'Curriculum Lead',
          'Course Coordinator',
          'Program Coordinator',
          'Lab Instructor',
          'Lab Coordinator',
          'Teaching Assistant',
        ],
      },
    },
    {
      segment: 'security_training_leaders',
      campaign_name: 'SimLabs | Security Training Leaders',
      list_name: 'SimLabs - Security Training Leaders',
      query: {
        person_locations: ['United States', 'United Kingdom', 'Saudi Arabia'],
        person_titles: [
          'Training Manager',
          'Security Awareness Manager',
          'Security Awareness Program Manager',
          'Program Manager Security Training & Education',
          'Security Training and Development Program Manager',
          'Program Manager, Cyber Security Training',
          'Security Training Manager',
          'Cybersecurity Training Manager',
          'Security Training Lead',
          'Cyber Security Training Lead',
          'Cyber Security Training, Education & Awareness Manager',
          'Security Training and Awareness Manager',
          'Senior Program Manager - Security Training and Awareness',
          'Senior Program Manager, Security Training & Awareness',
          'Security Training & Awareness Program Manager',
          'Director of Security Training',
          'Security Education Manager',
          'Security Enablement Manager',
          'Cybersecurity Awareness Manager',
          'Cybersecurity Enablement Manager',
          'Security Readiness Manager',
        ],
      },
    },
    {
      segment: 'security_expansion_apollo',
      campaign_name: 'SimLabs | Security Professionals',
      list_name: 'SimLabs - Security Expansion',
      query: {
        person_locations: ['United States', 'United Kingdom', 'Saudi Arabia'],
        person_titles: [
          'Head of Security',
          'Director of Security',
          'Security Manager',
          'Cybersecurity Manager',
          'Head of Cybersecurity',
          'Security Operations Manager',
          'Application Security Manager',
          'Director of Application Security',
          'Head of Application Security',
          'Product Security Manager',
          'Product Security Engineer',
          'Director of Product Security',
          'Cloud Security Manager',
          'Cloud Security Architect',
          'Platform Security Engineer',
          'Platform Security Manager',
          'SOC Manager',
          'Security Operations Center Manager',
          'Incident Response Manager',
          'Incident Response Lead',
          'Detection Engineering Manager',
          'Threat Detection Manager',
          'Blue Team Lead',
          'Defensive Security Engineer',
          'Offensive Security Consultant',
          'Red Team Lead',
          'Red Team Manager',
          'Offensive Security Engineer',
          'Penetration Testing Manager',
        ],
      },
    },
    {
      segment: 'security_professionals_apollo',
      campaign_name: 'SimLabs | Security Professionals',
      list_name: 'SimLabs - Security Engineers',
      query: {
        person_locations: ['United States', 'United Kingdom', 'Saudi Arabia'],
        person_titles: [
          'Security Engineer',
          'Cybersecurity Engineer',
          'Security Analyst',
          'SOC Analyst',
          'Security Architect',
          'Application Security Engineer',
          'Cloud Security Engineer',
          'Information Security Engineer',
          'Security Operations Engineer',
          'Defensive Security Engineer',
          'Detection Engineering Manager',
          'Threat Detection Manager',
          'Incident Response Engineer',
          'Blue Team Lead',
          'Detection Engineer',
          'Threat Detection Engineer',
          'Blue Team Engineer',
          'SOC Engineer',
        ],
      },
    },
    {
      segment: 'security_consultants',
      campaign_name: 'SimLabs | Security Consultants',
      list_name: 'SimLabs - Security Consultants',
      query: {
        person_locations: ['United States', 'United Kingdom', 'Saudi Arabia'],
        person_titles: [
          'Security Consultant',
          'Cybersecurity Consultant',
          'Information Security Consultant',
          'Senior Security Consultant',
          'Principal Security Consultant',
          'Managing Consultant',
          'Managing Consultant Cybersecurity',
          'Security Advisory Consultant',
          'Security Transformation Consultant',
          'Security Solutions Consultant',
          'Security Risk Consultant',
          'Offensive Security Consultant',
          'GRC Consultant',
        ],
      },
    },
    {
      segment: 'educators',
      campaign_name: 'SimLabs | Educators (US/UK/Saudi)',
      list_name: 'SimLabs - Educators (US/UK/Saudi)',
      query: {
        person_locations: ['United States', 'United Kingdom', 'Saudi Arabia', 'Netherlands', 'Germany'],
        person_titles: [
          'Dean',
          'Associate Dean',
          'Head of Department',
          'Department Chair',
          'Program Director',
          'Academic Director',
          'Director of Education',
          'Director of Cybersecurity Program',
          'Cybersecurity Instructor',
          'Information Security Instructor',
          'Computer Science Instructor',
          'Assistant Professor',
          'Associate Professor',
          'Professor',
          'Lecturer',
          'Curriculum Lead',
          'Course Coordinator',
          'Lab Instructor',
          'Lab Coordinator',
          'Security Trainer',
        ],
      },
    },
    {
      segment: 'ctf_organizers_v2',
      campaign_name: 'SimLabs | CTF Organizers v2 (Spotlight Program)',
      list_name: 'SimLabs - CTF Organizers v2 (Spotlight)',
      query: {
        person_locations: ['United States', 'United Kingdom', 'Saudi Arabia'],
        person_titles: [
          'Community Manager',
          'Security Program Manager',
          'Head of Security',
          'SOC Manager',
          'Cybersecurity Lead',
          'Founder',
          'Director of Security',
        ],
      },
    },
  ];
}

function instantlySupersearchSegments() {
  const locations = [
    { country: 'United States' },
    { country: 'United Kingdom' },
    { country: 'Saudi Arabia' },
  ];

  return [
    {
      segment: 'security_professionals',
      campaign_name: 'SimLabs | Security Professionals',
      tracking_list_name: 'SimLabs - Security Professionals (Instantly Supersearch)',
      search_name: 'SimLabs Security Professionals Instantly',
      search_filters: {
        locations,
        title: {
          include: [
            'Security Engineer',
            'Cyber Security Engineer',
            'Cybersecurity Engineer',
            'Application Security Engineer',
            'Cloud Security Engineer',
            'Security Architect',
            'SOC Manager',
          ],
        },
        department: ['IT & IS', 'Engineering'],
        level: ['Mid-Senior level', 'Manager-Level', 'Director-Level'],
        show_one_lead_per_company: true,
        skip_owned_leads: true,
        location_mode: 'contact',
      },
    },
    {
      segment: 'security_consultants',
      campaign_name: 'SimLabs | Security Consultants',
      tracking_list_name: 'SimLabs - Security Consultants (Instantly Supersearch)',
      search_name: 'SimLabs Security Consultants Instantly',
      search_filters: {
        locations,
        title: {
          include: [
            'Security Consultant',
            'Cyber Security Consultant',
            'Cybersecurity Consultant',
            'Principal Security Consultant',
            'Lead Security Consultant',
            'Security Advisory Consultant',
            'Offensive Security Consultant',
            'GRC Consultant',
          ],
        },
        department: ['IT & IS', 'Engineering'],
        level: ['Mid-Senior level', 'Manager-Level', 'Director-Level', 'VP-Level', 'Owner'],
        show_one_lead_per_company: true,
        skip_owned_leads: true,
        location_mode: 'contact',
      },
    },
  ];
}

function normalizeApolloContact(contact, segmentDef) {
  const email = normalizeEmail(contact.email);
  const companyDomain =
    contact.account?.primary_domain ||
    (contact.account?.website_url ? String(contact.account.website_url).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : '') ||
    emailDomain(email);

  return {
    email,
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    title: contact.title || '',
    company: contact.organization_name || contact.account?.name || '',
    company_domain: companyDomain || '',
    country: contact.country || parseCountryFromAddress(contact.present_raw_address || ''),
    linkedin: contact.linkedin_url || '',
    website: contact.account?.website_url || '',
    city: contact.city || '',
    state: contact.state || '',
    email_status: contact.email_status || contact.email_true_status || '',
    source_system: 'apollo_contacts',
    source_ref: contact.id || '',
    apollo_person_id: contact.person_id || '',
    segment: segmentDef.segment,
    campaign_name: segmentDef.campaign_name,
    instantly_list_name: segmentDef.list_name,
    created_at: contact.created_at || '',
    raw_contact: contact,
  };
}

function qualityGate(record) {
  if (!record.email) return { accepted: false, reason: 'missing_email' };
  if (!isValidEmail(record.email)) return { accepted: false, reason: 'invalid_email' };
  if (!isBusinessEmail(record.email)) return { accepted: false, reason: 'free_email_domain' };
  if (!record.company) return { accepted: false, reason: 'missing_company' };
  if (!record.title) return { accepted: false, reason: 'missing_title' };
  if (!record.country) return { accepted: false, reason: 'missing_country' };
  if (!String(record.email_status || '').toLowerCase().includes('verif')) {
    return { accepted: false, reason: 'email_not_verified' };
  }
  return { accepted: true, reason: '' };
}

function findSimlabsCampaigns(campaigns) {
  return campaigns.filter((c) => /simlabs?/i.test(c.name || ''));
}

function copyFileSafe(src, dst) {
  if (fs.existsSync(src)) {
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
  }
}

async function runSnapshot(instantly) {
  ensureDir(PATHS.raw);
  ensureDir(PATHS.baselines);

  const campaigns = await instantly.listAllCampaigns();
  const leadLists = await instantly.listLeadLists();
  const analytics = await instantly.getCampaignAnalytics();
  const simCampaigns = findSimlabsCampaigns(campaigns);

  const simDetails = [];
  const simEventsByCampaign = {};
  for (const campaign of simCampaigns) {
    const detail = await instantly.getCampaign(campaign.id);
    simDetails.push(detail);
    const events = await instantly.getEmailsByCampaign(campaign.id);
    simEventsByCampaign[campaign.id] = {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      total_events: events.length,
      items: events,
    };
  }

  const analyticsByCampaign = Object.fromEntries((analytics || []).map((a) => [a.campaign_id, a]));
  const simAnalytics = simCampaigns
    .map((c) => analyticsByCampaign[c.id])
    .filter(Boolean);

  const snapshotAt = isoNow();
  const snapshot = {
    fetchedAt: snapshotAt,
    campaigns,
    leadLists,
    analytics,
    simCampaignIds: simCampaigns.map((c) => c.id),
  };

  writeJson(path.join(PATHS.raw, 'instantly_campaigns_live.json'), { fetchedAt: snapshotAt, items: campaigns });
  writeJson(path.join(PATHS.raw, 'instantly_lead_lists_live.json'), { fetchedAt: snapshotAt, items: leadLists });
  writeJson(path.join(PATHS.raw, 'instantly_campaign_analytics_live_all.json'), analytics);
  writeJson(path.join(PATHS.raw, 'instantly_simlabs_campaigns_live.json'), { fetchedAt: snapshotAt, items: simCampaigns });
  writeJson(path.join(PATHS.raw, 'instantly_simlabs_campaigns_filtered_live.json'), { fetchedAt: snapshotAt, items: simCampaigns });
  writeJson(path.join(PATHS.raw, 'instantly_simlabs_campaign_details_live.json'), { fetchedAt: snapshotAt, items: simDetails });
  writeJson(path.join(PATHS.raw, 'instantly_simlabs_campaign_details.json'), { fetchedAt: snapshotAt, items: simDetails });
  writeJson(path.join(PATHS.raw, 'instantly_simlabs_campaign_analytics_live.json'), { fetchedAt: snapshotAt, items: simAnalytics });

  const eventsFlat = Object.values(simEventsByCampaign).flatMap((x) => x.items);
  writeJson(path.join(PATHS.raw, 'instantly_simlabs_email_events_live.json'), {
    fetchedAt: snapshotAt,
    campaigns: simEventsByCampaign,
    items: eventsFlat,
  });
  writeJson(path.join(PATHS.raw, 'instantly_simlabs_email_activity_live.json'), {
    fetchedAt: snapshotAt,
    items: eventsFlat,
  });

  const baselineDir = path.join(PATHS.baselines, `snapshot_${tsStamp()}`);
  ensureDir(baselineDir);
  writeJson(path.join(baselineDir, 'snapshot_manifest.json'), {
    createdAt: snapshotAt,
    totalCampaigns: campaigns.length,
    simCampaigns: simCampaigns.length,
    totalLeadLists: leadLists.length,
    files: [
      'instantly_campaigns_live.json',
      'instantly_lead_lists_live.json',
      'instantly_campaign_analytics_live_all.json',
      'instantly_simlabs_campaigns_live.json',
      'instantly_simlabs_campaign_details_live.json',
      'instantly_simlabs_campaign_analytics_live.json',
      'instantly_simlabs_email_events_live.json',
    ],
  });

  copyFileSafe(path.join(PATHS.raw, 'instantly_campaigns_live.json'), path.join(baselineDir, 'instantly_campaigns_live.json'));
  copyFileSafe(path.join(PATHS.raw, 'instantly_lead_lists_live.json'), path.join(baselineDir, 'instantly_lead_lists_live.json'));
  copyFileSafe(path.join(PATHS.raw, 'instantly_campaign_analytics_live_all.json'), path.join(baselineDir, 'instantly_campaign_analytics_live_all.json'));
  copyFileSafe(path.join(PATHS.raw, 'instantly_simlabs_campaigns_live.json'), path.join(baselineDir, 'instantly_simlabs_campaigns_live.json'));
  copyFileSafe(path.join(PATHS.raw, 'instantly_simlabs_campaign_details_live.json'), path.join(baselineDir, 'instantly_simlabs_campaign_details_live.json'));
  copyFileSafe(path.join(PATHS.raw, 'instantly_simlabs_campaign_analytics_live.json'), path.join(baselineDir, 'instantly_simlabs_campaign_analytics_live.json'));
  copyFileSafe(path.join(PATHS.raw, 'instantly_simlabs_email_events_live.json'), path.join(baselineDir, 'instantly_simlabs_email_events_live.json'));

  writeJson(path.join(PATHS.raw, 'simlabs_snapshot_summary.json'), {
    fetchedAt: snapshotAt,
    totalCampaigns: campaigns.length,
    simlabsCampaigns: simCampaigns.map((c) => ({ id: c.id, name: c.name, status: c.status, updated: c.timestamp_updated })),
    totalLeadLists: leadLists.length,
    simlabsLeadLists: leadLists.filter((x) => /simlabs?/i.test(x.name || '')),
    analyticsRows: analytics.length,
    simAnalyticsRows: simAnalytics.length,
    totalSimEmailEvents: eventsFlat.length,
  });

  writeJson(path.join(PATHS.raw, 'simlabs_outreach_snapshot_raw.json'), snapshot);

  return {
    fetchedAt: snapshotAt,
    campaigns,
    leadLists,
    analytics,
    simCampaigns,
    simDetails,
    simEventsByCampaign,
  };
}

async function runApolloEnrichment(apollo, options = {}) {
  ensureDir(PATHS.apolloInsights);
  ensureDir(PATHS.raw);

  const perPage = asPositiveNumber(options.perPage, 100);
  const targetPerSegment = asPositiveNumber(options.targetPerSegment, 500);
  const pageDelayMs = asPositiveNumber(options.pageDelayMs, 1500);
  const segmentDelayMs = asPositiveNumber(options.segmentDelayMs, 5000);
  const segmentFilter = new Set((options.segments || []).map((x) => String(x).trim()).filter(Boolean));

  const health = await apollo.health();
  if (!health?.healthy || !health?.is_logged_in) {
    throw new Error(`Apollo health failed: ${JSON.stringify(health)}`);
  }

  const segmentDefs = apolloSegmentQueries().filter((segmentDef) => (
    segmentFilter.size === 0 || segmentFilter.has(segmentDef.segment)
  ));
  const accepted = [];
  const nurture = [];
  const seenEmails = new Set();
  const segmentStats = [];

  for (let idx = 0; idx < segmentDefs.length; idx += 1) {
    const segmentDef = segmentDefs[idx];
    let page = 1;
    let fetched = 0;
    let acceptedCount = 0;
    let nurtureCount = 0;
    let totalEntries = null;

    while (acceptedCount < targetPerSegment) {
      const payload = {
        page,
        per_page: perPage,
        ...segmentDef.query,
      };
      const data = await apollo.searchContacts(payload);
      const contacts = data.contacts || [];
      totalEntries = data.pagination?.total_entries ?? totalEntries;
      if (contacts.length === 0) break;

      for (const contact of contacts) {
        const normalized = normalizeApolloContact(contact, segmentDef);
        fetched += 1;

        if (!normalized.email) continue;
        if (seenEmails.has(normalized.email)) continue;

        const gate = qualityGate(normalized);
        const row = {
          ...normalized,
          lead_key: toLeadKey(normalized.email),
          suppression_reason: gate.accepted ? '' : gate.reason,
        };
        seenEmails.add(normalized.email);

        if (gate.accepted) {
          accepted.push(row);
          acceptedCount += 1;
          if (acceptedCount >= targetPerSegment) break;
        } else {
          nurture.push(row);
          nurtureCount += 1;
        }
      }

      const totalPages = data.pagination?.total_pages || 0;
      if (totalPages && page >= totalPages) break;
      page += 1;
      if (page > 1000) break;
      await sleep(pageDelayMs);
    }

    segmentStats.push({
      segment: segmentDef.segment,
      campaign_name: segmentDef.campaign_name,
      list_name: segmentDef.list_name,
      fetched,
      accepted: acceptedCount,
      nurture: nurtureCount,
      total_entries_hint: totalEntries,
    });

    if (idx < segmentDefs.length - 1) {
      await sleep(segmentDelayMs);
    }
  }

  const fetchedAt = isoNow();
  const output = {
    fetchedAt,
    health,
    options: {
      perPage,
      targetPerSegment,
      pageDelayMs,
      segmentDelayMs,
      segments: [...segmentFilter],
    },
    segments: segmentStats,
    accepted,
    nurture,
  };

  writeJson(path.join(PATHS.raw, 'apollo_simlabs_enrichment_live.json'), output);
  writeJson(path.join(PATHS.apolloInsights, `apollo_simlabs_enrichment_${todayStamp()}.json`), output);

  const acceptedCsvRows = accepted.map((x) => ({
    email: x.email,
    first_name: x.first_name,
    last_name: x.last_name,
    title: x.title,
    company: x.company,
    company_domain: x.company_domain,
    country: x.country,
    city: x.city,
    state: x.state,
    email_status: x.email_status,
    segment: x.segment,
    campaign_name: x.campaign_name,
    instantly_list_name: x.instantly_list_name,
    source_ref: x.source_ref,
    apollo_person_id: x.apollo_person_id,
    linkedin: x.linkedin,
    website: x.website,
  }));

  const nurtureCsvRows = nurture.map((x) => ({
    email: x.email,
    first_name: x.first_name,
    last_name: x.last_name,
    title: x.title,
    company: x.company,
    company_domain: x.company_domain,
    country: x.country,
    email_status: x.email_status,
    segment: x.segment,
    suppression_reason: x.suppression_reason,
    source_ref: x.source_ref,
  }));

  writeCsv(
    path.join(PATHS.apolloInsights, `apollo_simlabs_accepted_${todayStamp()}.csv`),
    acceptedCsvRows,
    [
      'email',
      'first_name',
      'last_name',
      'title',
      'company',
      'company_domain',
      'country',
      'city',
      'state',
      'email_status',
      'segment',
      'campaign_name',
      'instantly_list_name',
      'source_ref',
      'apollo_person_id',
      'linkedin',
      'website',
    ],
  );

  writeCsv(
    path.join(PATHS.apolloInsights, `apollo_simlabs_nurture_${todayStamp()}.csv`),
    nurtureCsvRows,
    [
      'email',
      'first_name',
      'last_name',
      'title',
      'company',
      'company_domain',
      'country',
      'email_status',
      'segment',
      'suppression_reason',
      'source_ref',
    ],
  );

  return output;
}

function getLatestApolloEnrichment() {
  const data = readJsonSafe(path.join(PATHS.raw, 'apollo_simlabs_enrichment_live.json'), null);
  if (!data) {
    return { accepted: [], nurture: [] };
  }
  return data;
}

function getLatestInstantlyEnrichedContacts() {
  return readJsonSafe(path.join(PATHS.raw, 'instantly_enriched_contacts_live.json'), {
    generatedAt: '',
    total_unique_contacts: 0,
    contacts: [],
  });
}

function getLatestSnapshotData() {
  const analytics = readJsonSafe(path.join(PATHS.raw, 'instantly_simlabs_campaign_analytics_live.json'), { items: [] });
  const events = readJsonSafe(path.join(PATHS.raw, 'instantly_simlabs_email_events_live.json'), { items: [] });
  const campaigns = readJsonSafe(path.join(PATHS.raw, 'instantly_simlabs_campaigns_live.json'), { items: [] });
  const leadLists = readJsonSafe(path.join(PATHS.raw, 'instantly_lead_lists_live.json'), { items: [] });
  return {
    analytics: analytics.items || analytics || [],
    events: events.items || [],
    campaigns: campaigns.items || [],
    leadLists: leadLists.items || [],
  };
}

function loadLocalUnifiedLeads() {
  return readJsonSafe(path.join(PATHS.leadsInsights, 'simlabs_unified_leads.json'), []);
}

function loadSystemeCandidates() {
  const data = readJsonSafe(path.join(PATHS.raw, 'systeme_simlabs_candidates.json'), {});
  return data.contactsCandidates || [];
}

function buildEventIndex(events = []) {
  const byEmail = {};
  const bySender = {};
  const byCampaignSender = {};

  for (const e of events) {
    const email = normalizeEmail(e.lead || e.to_address_email_list || '');
    const sender = normalizeEmail(e.from_address_email || e.eaccount || '');
    const ts = e.timestamp_email || e.timestamp_created || '';

    if (email) {
      if (!byEmail[email] || (ts && ts > byEmail[email].last_activity_at)) {
        byEmail[email] = {
          last_activity_at: ts,
          campaign_id: e.campaign_id || '',
          ue_type_counts: {},
        };
      }
      const key = String(e.ue_type ?? 'unknown');
      byEmail[email].ue_type_counts[key] = (byEmail[email].ue_type_counts[key] || 0) + 1;
    }

    if (sender) {
      bySender[sender] = (bySender[sender] || 0) + 1;
      const csKey = `${e.campaign_id || 'unknown'}::${sender}`;
      byCampaignSender[csKey] = (byCampaignSender[csKey] || 0) + 1;
    }
  }

  return { byEmail, bySender, byCampaignSender };
}

function mergeRecord(target, incoming) {
  for (const field of REQUIRED_FIELDS) {
    if (target[field] === undefined || target[field] === null || target[field] === '') {
      if (incoming[field] !== undefined && incoming[field] !== null && incoming[field] !== '') {
        target[field] = incoming[field];
      }
    }
  }

  target.replied_flag = Boolean(target.replied_flag || incoming.replied_flag);
  target.bounced_flag = Boolean(target.bounced_flag || incoming.bounced_flag);

  if (!target.suppression_reason && incoming.suppression_reason) {
    target.suppression_reason = incoming.suppression_reason;
  }

  if (!target.last_activity_at || (incoming.last_activity_at && incoming.last_activity_at > target.last_activity_at)) {
    target.last_activity_at = incoming.last_activity_at || target.last_activity_at;
  }
}

function buildSuppressionReason(email, base = '') {
  if (!email) return base || 'missing_email';
  if (!isValidEmail(email)) return base || 'invalid_email';
  if (!isBusinessEmail(email)) return base || 'free_email_domain';
  return base || '';
}

function normalizeMasterRecord(record) {
  const out = {};
  for (const f of REQUIRED_FIELDS) {
    out[f] = record[f] ?? '';
  }
  out.replied_flag = boolToInt(Boolean(record.replied_flag));
  out.bounced_flag = boolToInt(Boolean(record.bounced_flag));
  return out;
}

async function runBuildMaster() {
  ensureDir(PATHS.leadsInsights);

  const localLeads = loadLocalUnifiedLeads();
  const systemeCandidates = loadSystemeCandidates();
  const apollo = getLatestApolloEnrichment();
  const instantlyEnriched = getLatestInstantlyEnrichedContacts();
  const snapshot = getLatestSnapshotData();
  const eventIndex = buildEventIndex(snapshot.events || []);

  const master = new Map();

  function upsert(rec) {
    const key = rec.lead_key;
    if (!key) return;
    if (!master.has(key)) {
      master.set(key, { ...rec });
      return;
    }
    const current = master.get(key);
    mergeRecord(current, rec);
    master.set(key, current);
  }

  for (const lead of localLeads) {
    const email = normalizeEmail(lead.lead_email || '');
    const fallback = `${(lead.company || '').toLowerCase()}|${(lead.lead_name || '').toLowerCase()}|${lead.source_task_ids || ''}`;
    const key = toLeadKey(email, fallback || crypto.randomUUID());
    const name = parseName(lead.lead_name || '');
    const event = email ? eventIndex.byEmail[email] : null;
    const suppression = buildSuppressionReason(email);

    upsert({
      lead_key: key,
      email,
      first_name: name.first,
      last_name: name.last,
      title: lead.use_case || '',
      company: lead.company || '',
      company_domain: emailDomain(email),
      country: lead.country || '',
      segment: deriveSegmentFromUseCase(lead.use_case, lead.source),
      source_system: 'local_unified',
      source_ref: lead.source_task_ids || '',
      apollo_person_id: '',
      instantly_campaign_id: event?.campaign_id || '',
      instantly_list_name: '',
      email_status: '',
      lifecycle_stage: deriveLifecycleFromStatus(lead.lead_status),
      assigned_owner: lead.owner || '',
      last_activity_at: event?.last_activity_at || '',
      replied_flag: false,
      bounced_flag: false,
      suppression_reason: suppression,
    });
  }

  for (const contact of systemeCandidates) {
    const email = normalizeEmail(contact.email || '');
    const key = toLeadKey(email, `systeme|${contact.id}`);
    const suppressionBase = contact.bounced ? 'systeme_bounced' : (contact.unsubscribed ? 'systeme_unsubscribed' : '');
    const suppression = buildSuppressionReason(email, suppressionBase);

    upsert({
      lead_key: key,
      email,
      first_name: '',
      last_name: '',
      title: '',
      company: '',
      company_domain: emailDomain(email),
      country: '',
      segment: (contact.tags || []).map((t) => t.name).join('|') || 'systeme_candidate',
      source_system: 'systeme',
      source_ref: String(contact.id || ''),
      apollo_person_id: '',
      instantly_campaign_id: '',
      instantly_list_name: '',
      email_status: contact.needsConfirmation ? 'needs_confirmation' : 'unknown',
      lifecycle_stage: 'new',
      assigned_owner: '',
      last_activity_at: contact.registeredAt || '',
      replied_flag: false,
      bounced_flag: Boolean(contact.bounced),
      suppression_reason: suppression,
    });
  }

  for (const entry of [...(apollo.accepted || []), ...(apollo.nurture || [])]) {
    const email = normalizeEmail(entry.email || '');
    const key = toLeadKey(email, `apollo|${entry.source_ref || ''}`);
    const suppression = buildSuppressionReason(email, entry.suppression_reason || '');

    upsert({
      lead_key: key,
      email,
      first_name: entry.first_name || '',
      last_name: entry.last_name || '',
      title: entry.title || '',
      company: entry.company || '',
      company_domain: entry.company_domain || emailDomain(email),
      country: entry.country || '',
      segment: entry.segment || 'apollo_unknown',
      source_system: 'apollo_contacts',
      source_ref: entry.source_ref || '',
      apollo_person_id: entry.apollo_person_id || '',
      instantly_campaign_id: '',
      instantly_list_name: entry.instantly_list_name || '',
      email_status: entry.email_status || '',
      lifecycle_stage: 'new',
      assigned_owner: '',
      last_activity_at: entry.created_at || '',
      replied_flag: false,
      bounced_flag: false,
      suppression_reason: suppression,
    });
  }

  for (const entry of instantlyEnriched.contacts || []) {
    const email = normalizeEmail(entry.email || '');
    const key = toLeadKey(email, `instantly_enriched|${entry.source_ref || ''}`);
    const suppression = buildSuppressionReason(email, entry.suppression_reason || '');

    upsert({
      lead_key: key,
      email,
      first_name: entry.first_name || '',
      last_name: entry.last_name || '',
      title: entry.title || '',
      company: entry.company || '',
      company_domain: entry.company_domain || emailDomain(email),
      country: entry.country || '',
      segment: entry.segment || 'instantly_enriched',
      source_system: 'instantly_enriched',
      source_ref: entry.source_ref || '',
      apollo_person_id: '',
      instantly_campaign_id: entry.instantly_campaign_id || '',
      instantly_list_name: entry.instantly_list_name || '',
      email_status: entry.email_status || '',
      lifecycle_stage: entry.lifecycle_stage || 'outreach_sent',
      assigned_owner: entry.assigned_owner || '',
      last_activity_at: entry.last_activity_at || '',
      replied_flag: Boolean(entry.replied_flag),
      bounced_flag: Boolean(entry.bounced_flag),
      suppression_reason: suppression,
    });
  }

  const masterRows = [...master.values()].map(normalizeMasterRecord);
  masterRows.sort((a, b) => (a.email || a.source_ref).localeCompare(b.email || b.source_ref));

  writeJson(PATHS.masterLeadsJson, {
    generatedAt: isoNow(),
    total: masterRows.length,
    rows: masterRows,
  });
  writeCsv(PATHS.masterLeadsCsv, masterRows, REQUIRED_FIELDS);

  const suppression = {
    generatedAt: isoNow(),
    hard_bounces: masterRows.filter((r) => Number(r.bounced_flag) === 1).map((r) => r.email).filter(Boolean),
    prior_replies: masterRows.filter((r) => Number(r.replied_flag) === 1).map((r) => r.email).filter(Boolean),
    invalid_or_missing: masterRows.filter((r) => r.suppression_reason).map((r) => ({ email: r.email, reason: r.suppression_reason })),
  };
  writeJson(PATHS.suppressionJson, suppression);

  return {
    total: masterRows.length,
    suppressed: suppression.invalid_or_missing.length,
  };
}

function computeCampaignMetrics(analyticsRows = []) {
  return analyticsRows.map((x) => {
    const sent = Number(x.emails_sent_count || 0);
    const replies = Number(x.reply_count || 0);
    const bounces = Number(x.bounced_count || 0);
    const unsub = Number(x.unsubscribed_count || 0);
    const replyRate = sent ? (replies / sent) * 100 : 0;
    const bounceRate = sent ? (bounces / sent) * 100 : 0;

    return {
      campaign_id: x.campaign_id,
      campaign_name: x.campaign_name,
      status: x.campaign_status,
      leads: Number(x.leads_count || 0),
      contacted: Number(x.contacted_count || 0),
      sent,
      replies,
      bounces,
      unsub,
      completed: Number(x.completed_count || 0),
      reply_rate_pct: Number(replyRate.toFixed(3)),
      bounce_rate_pct: Number(bounceRate.toFixed(3)),
    };
  });
}

async function runScorecard() {
  ensureDir(PATHS.scorecards);
  const snapshot = getLatestSnapshotData();
  const metrics = computeCampaignMetrics(snapshot.analytics || []);
  const eventIndex = buildEventIndex(snapshot.events || []);

  const campaignSenderBreakdown = [];
  for (const [key, count] of Object.entries(eventIndex.byCampaignSender)) {
    const [campaignId, sender] = key.split('::');
    const campaign = (snapshot.campaigns || []).find((c) => c.id === campaignId);
    campaignSenderBreakdown.push({
      campaign_id: campaignId,
      campaign_name: campaign?.name || campaignId,
      sender,
      events: count,
    });
  }
  campaignSenderBreakdown.sort((a, b) => b.events - a.events);

  const date = todayStamp();
  const mdPath = path.join(PATHS.scorecards, `${date}_SIMLABS_DAILY_SCORECARD.md`);
  const latestPath = path.join(PATHS.scorecards, 'latest_SIMLABS_DAILY_SCORECARD.md');

  const lines = [];
  lines.push('# Simulations Labs Daily Outreach Scorecard');
  lines.push('');
  lines.push(`- Generated at: ${isoNow()}`);
  lines.push(`- Campaigns covered: ${metrics.length}`);
  lines.push(`- Email events sampled: ${snapshot.events.length}`);
  lines.push('');
  lines.push('## Campaign Metrics');
  lines.push('');
  lines.push('| Campaign | Sent | Replies | Reply Rate | Bounces | Bounce Rate | Unsub | Status |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');

  for (const row of metrics) {
    lines.push(`| ${row.campaign_name} | ${row.sent} | ${row.replies} | ${row.reply_rate_pct}% | ${row.bounces} | ${row.bounce_rate_pct}% | ${row.unsub} | ${row.status} |`);
  }

  lines.push('');
  lines.push('## Sender Activity (from event log)');
  lines.push('');
  lines.push('| Campaign | Sender | Event Count |');
  lines.push('|---|---|---:|');

  for (const row of campaignSenderBreakdown.slice(0, 100)) {
    lines.push(`| ${row.campaign_name} | ${row.sender} | ${row.events} |`);
  }

  lines.push('');
  lines.push('## Health Gates');
  lines.push('');
  for (const row of metrics) {
    const bounceFlag = row.bounce_rate_pct > 6 ? 'ALERT' : (row.bounce_rate_pct > 4.5 ? 'WARN' : 'OK');
    const replyFlag = row.reply_rate_pct >= 1 ? 'OK' : (row.reply_rate_pct >= 0.6 ? 'WARN' : 'ALERT');
    lines.push(`- ${row.campaign_name}: bounce=${row.bounce_rate_pct}% (${bounceFlag}), reply=${row.reply_rate_pct}% (${replyFlag})`);
  }

  const md = `${lines.join('\n')}\n`;
  fs.writeFileSync(mdPath, md, 'utf8');
  fs.writeFileSync(latestPath, md, 'utf8');

  writeJson(path.join(PATHS.scorecards, `${date}_SIMLABS_DAILY_SCORECARD.json`), {
    generatedAt: isoNow(),
    campaign_metrics: metrics,
    sender_breakdown: campaignSenderBreakdown,
  });

  return {
    markdown: mdPath,
    campaigns: metrics.length,
  };
}

async function runInstantlyEnrichment(instantly, options = {}) {
  const targetUnique = asPositiveNumber(options.targetUnique, 1000);
  const maxPages = asPositiveNumber(options.maxPages, 500);
  const pageDelayMs = asPositiveNumber(options.pageDelayMs, 2000);

  const campaigns = await instantly.listAllCampaigns();
  const campaignNameById = Object.fromEntries((campaigns || []).map((c) => [c.id, c.name]));
  const contactsByEmail = new Map();

  let cursor = null;
  let pages = 0;
  while (true) {
    pages += 1;
    const data = await instantly.request('GET', '/emails', {
      params: {
        limit: 100,
        ...(cursor ? { starting_after: cursor } : {}),
      },
    });
    const items = data.items || [];
    for (const item of items) {
      const email = normalizeEmail(item.lead || item.to_address_email_list || '');
      if (!email || !isValidEmail(email)) continue;
      const domain = emailDomain(email);
      const existing = contactsByEmail.get(email) || null;
      const candidate = {
        lead_key: toLeadKey(email),
        email,
        first_name: '',
        last_name: '',
        title: '',
        company: '',
        company_domain: domain,
        country: '',
        segment: 'instantly_enriched',
        source_system: 'instantly_enriched',
        source_ref: item.id || '',
        apollo_person_id: '',
        instantly_campaign_id: item.campaign_id || '',
        instantly_list_name: campaignNameById[item.campaign_id || ''] || '',
        email_status: '',
        lifecycle_stage: 'outreach_sent',
        assigned_owner: '',
        last_activity_at: item.timestamp_email || item.timestamp_created || '',
        replied_flag: false,
        bounced_flag: false,
        suppression_reason: buildSuppressionReason(email),
      };
      if (!existing || (candidate.last_activity_at && candidate.last_activity_at > existing.last_activity_at)) {
        contactsByEmail.set(email, candidate);
      }
    }
    cursor = data.next_starting_after || null;
    if (!cursor || items.length === 0 || pages >= maxPages || contactsByEmail.size >= targetUnique) break;
    await sleep(pageDelayMs);
  }

  const contacts = [...contactsByEmail.values()].slice(0, targetUnique);
  const generatedAt = isoNow();
  const output = {
    generatedAt,
    target_unique: targetUnique,
    total_unique_contacts: contacts.length,
    pages_fetched: pages,
    page_delay_ms: pageDelayMs,
    contacts,
  };

  writeJson(path.join(PATHS.raw, 'instantly_enriched_contacts_live.json'), output);
  writeCsv(
    path.join(PATHS.leadsInsights, 'instantly_enriched_contacts_live.csv'),
    contacts,
    REQUIRED_FIELDS,
  );

  return output;
}

async function runInstantlySupersearchPreview(instantly, options = {}) {
  ensureDir(PATHS.raw);
  const delayMs = asPositiveNumber(options.delayMs, 4000);
  const segmentFilter = String(options.segment || '').trim().toLowerCase();
  const segmentDefs = instantlySupersearchSegments().filter((segmentDef) => {
    if (!segmentFilter) return true;
    return segmentDef.segment.toLowerCase() === segmentFilter;
  });

  if (segmentDefs.length === 0) {
    throw new Error(`No Instantly Supersearch segment matched "${options.segment}".`);
  }

  const previews = [];
  for (let idx = 0; idx < segmentDefs.length; idx += 1) {
    const segmentDef = segmentDefs[idx];
    const data = await instantly.previewSupersearch({
      search_filters: segmentDef.search_filters,
    });
    previews.push({
      segment: segmentDef.segment,
      campaign_name: segmentDef.campaign_name,
      tracking_list_name: segmentDef.tracking_list_name,
      search_name: segmentDef.search_name,
      number_of_leads: Number(data.number_of_leads || 0),
      number_of_redacted_results: Number(data.number_of_redacted_results || 0),
      sample_leads: (data.leads || []).slice(0, 10),
    });
    if (idx < segmentDefs.length - 1) {
      await sleep(delayMs);
    }
  }

  const output = {
    generatedAt: isoNow(),
    options: {
      delayMs,
      segment: options.segment || null,
    },
    previews,
  };
  writeJson(path.join(PATHS.raw, 'instantly_supersearch_preview_live.json'), output);
  return output;
}

async function runInstantlySupersearchEnrich(instantly, options = {}) {
  ensureDir(PATHS.raw);
  const delayMs = asPositiveNumber(options.delayMs, 8000);
  const limitPerSegment = asPositiveNumber(options.limitPerSegment, 25);
  const createTrackingLists = Boolean(options.createTrackingLists);
  const segmentFilter = String(options.segment || '').trim().toLowerCase();
  const segmentDefs = instantlySupersearchSegments().filter((segmentDef) => {
    if (!segmentFilter) return true;
    return segmentDef.segment.toLowerCase() === segmentFilter;
  });

  if (segmentDefs.length === 0) {
    throw new Error(`No Instantly Supersearch segment matched "${options.segment}".`);
  }

  const campaigns = await instantly.listAllCampaigns();
  const leadLists = await instantly.listLeadLists();
  const results = [];

  for (let idx = 0; idx < segmentDefs.length; idx += 1) {
    const segmentDef = segmentDefs[idx];
    const campaign = campaigns.find((entry) => (entry.name || '').toLowerCase() === segmentDef.campaign_name.toLowerCase());
    if (!campaign) {
      results.push({
        segment: segmentDef.segment,
        campaign_name: segmentDef.campaign_name,
        status: 'error',
        message: 'Target campaign not found.',
      });
      continue;
    }

    let trackingList = null;
    if (createTrackingLists) {
      trackingList = await ensureLeadList(instantly, leadLists, segmentDef.tracking_list_name);
    }

    try {
      const response = await instantly.enrichFromSupersearch({
        search_filters: segmentDef.search_filters,
        limit: limitPerSegment,
        search_name: `${segmentDef.search_name} ${todayStamp()}`,
        work_email_enrichment: true,
        fully_enriched_profile: true,
        custom_flow: ['instantly'],
        resource_id: campaign.id,
        resource_type: 1,
        auto_update: false,
        skip_rows_without_email: true,
      });
      results.push({
        segment: segmentDef.segment,
        campaign_name: segmentDef.campaign_name,
        tracking_list_name: trackingList?.name || segmentDef.tracking_list_name,
        tracking_list_id: trackingList?.id || '',
        campaign_id: campaign.id,
        status: 'requested',
        limit: limitPerSegment,
        response,
      });
    } catch (err) {
      results.push({
        segment: segmentDef.segment,
        campaign_name: segmentDef.campaign_name,
        tracking_list_name: trackingList?.name || segmentDef.tracking_list_name,
        tracking_list_id: trackingList?.id || '',
        campaign_id: campaign.id,
        status: 'error',
        limit: limitPerSegment,
        message: String(err.message || err),
      });
    }

    if (idx < segmentDefs.length - 1) {
      await sleep(delayMs);
    }
  }

  const output = {
    generatedAt: isoNow(),
    options: {
      delayMs,
      limitPerSegment,
      createTrackingLists,
      segment: options.segment || null,
    },
    results,
  };
  writeJson(path.join(PATHS.raw, 'instantly_supersearch_enrich_live.json'), output);
  return output;
}

function getRampGlobalCap(weekNumber) {
  if (weekNumber <= 1) return 35 * SIMLABS_DOMAINS.length;
  if (weekNumber === 2) return 50 * SIMLABS_DOMAINS.length;
  return 60 * SIMLABS_DOMAINS.length;
}

async function ensureLeadList(instantly, existingLists, name) {
  const found = existingLists.find((x) => (x.name || '').toLowerCase() === name.toLowerCase());
  if (found) return found;
  const created = await instantly.createLeadList(name);
  return created;
}

async function ensureCampaign(instantly, existingCampaigns, name, scheduleTimezone = 'Asia/Dubai') {
  const found = existingCampaigns.find((x) => (x.name || '').toLowerCase() === name.toLowerCase());
  if (found) return found;

  const payload = {
    name,
    campaign_schedule: {
      schedules: [
        {
          name: 'SimLabs Default',
          timing: { from: '09:00', to: '18:00' },
          days: { 0: true, 1: true, 2: true, 3: true, 4: true, 6: true },
          timezone: scheduleTimezone,
        },
      ],
    },
  };

  const created = await instantly.createCampaign(payload);
  return created;
}

function loadUploadRegistry() {
  const data = readJsonSafe(PATHS.uploadRegistry, null);
  if (data) return data;
  return {
    generatedAt: isoNow(),
    by_campaign: {},
    uploaded: [],
  };
}

function saveUploadRegistry(registry) {
  registry.generatedAt = isoNow();
  writeJson(PATHS.uploadRegistry, registry);
}

function formatLeadPayload(row, campaignId, leadListId = '') {
  const personalization = row.company ? `Context: ${row.company}` : '';
  return {
    email: row.email,
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    company_name: row.company || '',
    website: row.website || '',
    personalization,
    campaign: campaignId,
    campaign_id: campaignId,
    lead_list_id: leadListId || undefined,
    job_title: row.title || '',
    location: row.country || '',
    linkedin_url: row.linkedin || '',
    // Keep legacy aliases for compatibility with older account schemas.
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    companyName: row.company || '',
    jobTitle: row.title || '',
    linkedIn: row.linkedin || '',
  };
}

async function runApplyPlan(instantly, options = {}) {
  const weekNumber = Number(options.weekNumber || 1);
  const uploadLimit = Number(options.uploadLimit || 300);
  const dryRun = Boolean(options.dryRun);

  const templates = buildSimlabsCampaignTemplates();
  let campaigns = await instantly.listAllCampaigns();
  let leadLists = await instantly.listLeadLists();

  const existingSecurity = campaigns.find((x) => (x.name || '').toLowerCase() === 'simlabs | security professionals');
  const existingCtf = campaigns.find((x) => (x.name || '').toLowerCase() === 'simlabs | ctf organizers');

  if (!existingSecurity || !existingCtf) {
    throw new Error('Required base SimLabs campaigns not found.');
  }

  await instantly.patchCampaign(existingSecurity.id, {
    open_tracking: true,
    link_tracking: true,
    sequences: [templates.securityCtaTightened],
    stop_on_reply: true,
  });

  await instantly.patchCampaign(existingCtf.id, {
    open_tracking: true,
    link_tracking: true,
    stop_on_reply: true,
  });

  const educatorsList = await ensureLeadList(instantly, leadLists, 'SimLabs - Educators (US/UK/Saudi)');
  leadLists = await instantly.listLeadLists();
  const educationDecisionMakersList = await ensureLeadList(instantly, leadLists, 'SimLabs - Education Decision Makers - MENA');
  leadLists = await instantly.listLeadLists();
  const facultyInstructorsList = await ensureLeadList(instantly, leadLists, 'SimLabs - Faculty / Instructors - MENA');
  leadLists = await instantly.listLeadLists();
  const educationRecoveryList = await ensureLeadList(instantly, leadLists, 'SimLabs - Education Warm Follow-up / CRM Recovery');
  leadLists = await instantly.listLeadLists();
  const ctfV2List = await ensureLeadList(instantly, leadLists, 'SimLabs - CTF Organizers v2 (Spotlight)');
  leadLists = await instantly.listLeadLists();
  const securityConsultantsList = await ensureLeadList(instantly, leadLists, 'SimLabs - Security Consultants');
  leadLists = await instantly.listLeadLists();
  const securityTrainingLeadersList = await ensureLeadList(instantly, leadLists, 'SimLabs - Security Training Leaders');
  leadLists = await instantly.listLeadLists();
  const securityExpansionList = await ensureLeadList(instantly, leadLists, 'SimLabs - Security Expansion');
  leadLists = await instantly.listLeadLists();
  const securityEngineersList = leadLists.find((x) => (x.name || '').toLowerCase() === 'simlabs - security engineers');

  const educatorsCampaign = await ensureCampaign(instantly, campaigns, 'SimLabs | Educators (US/UK/Saudi)', 'Asia/Dubai');
  campaigns = await instantly.listAllCampaigns();
  const educationDecisionMakersCampaign = await ensureCampaign(instantly, campaigns, 'SimLabs | Education Decision Makers - MENA', 'Asia/Dubai');
  campaigns = await instantly.listAllCampaigns();
  const facultyInstructorsCampaign = await ensureCampaign(instantly, campaigns, 'SimLabs | Faculty / Instructors - MENA', 'Asia/Dubai');
  campaigns = await instantly.listAllCampaigns();
  const educationRecoveryCampaign = await ensureCampaign(instantly, campaigns, 'SimLabs | Education Warm Follow-up / CRM Recovery', 'Asia/Dubai');
  campaigns = await instantly.listAllCampaigns();
  const ctfV2Campaign = await ensureCampaign(instantly, campaigns, 'SimLabs | CTF Organizers v2 (Spotlight Program)', 'Asia/Dubai');
  campaigns = await instantly.listAllCampaigns();
  const securityConsultantsCampaign = await ensureCampaign(instantly, campaigns, 'SimLabs | Security Consultants', 'Asia/Dubai');
  campaigns = await instantly.listAllCampaigns();
  const securityTrainingLeadersCampaign = await ensureCampaign(instantly, campaigns, 'SimLabs | Security Training Leaders', 'Asia/Dubai');
  campaigns = await instantly.listAllCampaigns();

  const educatorsCampaignId = educatorsCampaign.id;
  const educationDecisionMakersCampaignId = educationDecisionMakersCampaign.id;
  const facultyInstructorsCampaignId = facultyInstructorsCampaign.id;
  const educationRecoveryCampaignId = educationRecoveryCampaign.id;
  const ctfV2CampaignId = ctfV2Campaign.id;
  const securityConsultantsCampaignId = securityConsultantsCampaign.id;
  const securityTrainingLeadersCampaignId = securityTrainingLeadersCampaign.id;

  await instantly.patchCampaign(educatorsCampaignId, {
    open_tracking: true,
    link_tracking: true,
    stop_on_reply: true,
    email_list: [
      'noah@trysimlabs.com',
      'noah@simlabs-team.com',
      'noah@getsimlabs.com',
      'hannah@trysimlabs.com',
      'hannah@simlabs-team.com',
      'hannah@getsimlabs.com',
      'hannah.adam@getsimlabs.com',
    ],
    sequences: [templates.educatorSequence],
    daily_limit: 60,
  });

  await instantly.patchCampaign(educationDecisionMakersCampaignId, {
    open_tracking: true,
    link_tracking: true,
    stop_on_reply: true,
    email_list: [
      'noah@trysimlabs.com',
      'noah@simlabs-team.com',
      'noah@getsimlabs.com',
      'hannah@trysimlabs.com',
      'hannah@simlabs-team.com',
      'hannah@getsimlabs.com',
      'hannah.adam@getsimlabs.com',
    ],
    sequences: [templates.educationDecisionMakersSequence],
    daily_limit: 20,
  });

  await instantly.patchCampaign(facultyInstructorsCampaignId, {
    open_tracking: true,
    link_tracking: true,
    stop_on_reply: true,
    email_list: [
      'noah@trysimlabs.com',
      'noah@simlabs-team.com',
      'noah@getsimlabs.com',
      'hannah@trysimlabs.com',
      'hannah@simlabs-team.com',
      'hannah@getsimlabs.com',
      'hannah.adam@getsimlabs.com',
    ],
    sequences: [templates.facultyInstructorsSequence],
    daily_limit: 18,
  });

  await instantly.patchCampaign(educationRecoveryCampaignId, {
    open_tracking: true,
    link_tracking: true,
    stop_on_reply: true,
    email_list: [
      'noah@trysimlabs.com',
      'noah@simlabs-team.com',
      'noah@getsimlabs.com',
      'hannah@trysimlabs.com',
      'hannah@simlabs-team.com',
      'hannah@getsimlabs.com',
      'hannah.adam@getsimlabs.com',
    ],
    sequences: [templates.educationRecoverySequence],
    daily_limit: 6,
  });

  await instantly.patchCampaign(ctfV2CampaignId, {
    open_tracking: true,
    link_tracking: true,
    stop_on_reply: true,
    email_list: [
      'noah@trysimlabs.com',
      'noah@simlabs-team.com',
      'noah@getsimlabs.com',
      'hannah@trysimlabs.com',
      'hannah@simlabs-team.com',
      'hannah@getsimlabs.com',
      'hannah.adam@getsimlabs.com',
    ],
    sequences: [templates.ctfV2Sequence],
    daily_limit: 60,
  });

  await instantly.patchCampaign(securityConsultantsCampaignId, {
    open_tracking: true,
    link_tracking: true,
    stop_on_reply: true,
    email_list: [
      'noah@trysimlabs.com',
      'noah@simlabs-team.com',
      'noah@getsimlabs.com',
      'hannah@trysimlabs.com',
      'hannah@simlabs-team.com',
      'hannah@getsimlabs.com',
      'hannah.adam@getsimlabs.com',
    ],
    sequences: [templates.securityConsultantsSequence],
    daily_limit: 30,
  });

  await instantly.patchCampaign(securityTrainingLeadersCampaignId, {
    open_tracking: true,
    link_tracking: true,
    stop_on_reply: true,
    email_list: [
      'noah@trysimlabs.com',
      'noah@simlabs-team.com',
      'noah@getsimlabs.com',
      'hannah@trysimlabs.com',
      'hannah@simlabs-team.com',
      'hannah@getsimlabs.com',
      'hannah.adam@getsimlabs.com',
    ],
    sequences: [templates.securityTrainingLeadersSequence],
    daily_limit: 30,
  });

  await instantly.activateCampaign(existingSecurity.id);
  await instantly.activateCampaign(educatorsCampaignId);
  await instantly.activateCampaign(educationDecisionMakersCampaignId);
  await instantly.activateCampaign(facultyInstructorsCampaignId);
  await instantly.activateCampaign(educationRecoveryCampaignId);
  await instantly.activateCampaign(ctfV2CampaignId);
  await instantly.activateCampaign(securityConsultantsCampaignId);
  await instantly.activateCampaign(securityTrainingLeadersCampaignId);
  await instantly.pauseCampaign(existingCtf.id);

  campaigns = await instantly.listAllCampaigns();
  const simlabsCampaigns = campaigns.filter((x) => /simlabs?/i.test(x.name || ''));
  const activeSimlabsCampaigns = simlabsCampaigns.filter((x) => Number(x.status) === 1);

  const globalCap = getRampGlobalCap(weekNumber);
  const targetDailyLimits = {
    [existingSecurity.id]: 18,
    [educatorsCampaignId]: 6,
    [educationDecisionMakersCampaignId]: 20,
    [facultyInstructorsCampaignId]: 18,
    [educationRecoveryCampaignId]: 6,
    [ctfV2CampaignId]: 18,
    [securityConsultantsCampaignId]: 10,
    [securityTrainingLeadersCampaignId]: 8,
    [existingCtf.id]: 0,
  };

  for (const campaign of simlabsCampaigns) {
    if (campaign.id === existingCtf.id) {
      continue;
    }
    const desiredDailyLimit = targetDailyLimits[campaign.id];
    if (Number.isFinite(desiredDailyLimit) && desiredDailyLimit > 0) {
      await instantly.patchCampaign(campaign.id, {
        daily_limit: desiredDailyLimit,
        open_tracking: true,
        link_tracking: true,
      });
    }
  }

  const apollo = getLatestApolloEnrichment();
  const suppression = readJsonSafe(PATHS.suppressionJson, { invalid_or_missing: [] });
  const suppressedEmails = new Set((suppression.invalid_or_missing || []).map((x) => normalizeEmail(x.email)).filter(Boolean));

  const registry = loadUploadRegistry();
  registry.by_campaign = registry.by_campaign || {};
  registry.uploaded = registry.uploaded || [];

  const alreadyUploaded = new Set(
    registry.uploaded
      .filter((x) => x && x.email && x.campaign_id)
      .map((x) => `${normalizeEmail(x.email)}::${x.campaign_id}`),
  );

  let createdCount = 0;
  let skippedCount = 0;
  let errors = 0;

  for (const row of apollo.accepted || []) {
    if (!row?.email) continue;
    if (suppressedEmails.has(normalizeEmail(row.email))) {
      skippedCount += 1;
      continue;
    }
    if (row.segment === 'ctf_organizers_v2' && lowerIncludesAny(row.title || '', ['founder', 'chief executive', 'ceo'])) {
      skippedCount += 1;
      continue;
    }

    let campaignId = null;
    let leadListId = '';
    if (row.segment === 'education_decision_makers_mena') {
      campaignId = educationDecisionMakersCampaignId;
      leadListId = educationDecisionMakersList.id;
    } else if (row.segment === 'faculty_instructors_mena') {
      campaignId = facultyInstructorsCampaignId;
      leadListId = facultyInstructorsList.id;
    } else if (row.segment === 'educators') {
      campaignId = educatorsCampaignId;
      leadListId = educatorsList.id;
    } else if (row.segment === 'ctf_organizers_v2') {
      campaignId = ctfV2CampaignId;
      leadListId = ctfV2List.id;
    } else if (row.segment === 'security_training_leaders') {
      campaignId = securityTrainingLeadersCampaignId;
      leadListId = securityTrainingLeadersList.id;
    } else if (row.segment === 'security_expansion_apollo') {
      campaignId = existingSecurity.id;
      leadListId = securityExpansionList.id;
    } else if (row.segment === 'security_professionals_apollo') {
      campaignId = existingSecurity.id;
      leadListId = securityEngineersList?.id || '';
    } else if (row.segment === 'security_consultants') {
      campaignId = securityConsultantsCampaignId;
      leadListId = securityConsultantsList.id;
    } else {
      skippedCount += 1;
      continue;
    }

    const dedupeKey = `${normalizeEmail(row.email)}::${campaignId}`;
    if (alreadyUploaded.has(dedupeKey)) {
      skippedCount += 1;
      continue;
    }

    if (createdCount >= uploadLimit) break;

    try {
      const payload = formatLeadPayload(row, campaignId, leadListId);
      await instantly.createLead(payload);
      createdCount += 1;
      alreadyUploaded.add(dedupeKey);
      registry.by_campaign[campaignId] = (registry.by_campaign[campaignId] || 0) + 1;
      registry.uploaded.push({
        email: normalizeEmail(row.email),
        campaign_id: campaignId,
        lead_list_id: leadListId,
        segment: row.segment,
        uploaded_at: isoNow(),
        dry_run: dryRun,
      });
    } catch (err) {
      errors += 1;
      registry.uploaded.push({
        email: normalizeEmail(row.email),
        campaign_id: campaignId,
        segment: row.segment,
        uploaded_at: isoNow(),
        error: String(err.message || err),
      });
    }
  }

  saveUploadRegistry(registry);

  const report = {
    generatedAt: isoNow(),
    dryRun,
    weekNumber,
    ramp: {
      globalCap,
      activeSimlabsCampaigns: activeSimlabsCampaigns.length,
      targetDailyLimits,
    },
    leadLists: {
      educators: { id: educatorsList.id, name: educatorsList.name },
      education_decision_makers_mena: { id: educationDecisionMakersList.id, name: educationDecisionMakersList.name },
      faculty_instructors_mena: { id: facultyInstructorsList.id, name: facultyInstructorsList.name },
      education_recovery: { id: educationRecoveryList.id, name: educationRecoveryList.name },
      ctf_v2: { id: ctfV2List.id, name: ctfV2List.name },
      security_consultants: { id: securityConsultantsList.id, name: securityConsultantsList.name },
      security_training_leaders: { id: securityTrainingLeadersList.id, name: securityTrainingLeadersList.name },
      security_expansion: { id: securityExpansionList.id, name: securityExpansionList.name },
    },
    campaigns: {
      existing_security: existingSecurity.id,
      existing_ctf: existingCtf.id,
      educators: educatorsCampaignId,
      education_decision_makers_mena: educationDecisionMakersCampaignId,
      faculty_instructors_mena: facultyInstructorsCampaignId,
      education_recovery: educationRecoveryCampaignId,
      ctf_v2: ctfV2CampaignId,
      security_consultants: securityConsultantsCampaignId,
      security_training_leaders: securityTrainingLeadersCampaignId,
    },
    ingestion: {
      attempted_from_apollo: (apollo.accepted || []).length,
      created_count: createdCount,
      skipped_count: skippedCount,
      error_count: errors,
      upload_limit: uploadLimit,
    },
  };

  writeJson(path.join(PATHS.raw, 'simlabs_apply_plan_report.json'), report);

  const mdLines = [];
  mdLines.push('# SimLabs Outreach Implementation Report');
  mdLines.push('');
  mdLines.push(`- Generated at: ${report.generatedAt}`);
  mdLines.push(`- Dry run: ${report.dryRun}`);
  mdLines.push(`- Week number: ${weekNumber}`);
  mdLines.push('');
  mdLines.push('## Ramp Configuration');
  mdLines.push(`- Global cap (all SimLabs campaigns): ${globalCap}`);
  mdLines.push(`- Active SimLabs campaigns: ${activeSimlabsCampaigns.length}`);
  mdLines.push(`- Security Professionals daily limit: ${targetDailyLimits[existingSecurity.id]}`);
  mdLines.push(`- Education Decision Makers - MENA daily limit: ${targetDailyLimits[educationDecisionMakersCampaignId]}`);
  mdLines.push(`- Faculty / Instructors - MENA daily limit: ${targetDailyLimits[facultyInstructorsCampaignId]}`);
  mdLines.push(`- Education Warm Follow-up / CRM Recovery daily limit: ${targetDailyLimits[educationRecoveryCampaignId]}`);
  mdLines.push(`- Security Consultants daily limit: ${targetDailyLimits[securityConsultantsCampaignId]}`);
  mdLines.push(`- Educators daily limit: ${targetDailyLimits[educatorsCampaignId]}`);
  mdLines.push(`- CTF Organizers v2 daily limit: ${targetDailyLimits[ctfV2CampaignId]}`);
  mdLines.push(`- Security Training Leaders daily limit: ${targetDailyLimits[securityTrainingLeadersCampaignId]}`);
  mdLines.push(`- Legacy CTF status: paused`);
  mdLines.push('');
  mdLines.push('## Campaign and List Setup');
  mdLines.push(`- Existing campaign updated: SimLabs | Security Professionals (${existingSecurity.id})`);
  mdLines.push(`- Legacy campaign paused: Simlabs | CTF Organizers (${existingCtf.id})`);
  mdLines.push(`- New campaign ensured: SimLabs | Educators (US/UK/Saudi) (${educatorsCampaignId})`);
  mdLines.push(`- New campaign ensured: SimLabs | Education Decision Makers - MENA (${educationDecisionMakersCampaignId})`);
  mdLines.push(`- New campaign ensured: SimLabs | Faculty / Instructors - MENA (${facultyInstructorsCampaignId})`);
  mdLines.push(`- New campaign ensured: SimLabs | Education Warm Follow-up / CRM Recovery (${educationRecoveryCampaignId})`);
  mdLines.push(`- New campaign ensured: SimLabs | CTF Organizers v2 (Spotlight Program) (${ctfV2CampaignId})`);
  mdLines.push(`- New campaign ensured: SimLabs | Security Consultants (${securityConsultantsCampaignId})`);
  mdLines.push(`- New campaign ensured: SimLabs | Security Training Leaders (${securityTrainingLeadersCampaignId})`);
  mdLines.push(`- New list ensured: ${educatorsList.name} (${educatorsList.id})`);
  mdLines.push(`- New list ensured: ${educationDecisionMakersList.name} (${educationDecisionMakersList.id})`);
  mdLines.push(`- New list ensured: ${facultyInstructorsList.name} (${facultyInstructorsList.id})`);
  mdLines.push(`- New list ensured: ${educationRecoveryList.name} (${educationRecoveryList.id})`);
  mdLines.push(`- New list ensured: ${ctfV2List.name} (${ctfV2List.id})`);
  mdLines.push(`- New list ensured: ${securityConsultantsList.name} (${securityConsultantsList.id})`);
  mdLines.push(`- New list ensured: ${securityTrainingLeadersList.name} (${securityTrainingLeadersList.id})`);
  mdLines.push(`- New list ensured: ${securityExpansionList.name} (${securityExpansionList.id})`);
  mdLines.push('');
  mdLines.push('## Lead Ingestion');
  mdLines.push(`- Apollo accepted leads available: ${(apollo.accepted || []).length}`);
  mdLines.push(`- Leads created in Instantly: ${createdCount}`);
  mdLines.push(`- Leads skipped: ${skippedCount}`);
  mdLines.push(`- Lead creation errors: ${errors}`);
  mdLines.push(`- Upload limit: ${uploadLimit}`);
  mdLines.push('');

  const mdPath = path.join(PATHS.leadsInsights, `IMPLEMENTATION_REPORT_${todayStamp()}.md`);
  fs.writeFileSync(mdPath, `${mdLines.join('\n')}\n`, 'utf8');

  return report;
}

async function runPatchUpload(instantly, options = {}) {
  const weekNumber = asPositiveNumber(options.weekNumber, 1);
  const targetCreated = asPositiveNumber(options.targetCreated, 1000);
  const batchSize = asPositiveNumber(options.batchSize, 50);
  const pauseMs = asPositiveNumber(options.pauseMs, 15_000);
  const maxBatches = asPositiveNumber(options.maxBatches, 200);
  const dryRun = Boolean(options.dryRun);

  const batches = [];
  let totalCreated = 0;
  let totalErrors = 0;
  let stopReason = 'target_reached';

  for (let i = 1; i <= maxBatches; i += 1) {
    if (totalCreated >= targetCreated) break;
    const remaining = targetCreated - totalCreated;
    const uploadLimit = Math.max(1, Math.min(batchSize, remaining));

    const result = await runApplyPlan(instantly, {
      weekNumber,
      uploadLimit,
      dryRun,
    });
    const created = Number(result?.ingestion?.created_count || 0);
    const errors = Number(result?.ingestion?.error_count || 0);
    totalCreated += created;
    totalErrors += errors;

    batches.push({
      batch: i,
      upload_limit: uploadLimit,
      created,
      errors,
      generatedAt: result.generatedAt,
    });

    if (created === 0) {
      stopReason = 'no_more_eligible_leads';
      break;
    }
    if (totalCreated < targetCreated) {
      await sleep(pauseMs);
    }
  }

  if (batches.length >= maxBatches && totalCreated < targetCreated) {
    stopReason = 'max_batches_reached';
  }

  const report = {
    generatedAt: isoNow(),
    target_created: targetCreated,
    total_created: totalCreated,
    total_errors: totalErrors,
    completed: totalCreated >= targetCreated,
    stop_reason: stopReason,
    batch_size: batchSize,
    pause_ms: pauseMs,
    max_batches: maxBatches,
    batches,
  };

  writeJson(path.join(PATHS.raw, 'simlabs_patch_upload_report.json'), report);
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || ['-h', '--help', 'help'].includes(command)) {
    console.log(`Usage:
  node scripts/simlabs_outreach_manager.mjs snapshot
  node scripts/simlabs_outreach_manager.mjs enrich [--target-per-segment=500] [--segments=education_decision_makers_mena,faculty_instructors_mena]
  node scripts/simlabs_outreach_manager.mjs instantly-enrich [--target=1000]
  node scripts/simlabs_outreach_manager.mjs instantly-supersearch-preview [--segment=security_consultants]
  node scripts/simlabs_outreach_manager.mjs instantly-supersearch-enrich [--segment=security_consultants] [--limit-per-segment=25] [--create-tracking-lists]
  node scripts/simlabs_outreach_manager.mjs build-master
  node scripts/simlabs_outreach_manager.mjs scorecard
  node scripts/simlabs_outreach_manager.mjs apply-plan [--week=1] [--upload-limit=300] [--dry-run]
  node scripts/simlabs_outreach_manager.mjs patch-upload [--target-created=1000] [--batch-size=50] [--batch-pause-ms=15000]
  node scripts/simlabs_outreach_manager.mjs run-all [--week=1] [--target-per-segment=500] [--upload-limit=300] [--dry-run]

Env vars:
  INSTANTLY_API_KEY   required for snapshot/instantly-enrich/apply-plan/patch-upload/run-all
  APOLLO_API_KEY      required for enrich/run-all

Rate-limit flags:
  --instantly-max-per-minute=16
  --instantly-delay-ms=2000
  --supersearch-delay-ms=8000
  --apollo-max-per-minute=35
  --apollo-delay-ms=1500
  --apollo-segment-delay-ms=5000
  --segments=education_decision_makers_mena,faculty_instructors_mena
  --request-timeout-ms=45000
`);
    process.exit(0);
  }

  ensureDir(PATHS.raw);
  ensureDir(PATHS.leadsInsights);

  const releaseLock = acquireProcessLock(command, args.slice(1));

  const dryRun = hasFlag(args, '--dry-run');
  const weekNumber = Number(getArgValue(args, '--week', '1'));
  const targetPerSegment = Number(getArgValue(args, '--target-per-segment', '500'));
  const uploadLimit = Number(getArgValue(args, '--upload-limit', '300'));
  const instantlyMaxPerMinute = asPositiveNumber(getArgValue(args, '--instantly-max-per-minute', '16'), 16);
  const instantlyDelayMs = asPositiveNumber(getArgValue(args, '--instantly-delay-ms', '2000'), 2000);
  const apolloMaxPerMinute = asPositiveNumber(getArgValue(args, '--apollo-max-per-minute', '35'), 35);
  const apolloDelayMs = asPositiveNumber(getArgValue(args, '--apollo-delay-ms', '1500'), 1500);
  const apolloSegmentDelayMs = asPositiveNumber(getArgValue(args, '--apollo-segment-delay-ms', '5000'), 5000);
  const requestTimeoutMs = asPositiveNumber(getArgValue(args, '--request-timeout-ms', '45000'), 45000);
  const targetCreated = asPositiveNumber(getArgValue(args, '--target-created', '1000'), 1000);
  const batchSize = asPositiveNumber(getArgValue(args, '--batch-size', '50'), 50);
  const batchPauseMs = asPositiveNumber(getArgValue(args, '--batch-pause-ms', '15000'), 15000);
  const maxBatches = asPositiveNumber(getArgValue(args, '--max-batches', '200'), 200);
  const supersearchDelayMs = asPositiveNumber(getArgValue(args, '--supersearch-delay-ms', '8000'), 8000);
  const limitPerSegment = asPositiveNumber(getArgValue(args, '--limit-per-segment', '25'), 25);
  const supersearchSegment = getArgValue(args, '--segment', '');
  const requestedSegments = getArgValue(args, '--segments', '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const createTrackingLists = hasFlag(args, '--create-tracking-lists');

  const instantlyApiKey = process.env.INSTANTLY_API_KEY || '';
  const apolloApiKey = process.env.APOLLO_API_KEY || '';

  try {
    if (command === 'snapshot') {
      if (!instantlyApiKey) throw new Error('Missing INSTANTLY_API_KEY');
      const instantly = new InstantlyClient(instantlyApiKey, {
        dryRun,
        maxPerMinute: instantlyMaxPerMinute,
        minIntervalMs: instantlyDelayMs,
        requestTimeoutMs,
      });
      const out = await runSnapshot(instantly);
      console.log(`Snapshot completed: ${out.simCampaigns.length} SimLabs campaigns captured.`);
      return;
    }

    if (command === 'enrich') {
      if (!apolloApiKey) throw new Error('Missing APOLLO_API_KEY');
      const apollo = new ApolloClient(apolloApiKey, {
        maxPerMinute: apolloMaxPerMinute,
        minIntervalMs: apolloDelayMs,
        requestTimeoutMs,
      });
      const out = await runApolloEnrichment(apollo, {
        targetPerSegment,
        pageDelayMs: apolloDelayMs,
        segmentDelayMs: apolloSegmentDelayMs,
        segments: requestedSegments,
      });
      console.log(`Apollo enrichment completed. Accepted=${out.accepted.length}, Nurture=${out.nurture.length}`);
      return;
    }

    if (command === 'build-master') {
      const out = await runBuildMaster();
      console.log(`Master leads built. Total=${out.total}, Suppressed=${out.suppressed}`);
      return;
    }

    if (command === 'scorecard') {
      const out = await runScorecard();
      console.log(`Scorecard generated: ${out.markdown}`);
      return;
    }

    if (command === 'instantly-enrich') {
      if (!instantlyApiKey) throw new Error('Missing INSTANTLY_API_KEY');
      const instantly = new InstantlyClient(instantlyApiKey, {
        dryRun,
        maxPerMinute: instantlyMaxPerMinute,
        minIntervalMs: instantlyDelayMs,
        requestTimeoutMs,
      });
      const targetUnique = Number(getArgValue(args, '--target', '1000'));
      const out = await runInstantlyEnrichment(instantly, {
        targetUnique,
        pageDelayMs: instantlyDelayMs,
      });
      console.log(`Instantly enrichment completed. Unique contacts=${out.total_unique_contacts}`);
      return;
    }

    if (command === 'instantly-supersearch-preview') {
      if (!instantlyApiKey) throw new Error('Missing INSTANTLY_API_KEY');
      const instantly = new InstantlyClient(instantlyApiKey, {
        dryRun,
        maxPerMinute: instantlyMaxPerMinute,
        minIntervalMs: instantlyDelayMs,
        requestTimeoutMs,
      });
      const out = await runInstantlySupersearchPreview(instantly, {
        delayMs: supersearchDelayMs,
        segment: supersearchSegment,
      });
      console.log(`Instantly Supersearch preview completed. Segments=${out.previews.length}`);
      return;
    }

    if (command === 'instantly-supersearch-enrich') {
      if (!instantlyApiKey) throw new Error('Missing INSTANTLY_API_KEY');
      const instantly = new InstantlyClient(instantlyApiKey, {
        dryRun,
        maxPerMinute: instantlyMaxPerMinute,
        minIntervalMs: instantlyDelayMs,
        requestTimeoutMs,
      });
      const out = await runInstantlySupersearchEnrich(instantly, {
        delayMs: supersearchDelayMs,
        limitPerSegment,
        segment: supersearchSegment,
        createTrackingLists,
      });
      console.log(`Instantly Supersearch enrich completed. Segments=${out.results.length}`);
      return;
    }

    if (command === 'apply-plan') {
      if (!instantlyApiKey) throw new Error('Missing INSTANTLY_API_KEY');
      const instantly = new InstantlyClient(instantlyApiKey, {
        dryRun,
        maxPerMinute: instantlyMaxPerMinute,
        minIntervalMs: instantlyDelayMs,
        requestTimeoutMs,
      });
      const out = await runApplyPlan(instantly, { weekNumber, uploadLimit, dryRun });
      console.log(`Apply-plan done. Created leads=${out.ingestion.created_count}, errors=${out.ingestion.error_count}`);
      return;
    }

    if (command === 'patch-upload') {
      if (!instantlyApiKey) throw new Error('Missing INSTANTLY_API_KEY');
      const instantly = new InstantlyClient(instantlyApiKey, {
        dryRun,
        maxPerMinute: instantlyMaxPerMinute,
        minIntervalMs: instantlyDelayMs,
        requestTimeoutMs,
      });
      const out = await runPatchUpload(instantly, {
        weekNumber,
        dryRun,
        targetCreated,
        batchSize,
        pauseMs: batchPauseMs,
        maxBatches,
      });
      console.log(`Patch-upload done. Created=${out.total_created}, batches=${out.batches.length}, completed=${out.completed}, stop=${out.stop_reason}`);
      return;
    }

    if (command === 'run-all') {
      if (!instantlyApiKey) throw new Error('Missing INSTANTLY_API_KEY');
      if (!apolloApiKey) throw new Error('Missing APOLLO_API_KEY');

      const instantly = new InstantlyClient(instantlyApiKey, {
        dryRun,
        maxPerMinute: instantlyMaxPerMinute,
        minIntervalMs: instantlyDelayMs,
        requestTimeoutMs,
      });
      const apollo = new ApolloClient(apolloApiKey, {
        maxPerMinute: apolloMaxPerMinute,
        minIntervalMs: apolloDelayMs,
        requestTimeoutMs,
      });

      await runSnapshot(instantly);
      await runApolloEnrichment(apollo, {
        targetPerSegment,
        pageDelayMs: apolloDelayMs,
        segmentDelayMs: apolloSegmentDelayMs,
        segments: requestedSegments,
      });
      await runInstantlyEnrichment(instantly, {
        targetUnique: 1000,
        pageDelayMs: instantlyDelayMs,
      });
      await runBuildMaster();
      await runScorecard();
      await runApplyPlan(instantly, { weekNumber, uploadLimit, dryRun });
      console.log('Run-all completed.');
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (err) {
    console.error(`[ERROR] ${err.message || err}`);
    process.exit(1);
  } finally {
    releaseLock();
  }
}

await main();
