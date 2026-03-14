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
  insights: path.join(ROOT, 'Knowledge-Base', 'Leads-Insights', 'Apollo-Enrichment'),
};

const DEFAULT_TARGET = 1000;
const DEFAULT_PER_PAGE = 100;
const DEFAULT_MAX_PER_MINUTE = 20;
const DEFAULT_DELAY_MS = 2500;
const DEFAULT_COMPANY_CAP = 2;
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_BATCH_PAUSE_MS = 5000;
const DEFAULT_SEQUENCE_DATE = '2026-03-12';
const UNIVERSITY_REGEX = /\b(university|college|institute|academy|polytechnic|faculty|school of|higher education)\b/i;
const REJECT_ORG_REGEX = /\b(consulting|solutions|services|software|systems|bank|insurance|telecom|hospital|clinic|retail|manufacturing|logistics|agency)\b/i;

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

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function quoteCsv(value) {
  const v = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function writeCsv(filePath, rows, headers) {
  ensureDir(path.dirname(filePath));
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => quoteCsv(row[header] ?? '')).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function isoNow() {
  return new Date().toISOString();
}

function todayStamp() {
  return isoNow().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asPositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getArgValue(args, name, fallback = null) {
  const direct = args.find((item) => item.startsWith(`${name}=`));
  if (direct) return direct.split('=').slice(1).join('=');
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(email) {
  return normalizeText(email).toLowerCase();
}

function lower(value) {
  return normalizeText(value).toLowerCase();
}

function hash(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

function titleIncludesAny(title, phrases) {
  const t = lower(title);
  return phrases.some((phrase) => t.includes(lower(phrase)));
}

function seniorityRank(value) {
  const v = lower(value);
  if (['owner', 'founder', 'c_suite', 'partner'].includes(v)) return 7;
  if (['vp'].includes(v)) return 6;
  if (['head', 'director'].includes(v)) return 5;
  if (['manager'].includes(v)) return 4;
  if (['senior'].includes(v)) return 3;
  if (['entry'].includes(v)) return 2;
  return 1;
}

class ApolloClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.maxPerMinute = asPositiveNumber(options.maxPerMinute, DEFAULT_MAX_PER_MINUTE);
    this.delayMs = asPositiveNumber(options.delayMs, DEFAULT_DELAY_MS);
    this.requestTimeoutMs = asPositiveNumber(options.requestTimeoutMs, 45000);
    this.lastRequestAt = 0;
    this.requestTimestamps = [];
  }

  async throttle() {
    let now = Date.now();
    const sinceLast = now - this.lastRequestAt;
    if (sinceLast < this.delayMs) {
      await sleep(this.delayMs - sinceLast);
      now = Date.now();
    }
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < 60000);
    if (this.requestTimestamps.length >= this.maxPerMinute) {
      const waitMs = Math.max(250, 60000 - (now - this.requestTimestamps[0]) + 250);
      await sleep(waitMs);
    }
    const stamped = Date.now();
    this.requestTimestamps.push(stamped);
    this.lastRequestAt = stamped;
  }

  async request(method, endpoint, { params, body, retries = 6 } = {}) {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `https://api.apollo.io${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    for (let attempt = 0; attempt < retries; attempt += 1) {
      await this.throttle();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const text = await response.text();
        let data = text;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        if (!response.ok) {
          if ((response.status === 429 || response.status >= 500) && attempt < retries - 1) {
            await sleep(Math.min(60000, (attempt + 1) * 3000));
            continue;
          }
          throw new Error(`${method} ${url.pathname}${url.search} failed (${response.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`);
        }
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        if (attempt < retries - 1) {
          await sleep(Math.min(60000, (attempt + 1) * 3000));
          continue;
        }
        throw error;
      }
    }

    throw new Error(`${method} ${url.pathname}${url.search} failed after retries`);
  }

  async health() {
    return this.request('GET', '/v1/auth/health');
  }

  async searchPeople(payload, params = {}) {
    return this.request('POST', '/api/v1/mixed_people/api_search', {
      params,
      body: payload,
    });
  }

  async bulkMatch(details) {
    return this.request('POST', '/api/v1/people/bulk_match', {
      body: { details },
    });
  }

  async listLabels() {
    const data = await this.request('GET', '/api/v1/labels');
    return Array.isArray(data) ? data : data.labels || data.contacts || [];
  }

  async createLabel(name) {
    return this.request('POST', '/api/v1/labels', {
      body: { name, modality: 'contacts' },
    });
  }

  async createContact(payload) {
    return this.request('POST', '/api/v1/contacts', {
      body: payload,
    });
  }

  async bulkCreateContacts(contacts) {
    return this.request('POST', '/api/v1/contacts/bulk_create', {
      body: { contacts },
    });
  }

  async updateContact(contactId, payload) {
    return this.request('PUT', `/api/v1/contacts/${contactId}`, {
      body: payload,
    });
  }

  async bulkUpdateContacts(payload) {
    return this.request('POST', '/api/v1/contacts/bulk_update', {
      body: payload,
    });
  }

  async searchSequences(query = '') {
    return this.request('POST', '/api/v1/emailer_campaigns/search', {
      body: { q: query },
    });
  }

  async createSequence(payload) {
    return this.request('POST', '/api/v1/emailer_campaigns', {
      body: payload,
    });
  }

  async getSequence(sequenceId) {
    return this.request('GET', `/api/v1/emailer_campaigns/${sequenceId}`);
  }

  async createSequenceStep(payload) {
    return this.request('POST', '/api/v1/emailer_steps', {
      body: payload,
    });
  }

  async updateTemplate(templateId, payload) {
    return this.request('PUT', `/api/v1/emailer_templates/${templateId}`, {
      body: payload,
    });
  }
}

function segmentDefinitions() {
  return [
    {
      key: 'mena_decision_makers',
      labelName: 'SimLabs | Review | Universities | MENA | Decision Makers',
      sequenceName: `SimLabs | Draft | Universities | MENA | Decision Makers | ${DEFAULT_SEQUENCE_DATE}`,
      region: 'MENA',
      segmentType: 'decision_makers',
      targetCount: 250,
      locations: ['Saudi Arabia', 'United Arab Emirates', 'Egypt', 'Qatar', 'Jordan', 'Kuwait', 'Bahrain', 'Oman'],
      organizationTags: ['university', 'college', 'institute', 'academy'],
      seniorities: ['director', 'head', 'vp', 'owner', 'senior'],
      includeTitles: [
        'Dean',
        'Associate Dean',
        'Assistant Dean',
        'Head of Department',
        'Department Chair',
        'Program Director',
        'Academic Director',
        'Director of Academic Programs',
        'Director of Education',
        'Director of Training',
        'Director of Cybersecurity Program',
        'Cybersecurity Program Manager',
        'Computer Science Program Director',
      ],
      excludeTitles: [
        'Student',
        'HR',
        'Human Resources',
        'Admissions',
        'Marketing',
        'Sales',
        'Business Development',
        'Procurement',
      ],
    },
    {
      key: 'mena_faculty_operators',
      labelName: 'SimLabs | Review | Universities | MENA | Faculty and Operators',
      sequenceName: `SimLabs | Draft | Universities | MENA | Faculty and Operators | ${DEFAULT_SEQUENCE_DATE}`,
      region: 'MENA',
      segmentType: 'faculty_operators',
      targetCount: 250,
      locations: ['Saudi Arabia', 'United Arab Emirates', 'Egypt', 'Qatar', 'Jordan', 'Kuwait', 'Bahrain', 'Oman'],
      organizationTags: ['university', 'college', 'institute', 'academy'],
      seniorities: ['senior', 'manager', 'director', 'head'],
      includeTitles: [
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
      ],
      excludeTitles: [
        'Student',
        'HR',
        'Human Resources',
        'Admissions',
        'Marketing',
        'Sales',
        'Business Development',
      ],
    },
    {
      key: 'global_decision_makers',
      labelName: 'SimLabs | Review | Universities | Global | Decision Makers',
      sequenceName: `SimLabs | Draft | Universities | Global | Decision Makers | ${DEFAULT_SEQUENCE_DATE}`,
      region: 'Global',
      segmentType: 'decision_makers',
      targetCount: 250,
      locations: ['United States', 'United Kingdom', 'Germany', 'Netherlands', 'Canada', 'Australia'],
      organizationTags: ['university', 'college', 'institute', 'academy', 'polytechnic'],
      seniorities: ['director', 'head', 'vp', 'owner', 'senior'],
      includeTitles: [
        'Dean',
        'Associate Dean',
        'Assistant Dean',
        'Head of Department',
        'Department Chair',
        'Program Director',
        'Academic Director',
        'Director of Academic Programs',
        'Director of Education',
        'Director of Cybersecurity Program',
        'Cybersecurity Program Manager',
        'Computer Science Program Director',
      ],
      excludeTitles: [
        'Student',
        'HR',
        'Human Resources',
        'Admissions',
        'Marketing',
        'Sales',
        'Business Development',
        'Fundraising',
      ],
    },
    {
      key: 'global_faculty_operators',
      labelName: 'SimLabs | Review | Universities | Global | Faculty and Operators',
      sequenceName: `SimLabs | Draft | Universities | Global | Faculty and Operators | ${DEFAULT_SEQUENCE_DATE}`,
      region: 'Global',
      segmentType: 'faculty_operators',
      targetCount: 250,
      locations: ['United States', 'United Kingdom', 'Germany', 'Netherlands', 'Canada', 'Australia'],
      organizationTags: ['university', 'college', 'institute', 'academy', 'polytechnic'],
      seniorities: ['senior', 'manager', 'director', 'head'],
      includeTitles: [
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
      ],
      excludeTitles: [
        'Student',
        'HR',
        'Human Resources',
        'Admissions',
        'Marketing',
        'Sales',
        'Business Development',
      ],
    },
  ];
}

function normalizePerson(person, segmentDef) {
  const organization = person.organization || {};
  const orgName = normalizeText(organization.name);
  const title = normalizeText(person.title);
  return {
    person_id: normalizeText(person.id),
    first_name: normalizeText(person.first_name),
    last_name: normalizeText(person.last_name || person.last_name_obfuscated),
    title,
    organization_name: orgName,
    linkedin_url: normalizeText(person.linkedin_url),
    website_url: normalizeText(organization.website_url),
    city: normalizeText(person.city || organization.city),
    state: normalizeText(person.state || organization.state),
    country: normalizeText(person.country || organization.country),
    email: normalizeEmail(person.email),
    email_status: normalizeText(person.email_status),
    seniority: normalizeText(person.seniority),
    organization_id: normalizeText(organization.id),
    organization_industry: normalizeText(organization.industry),
    organization_size: normalizeText(organization.estimated_num_employees),
    segment_key: segmentDef.key,
    segment_type: segmentDef.segmentType,
    region: segmentDef.region,
  };
}

function scorePerson(person, segmentDef) {
  let score = 0;
  if (titleIncludesAny(person.title, segmentDef.includeTitles)) score += 45;
  if (segmentDef.seniorities.some((item) => lower(item) === lower(person.seniority))) score += 20;
  if (person.organization_industry && /education|higher education/i.test(person.organization_industry)) score += 15;
  if (segmentDef.locations.some((item) => lower(item) === lower(person.country))) score += 10;
  if (person.email) score += 15;
  if (titleIncludesAny(person.title, segmentDef.excludeTitles)) score -= 60;
  if (person.organization_industry && /consulting|software|banking|telecommunications|healthcare|retail/i.test(person.organization_industry)) score -= 40;
  return score;
}

function gatePerson(person, segmentDef) {
  if (!person.person_id) return { accepted: false, reason: 'missing_person_id' };
  if (!person.organization_name) return { accepted: false, reason: 'missing_organization' };
  if (!UNIVERSITY_REGEX.test(person.organization_name)) return { accepted: false, reason: 'non_university_org' };
  if (REJECT_ORG_REGEX.test(person.organization_name)) return { accepted: false, reason: 'rejected_org_keyword' };
  if (!titleIncludesAny(person.title, segmentDef.includeTitles)) return { accepted: false, reason: 'title_out_of_scope' };
  if (titleIncludesAny(person.title, segmentDef.excludeTitles)) return { accepted: false, reason: 'excluded_title' };
  const score = scorePerson(person, segmentDef);
  if (score < 40) return { accepted: false, reason: 'score_below_threshold', score };
  return { accepted: true, score };
}

function finalGatePerson(person, segmentDef) {
  const baseGate = gatePerson(person, segmentDef);
  if (!baseGate.accepted) return baseGate;
  if (!person.email) return { accepted: false, reason: 'missing_email', score: baseGate.score };
  if (!segmentDef.locations.some((item) => lower(item) === lower(person.country))) {
    return { accepted: false, reason: 'country_out_of_scope', score: baseGate.score };
  }
  return baseGate;
}

function dedupeAndSort(candidates) {
  const byPerson = new Map();
  for (const item of candidates) {
    const existing = byPerson.get(item.person_id);
    if (!existing) {
      byPerson.set(item.person_id, item);
      continue;
    }
    if (item.score > existing.score) {
      byPerson.set(item.person_id, item);
      continue;
    }
    if (item.score === existing.score && seniorityRank(item.seniority) > seniorityRank(existing.seniority)) {
      byPerson.set(item.person_id, item);
    }
  }

  return [...byPerson.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.has_email !== a.has_email) return Number(b.has_email) - Number(a.has_email);
    return seniorityRank(b.seniority) - seniorityRank(a.seniority);
  });
}

async function searchSegment(apollo, segmentDef, options) {
  const accepted = [];
  const rejected = [];
  const seenOrgTitle = new Set();
  let page = 1;
  let pagesVisited = 0;
  let totalEntries = null;

  while (accepted.length < segmentDef.targetCount && pagesVisited < 100) {
    pagesVisited += 1;
    const payload = {
      q_organization_keyword_tags: segmentDef.organizationTags,
      person_titles: segmentDef.includeTitles,
      person_locations: segmentDef.locations,
      person_seniorities: segmentDef.seniorities,
      organization_num_employees_ranges: ['11,50', '51,200', '201,500', '501,1000', '1001,5000', '5001,10000'],
    };
    const data = await apollo.searchPeople(payload, {
      page,
      per_page: options.perPage,
    });
    const people = data.people || [];
    totalEntries = data.total_entries ?? totalEntries;
    if (people.length === 0) break;

    for (const person of people) {
      const normalized = normalizePerson(person, segmentDef);
      normalized.has_email = Boolean(person.has_email || normalized.email);
      const gate = gatePerson(normalized, segmentDef);
      normalized.score = gate.score ?? scorePerson(normalized, segmentDef);
      if (!gate.accepted) {
        rejected.push({
          ...normalized,
          rejection_reason: gate.reason,
        });
        continue;
      }
      const orgTitleKey = `${lower(normalized.organization_name)}::${lower(normalized.title)}`;
      if (seenOrgTitle.has(orgTitleKey)) continue;
      seenOrgTitle.add(orgTitleKey);
      accepted.push(normalized);
      if (accepted.length >= segmentDef.targetCount) break;
    }

    if (accepted.length >= segmentDef.targetCount) break;
    page += 1;
    await sleep(options.pagePauseMs);
  }

  return {
    segment: segmentDef.key,
    accepted: dedupeAndSort(accepted),
    rejected,
    totalEntries,
    pagesVisited,
  };
}

async function bulkMatchEmails(apollo, candidates, options) {
  const matched = [];
  const unmatched = [];
  for (let i = 0; i < candidates.length; i += options.batchSize) {
    const batch = candidates.slice(i, i + options.batchSize);
    const details = batch.map((item) => ({ id: item.person_id }));
    const response = await apollo.bulkMatch(details);
    const people = response.matches || response.people || response.contacts || [];
    const byId = new Map();
    for (const person of people) {
      byId.set(normalizeText(person.id), person);
    }
    for (const item of batch) {
      const match = byId.get(item.person_id);
      if (!match) {
        unmatched.push({ ...item, match_status: 'missing' });
        continue;
      }
      const email = normalizeEmail(match.email);
      const enriched = {
        ...item,
        first_name: normalizeText(match.first_name || item.first_name),
        last_name: normalizeText(match.last_name || item.last_name),
        email,
        email_status: normalizeText(match.email_status || ''),
        linkedin_url: normalizeText(match.linkedin_url || item.linkedin_url),
        website_url: normalizeText(match.organization?.website_url || item.website_url),
        city: normalizeText(match.city || item.city),
        state: normalizeText(match.state || item.state),
        country: normalizeText(match.country || item.country),
        organization_name: normalizeText(match.organization?.name || item.organization_name),
        organization_id: normalizeText(match.organization?.id || item.organization_id),
        organization_industry: normalizeText(match.organization?.industry || item.organization_industry),
        organization_size: normalizeText(match.organization?.estimated_num_employees || item.organization_size),
        has_email: Boolean(email),
      };
      const segmentDef = options.segmentByKey[enriched.segment_key];
      const gate = finalGatePerson(enriched, segmentDef);
      if (!gate.accepted) {
        unmatched.push({ ...enriched, match_status: gate.reason });
        continue;
      }
      enriched.score = gate.score ?? enriched.score;
      matched.push(enriched);
    }
    if (i + options.batchSize < candidates.length) {
      await sleep(options.batchPauseMs);
    }
  }
  return { matched, unmatched };
}

function capByCompany(rows, cap) {
  const perCompany = new Map();
  const kept = [];
  const overflow = [];
  for (const row of rows) {
    const key = lower(row.organization_name);
    const count = perCompany.get(key) || 0;
    if (count >= cap) {
      overflow.push({ ...row, rejection_reason: 'company_cap_exceeded' });
      continue;
    }
    perCompany.set(key, count + 1);
    kept.push(row);
  }
  return { kept, overflow };
}

async function ensureLabels(apollo, segmentDefs) {
  const existing = await apollo.listLabels();
  const byName = new Map(existing.map((item) => [lower(item.name), item]));
  const labels = {};
  for (const segment of segmentDefs) {
    let label = byName.get(lower(segment.labelName));
    if (!label) {
      label = await apollo.createLabel(segment.labelName);
      byName.set(lower(segment.labelName), label);
    }
    labels[segment.key] = label;
  }
  return labels;
}

async function createApolloContacts(apollo, rows, labels) {
  const created = [];
  const errors = [];
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    try {
      const result = await apollo.bulkCreateContacts(batch.map((row) => ({
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        title: row.title,
        organization_name: row.organization_name,
        website_url: row.website_url || undefined,
        linkedin_url: row.linkedin_url || undefined,
        person_id: row.person_id || undefined,
        run_dedupe: true,
      })));

      const byEmail = new Map();
      for (const contact of [...(result.created_contacts || []), ...(result.existing_contacts || [])]) {
        byEmail.set(normalizeEmail(contact.email), contact);
      }

      const segmentAssignments = new Map();
      for (const row of batch) {
        const contact = byEmail.get(normalizeEmail(row.email));
        if (!contact?.id) {
          errors.push({
            person_id: row.person_id,
            email: row.email,
            organization_name: row.organization_name,
            error: 'bulk_create_missing_contact_id',
          });
          continue;
        }
        const label = labels[row.segment_key];
        if (label?.id) {
          const ids = segmentAssignments.get(row.segment_key) || [];
          ids.push(contact.id);
          segmentAssignments.set(row.segment_key, ids);
        }
        created.push({
          ...row,
          apollo_contact_id: normalizeText(contact.id),
          apollo_label_id: normalizeText(label?.id),
          apollo_label_name: label?.name || '',
        });
      }

      for (const [segmentKey, contactIds] of segmentAssignments.entries()) {
        const label = labels[segmentKey];
        if (!label?.id || contactIds.length === 0) continue;
        await apollo.bulkUpdateContacts({
          contact_attributes: contactIds.map((contactId) => ({
            id: contactId,
            label_ids: [label.id],
          })),
        });
      }
    } catch (error) {
      for (const row of batch) {
        errors.push({
          person_id: row.person_id,
          email: row.email,
          organization_name: row.organization_name,
          error: error.message || String(error),
        });
      }
    }
  }
  return { created, errors };
}

function sequenceDefinitions() {
  return [
    {
      key: 'decision_makers',
      steps: [
        {
          subject: 'A 30-day cyber lab pilot for {{account.name}}?',
          body_text: `Hi {{first_name}},\n\nI’m reaching out because many universities want more hands-on cybersecurity learning without taking on lab infrastructure and setup overhead internally.\n\nSimulations Labs helps universities run browser-based cyber labs and simulations with a managed setup, so teams can pilot practical learning faster.\n\nWe’re opening a small number of 30-day pilot slots for university programs.\n\nWould you be open to a 15-minute scoping call next week?\n\nHannah`,
        },
        {
          subject: 'Re: 30-day cyber lab pilot',
          body_text: `{{first_name}}, quick follow-up.\n\nIf useful, I can send a short outline showing how the pilot works, what the academic team needs from its side, and what learner outcomes can be measured in the first 30 days.\n\nShould I send that over before we book a call?\n\nHannah`,
        },
        {
          subject: 'Should I close this out?',
          body_text: `{{first_name}},\n\nI can close this out if a practical cyber lab pilot is not a priority right now.\n\nIf it is worth a quick review, reply with Pilot and I’ll send a few times.\n\nHannah`,
        },
      ],
    },
    {
      key: 'faculty_operators',
      steps: [
        {
          subject: 'Could this make cyber labs easier to run this term?',
          body_text: `Hi {{first_name}},\n\nQuick question: are you running cybersecurity labs, assessments, or practical exercises for learners right now?\n\nOne issue we hear often is that faculty want more hands-on learning, but managing the technical setup becomes the bottleneck.\n\nSimulations Labs gives instructors browser-based isolated labs without internal setup overhead.\n\nWould a short pilot scoping call be useful?\n\nNoah`,
        },
        {
          subject: 'Re: easier cyber labs this term',
          body_text: `{{first_name}}, following up in case this is relevant for the current term.\n\nI can send a short summary of how education teams use the platform for lab delivery, assessment credibility, and readiness measurement.\n\nShould I send that over?\n\nNoah`,
        },
        {
          subject: 'Close the loop on this?',
          body_text: `{{first_name}},\n\nI can close this thread if practical cyber labs are not on your radar right now.\n\nIf you want the pilot outline, reply with Pilot.\n\nNoah`,
        },
      ],
    },
  ];
}

async function ensureSequences(apollo, segmentDefs) {
  const defsByType = new Map(sequenceDefinitions().map((item) => [item.key, item]));
  const existingResponse = await apollo.searchSequences('SimLabs | Draft | Universities');
  const existingItems = existingResponse.emailer_campaigns || existingResponse.campaigns || [];
  const created = [];

  for (const segment of segmentDefs) {
    const existing = existingItems.find((item) => lower(item.name) === lower(segment.sequenceName));
    const typeDef = defsByType.get(segment.segmentType);
    let sequenceId = existing?.id || '';
    let sequenceName = existing?.name || segment.sequenceName;
    let status = existing ? 'existing' : 'created';

    if (!sequenceId) {
      const response = await apollo.createSequence({
        name: segment.sequenceName,
        active: false,
      });
      const sequence = response.emailer_campaign || response;
      sequenceId = sequence.id;
      sequenceName = sequence.name || sequenceName;
    }

    let hydrated = await apollo.getSequence(sequenceId);
    const existingSteps = hydrated.emailer_steps || [];
    for (let index = existingSteps.length; index < typeDef.steps.length; index += 1) {
      await apollo.createSequenceStep({
        emailer_campaign_id: sequenceId,
        type: 'auto_email',
        position: index + 1,
        wait_time: index === 0 ? 0 : (index === 1 ? 3 : 6),
        wait_mode: 'day',
      });
      status = existing ? 'updated' : status;
    }

    hydrated = await apollo.getSequence(sequenceId);
    const templates = hydrated.emailer_templates || [];
    for (let index = 0; index < typeDef.steps.length; index += 1) {
      const template = templates[index];
      if (!template) continue;
      await apollo.updateTemplate(template.id, {
        subject: typeDef.steps[index].subject,
        body_text: typeDef.steps[index].body_text,
        body_html: `<div>${typeDef.steps[index].body_text.replace(/\n/g, '</div><div>')}</div>`,
      });
    }

    created.push({
      segment_key: segment.key,
      sequence_id: sequenceId,
      sequence_name: sequenceName,
      status,
    });
  }

  return created;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(`Usage: node apollo_simlabs_university_builder.mjs [options]

Options:
  --target=1000
  --per-page=100
  --page-pause-ms=2500
  --max-per-minute=20
  --company-cap=2
  --batch-size=25
  --batch-pause-ms=5000
`);
    return;
  }

  const apiKey = process.env.APOLLO_API_KEY || '';
  if (!apiKey) {
    throw new Error('Missing APOLLO_API_KEY');
  }

  const target = asPositiveNumber(getArgValue(args, '--target', String(DEFAULT_TARGET)), DEFAULT_TARGET);
  const perPage = asPositiveNumber(getArgValue(args, '--per-page', String(DEFAULT_PER_PAGE)), DEFAULT_PER_PAGE);
  const pagePauseMs = asPositiveNumber(getArgValue(args, '--page-pause-ms', String(DEFAULT_DELAY_MS)), DEFAULT_DELAY_MS);
  const maxPerMinute = asPositiveNumber(getArgValue(args, '--max-per-minute', String(DEFAULT_MAX_PER_MINUTE)), DEFAULT_MAX_PER_MINUTE);
  const companyCap = asPositiveNumber(getArgValue(args, '--company-cap', String(DEFAULT_COMPANY_CAP)), DEFAULT_COMPANY_CAP);
  const batchSize = Math.min(
    10,
    asPositiveNumber(getArgValue(args, '--batch-size', String(DEFAULT_BATCH_SIZE)), DEFAULT_BATCH_SIZE),
  );
  const batchPauseMs = asPositiveNumber(getArgValue(args, '--batch-pause-ms', String(DEFAULT_BATCH_PAUSE_MS)), DEFAULT_BATCH_PAUSE_MS);

  ensureDir(PATHS.raw);
  ensureDir(PATHS.insights);

  const apollo = new ApolloClient(apiKey, {
    maxPerMinute,
    delayMs: pagePauseMs,
  });

  const health = await apollo.health();
  if (!health?.healthy) {
    throw new Error(`Apollo health failed: ${JSON.stringify(health)}`);
  }

  const baseSegments = segmentDefinitions();
  const perSegmentTarget = Math.ceil((target * 1.6) / baseSegments.length);
  const segments = baseSegments.map((item) => ({ ...item, targetCount: perSegmentTarget }));

  const searchResults = [];
  for (const segment of segments) {
    console.error(`[phase] search ${segment.key}`);
    const result = await searchSegment(apollo, segment, {
      perPage,
      pagePauseMs,
    });
    searchResults.push(result);
    await sleep(pagePauseMs);
  }

  const staged = searchResults.flatMap((result) => result.accepted);
  console.error(`[phase] bulk_match ${staged.length} staged`);
  const matched = await bulkMatchEmails(apollo, staged, {
    batchSize,
    batchPauseMs,
    segmentByKey: Object.fromEntries(segments.map((segment) => [segment.key, segment])),
  });

  const uniqueByEmail = new Map();
  for (const row of matched.matched) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    const existing = uniqueByEmail.get(email);
    if (!existing || row.score > existing.score) {
      uniqueByEmail.set(email, row);
    }
  }

  const deduped = [...uniqueByEmail.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return seniorityRank(b.seniority) - seniorityRank(a.seniority);
  });

  const capped = capByCompany(deduped, companyCap);
  const finalRows = capped.kept.slice(0, target);
  console.error(`[phase] labels ${segments.length}`);
  const labelMap = await ensureLabels(apollo, segments);
  console.error(`[phase] contacts ${finalRows.length}`);
  const contactResults = await createApolloContacts(apollo, finalRows, labelMap);
  console.error(`[phase] sequences ${segments.length}`);
  const sequenceResults = await ensureSequences(apollo, segments);

  const sequenceBySegment = new Map(sequenceResults.map((item) => [item.segment_key, item]));
  const labelBySegment = new Map(Object.entries(labelMap).map(([key, value]) => [key, value]));

  const enrichedRows = contactResults.created.map((row) => ({
    lead_key: hash(`${row.email}|${row.person_id}`),
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    title: row.title,
    organization_name: row.organization_name,
    organization_industry: row.organization_industry,
    organization_size: row.organization_size,
    country: row.country,
    state: row.state,
    city: row.city,
    region: row.region,
    segment_key: row.segment_key,
    segment_type: row.segment_type,
    score: row.score,
    email_status: row.email_status,
    linkedin_url: row.linkedin_url,
    website_url: row.website_url,
    person_id: row.person_id,
    apollo_contact_id: row.apollo_contact_id,
    apollo_label_id: row.apollo_label_id,
    apollo_label_name: row.apollo_label_name,
    apollo_sequence_id: sequenceBySegment.get(row.segment_key)?.sequence_id || '',
    apollo_sequence_name: sequenceBySegment.get(row.segment_key)?.sequence_name || '',
  }));

  const searchSummary = searchResults.map((item) => ({
    segment: item.segment,
    total_entries: item.totalEntries,
    accepted_before_match: item.accepted.length,
    rejected_before_match: item.rejected.length,
    pages_visited: item.pagesVisited,
  }));

  const reviewSummary = {
    generated_at: isoNow(),
    requested_target: target,
    final_contacts_created: contactResults.created.length,
    final_contact_errors: contactResults.errors.length,
    unmatched_after_bulk_match: matched.unmatched.length,
    company_cap_overflow: capped.overflow.length,
    search_summary: searchSummary,
    labels: Object.fromEntries(Object.entries(labelMap).map(([key, value]) => [key, { id: value.id, name: value.name }])),
    sequences: sequenceResults,
  };

  const datedJson = path.join(PATHS.insights, `apollo_simlabs_university_batch_${todayStamp()}.json`);
  const datedCsv = path.join(PATHS.insights, `apollo_simlabs_university_batch_${todayStamp()}.csv`);
  const liveJson = path.join(PATHS.raw, 'apollo_simlabs_university_batch_live.json');
  const errorsJson = path.join(PATHS.insights, `apollo_simlabs_university_batch_errors_${todayStamp()}.json`);

  writeJson(datedJson, {
    summary: reviewSummary,
    rows: enrichedRows,
    contact_errors: contactResults.errors,
    unmatched: matched.unmatched,
    company_cap_overflow: capped.overflow,
    search_results: searchResults.map((item) => ({
      segment: item.segment,
      total_entries: item.totalEntries,
      accepted: item.accepted.slice(0, 20),
      rejected_sample: item.rejected.slice(0, 20),
    })),
  });
  writeJson(liveJson, {
    summary: reviewSummary,
    rows: enrichedRows,
  });
  writeJson(errorsJson, {
    contact_errors: contactResults.errors,
    unmatched: matched.unmatched,
    company_cap_overflow: capped.overflow,
  });

  writeCsv(
    datedCsv,
    enrichedRows,
    [
      'lead_key',
      'email',
      'first_name',
      'last_name',
      'title',
      'organization_name',
      'organization_industry',
      'organization_size',
      'country',
      'state',
      'city',
      'region',
      'segment_key',
      'segment_type',
      'score',
      'email_status',
      'linkedin_url',
      'website_url',
      'person_id',
      'apollo_contact_id',
      'apollo_label_id',
      'apollo_label_name',
      'apollo_sequence_id',
      'apollo_sequence_name',
    ],
  );

  console.log(JSON.stringify(reviewSummary, null, 2));
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message || error}`);
  process.exit(1);
});
