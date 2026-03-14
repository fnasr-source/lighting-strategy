#!/usr/bin/env node

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asPositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function lower(value) {
  return String(value || '').trim().toLowerCase();
}

class ApolloClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.delayMs = asPositiveNumber(options.delayMs, 1200);
    this.maxPerMinute = asPositiveNumber(options.maxPerMinute, 20);
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

  async request(method, endpoint, body = null) {
    await this.throttle();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const res = await fetch(`https://api.apollo.io${endpoint}`, {
        method,
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let data = text;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      if (!res.ok) {
        throw new Error(`${method} ${endpoint} failed (${res.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`);
      }
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async searchSequences(query) {
    return this.request('POST', '/api/v1/emailer_campaigns/search', { q: query });
  }

  async createSequence(payload) {
    return this.request('POST', '/api/v1/emailer_campaigns', payload);
  }

  async updateSequence(sequenceId, payload) {
    return this.request('PUT', `/api/v1/emailer_campaigns/${sequenceId}`, payload);
  }

  async getSequence(sequenceId) {
    return this.request('GET', `/api/v1/emailer_campaigns/${sequenceId}`);
  }

  async createStep(payload) {
    return this.request('POST', '/api/v1/emailer_steps', payload);
  }

  async updateTemplate(templateId, payload) {
    return this.request('PUT', `/api/v1/emailer_templates/${templateId}`, payload);
  }
}

function sequenceSpecs() {
  const commonDecision = [
    {
      type: 'auto_email',
      wait_time: 0,
      wait_mode: 'day',
      subject: 'A 30-day cyber lab pilot for {{account.name}}?',
      body_text: `Hi {{first_name}},

I’m reaching out because many universities want more hands-on cybersecurity learning without taking on lab infrastructure and setup overhead internally.

Simulations Labs helps universities run browser-based cyber labs and simulations with managed setup, so programs can pilot practical learning faster.

We’re opening a small number of 30-day pilot slots for university programs.

Would you be open to a 15-minute scoping call next week?`,
    },
    {
      type: 'action_item',
      wait_time: 2,
      wait_mode: 'day',
      note: 'LinkedIn task: view profile, send connect request, and mention a 30-day cyber lab pilot for university programs.',
    },
    {
      type: 'call',
      wait_time: 4,
      wait_mode: 'day',
      note: 'Call the contact if a direct line exists. Goal: qualify interest in a 30-day cyber lab pilot and offer a short scoping call.',
    },
    {
      type: 'auto_email',
      wait_time: 6,
      wait_mode: 'day',
      subject: 'Re: 30-day cyber lab pilot',
      body_text: `{{first_name}}, quick follow-up.

If useful, I can send a short outline showing how the pilot works, what the academic team needs from its side, and what learner outcomes can be measured in the first 30 days.

Should I send that over before we book a call?`,
    },
    {
      type: 'action_item',
      wait_time: 9,
      wait_mode: 'day',
      note: 'LinkedIn follow-up task: if connected, send a short note offering the pilot outline and scoping call.',
    },
    {
      type: 'manual_email',
      wait_time: 12,
      wait_mode: 'day',
      note: 'Manual breakup email if needed.',
      subject: 'Should I close this out?',
      body_text: `{{first_name}},

I can close this out if a practical cyber lab pilot is not a priority right now.

If it is worth a quick review, reply with Pilot and I’ll send a few times.`,
    },
  ];

  const commonFaculty = [
    {
      type: 'auto_email',
      wait_time: 0,
      wait_mode: 'day',
      subject: 'Could this make cyber labs easier to run this term?',
      body_text: `Hi {{first_name}},

Quick question: are you running cybersecurity labs, assessments, or practical exercises for learners right now?

One issue we hear often is that faculty want more hands-on learning, but managing the technical setup becomes the bottleneck.

Simulations Labs gives instructors browser-based isolated labs without internal setup overhead.

Would a short pilot scoping call be useful?`,
    },
    {
      type: 'action_item',
      wait_time: 2,
      wait_mode: 'day',
      note: 'LinkedIn task: view profile, send connect request, and reference practical cyber labs for the current term.',
    },
    {
      type: 'call',
      wait_time: 4,
      wait_mode: 'day',
      note: 'Call if a number exists. Goal: confirm whether the contact runs labs, assessments, or practical learning modules.',
    },
    {
      type: 'auto_email',
      wait_time: 6,
      wait_mode: 'day',
      subject: 'Re: easier cyber labs this term',
      body_text: `{{first_name}}, following up in case this is relevant for the current term.

I can send a short summary of how education teams use the platform for lab delivery, assessment credibility, and readiness measurement.

Should I send that over?`,
    },
    {
      type: 'action_item',
      wait_time: 9,
      wait_mode: 'day',
      note: 'LinkedIn follow-up task: if connected, send a short note offering the pilot outline and a short scoping call.',
    },
    {
      type: 'manual_email',
      wait_time: 12,
      wait_mode: 'day',
      note: 'Manual breakup email if needed.',
      subject: 'Close the loop on this?',
      body_text: `{{first_name}},

I can close this thread if practical cyber labs are not on your radar right now.

If you want the pilot outline, reply with Pilot.`,
    },
  ];

  return [
    {
      archiveName: 'SimLabs | Draft | Universities | MENA | Decision Makers | 2026-03-12',
      name: 'SimLabs | Draft | Universities | MENA | Decision Makers | Multichannel | 2026-03-12',
      steps: commonDecision,
    },
    {
      archiveName: 'SimLabs | Draft | Universities | MENA | Faculty and Operators | 2026-03-12',
      name: 'SimLabs | Draft | Universities | MENA | Faculty and Operators | Multichannel | 2026-03-12',
      steps: commonFaculty,
    },
    {
      archiveName: 'SimLabs | Draft | Universities | Global | Decision Makers | 2026-03-12',
      name: 'SimLabs | Draft | Universities | Global | Decision Makers | Multichannel | 2026-03-12',
      steps: commonDecision,
    },
    {
      archiveName: 'SimLabs | Draft | Universities | Global | Faculty and Operators | 2026-03-12',
      name: 'SimLabs | Draft | Universities | Global | Faculty and Operators | Multichannel | 2026-03-12',
      steps: commonFaculty,
    },
  ];
}

async function ensureMultichannelSequence(apollo, spec, existingCampaigns) {
  const oldSeq = existingCampaigns.find((item) => lower(item.name) === lower(spec.archiveName));
  if (oldSeq && !oldSeq.archived) {
    await apollo.updateSequence(oldSeq.id, { archived: true });
  }

  let sequence = existingCampaigns.find((item) => lower(item.name) === lower(spec.name));
  if (!sequence) {
    const created = await apollo.createSequence({ name: spec.name, active: false });
    sequence = created.emailer_campaign || created;
  }

  let detail = await apollo.getSequence(sequence.id);
  const currentCount = (detail.emailer_steps || []).length;
  for (let index = currentCount; index < spec.steps.length; index += 1) {
    const step = spec.steps[index];
    const payload = {
      emailer_campaign_id: sequence.id,
      type: step.type,
      wait_time: step.wait_time,
      wait_mode: step.wait_mode,
      position: index + 1,
    };
    if (step.note) payload.note = step.note;
    await apollo.createStep(payload);
  }

  detail = await apollo.getSequence(sequence.id);
  const stepById = new Map((detail.emailer_steps || []).map((step) => [step.id, step]));
  const templateById = new Map((detail.emailer_templates || []).map((template) => [template.id, template]));
  const touchByPosition = new Map(
    (detail.emailer_touches || []).map((touch) => {
      const step = stepById.get(touch.emailer_step_id);
      return [step?.position, touch];
    }).filter(([position]) => Number.isInteger(position)),
  );

  for (let index = 0; index < spec.steps.length; index += 1) {
    const step = spec.steps[index];
    if (!(step.type === 'auto_email' || step.type === 'manual_email')) continue;
    const touch = touchByPosition.get(index + 1);
    const template = touch ? templateById.get(touch.emailer_template_id) : null;
    if (!template) continue;
    await apollo.updateTemplate(template.id, {
      subject: step.subject,
      body_text: step.body_text,
      body_html: step.body_text
        .split(/\n{2,}/)
        .map((paragraph) => `<div>${paragraph.replace(/\n/g, '<br />')}</div>`)
        .join(''),
    });
  }

  const finalDetail = await apollo.getSequence(sequence.id);
  return {
    id: sequence.id,
    name: sequence.name || spec.name,
    archived_previous: Boolean(oldSeq && !oldSeq.archived),
    steps: (finalDetail.emailer_steps || []).map((step) => ({
      position: step.position,
      type: step.type,
      wait_time: step.wait_time,
      note: step.note || '',
    })),
  };
}

async function main() {
  const apiKey = process.env.APOLLO_API_KEY || '';
  if (!apiKey) {
    throw new Error('Missing APOLLO_API_KEY');
  }

  const apollo = new ApolloClient(apiKey);
  const search = await apollo.searchSequences('SimLabs | Draft | Universities');
  const existingCampaigns = search.emailer_campaigns || [];
  const results = [];

  for (const spec of sequenceSpecs()) {
    const result = await ensureMultichannelSequence(apollo, spec, existingCampaigns);
    results.push(result);
  }

  console.log(JSON.stringify({ results }, null, 2));
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message || error}`);
  process.exit(1);
});
