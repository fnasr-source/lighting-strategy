#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PROJECT_GID = '1213388383279022';
const PATHS = {
  raw: path.join(ROOT, 'Data-Sources', 'Raw'),
  leadsInsights: path.join(ROOT, 'Knowledge-Base', 'Leads-Insights'),
};

const FIELD_GIDS = {
  owner: '1213388403636636',
  leadStatus: '1213388506227281',
  nextAction: '1213373047721036',
};

const OWNER_OPTIONS = {
  sahl: '1213388403636637',
  nourhan: '1213388403636638',
};

const STATUS_OPTIONS = {
  followUpNeeded: '1213388506227284',
  callPending: '1213388506227285',
};

const USER_GIDS = {
  sahl: '1213398563036889',
  nourhan: '1213398563036886',
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function isoNow() {
  return new Date().toISOString();
}

function todayStamp() {
  return isoNow().slice(0, 10);
}

async function asanaRequest(method, endpoint, apiKey, body = null) {
  const res = await fetch(`https://app.asana.com/api/1.0${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify({ data: body }) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`${method} ${endpoint} failed (${res.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data.data;
}

async function fetchProjectTasks(apiKey) {
  const data = await asanaRequest(
    'GET',
    `/tasks?project=${PROJECT_GID}&limit=100&opt_fields=gid,name,due_on,completed,modified_at,assignee.gid,assignee.name,memberships.section.name,custom_fields.gid,custom_fields.name,custom_fields.display_value`,
    apiKey,
  );
  return data;
}

function getFieldValue(task, fieldName) {
  return (task.custom_fields || []).find((field) => field.name === fieldName)?.display_value ?? null;
}

function getSectionName(task) {
  return task.memberships?.[0]?.section?.name || '';
}

function chooseOwner(task) {
  const section = getSectionName(task);
  if (section.includes('01 New Leads')) {
    return { user: USER_GIDS.nourhan, option: OWNER_OPTIONS.nourhan, label: 'Nourhan' };
  }
  return { user: USER_GIDS.sahl, option: OWNER_OPTIONS.sahl, label: 'Sahl' };
}

function tomorrowIsoDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function focusedTaskUpdates() {
  const dueOn = tomorrowIsoDate();
  return {
    '1213417321541032': {
      label: 'Rabab Nabawy',
      assignee: USER_GIDS.sahl,
      ownerOption: OWNER_OPTIONS.sahl,
      leadStatus: STATUS_OPTIONS.callPending,
      due_on: dueOn,
      nextAction: `${dueOn} WhatsApp follow-up to confirm discovery call slot and send pilot scoping agenda.`,
      comment: `Growth reset update (${todayStamp()}): priority is to confirm the discovery call via WhatsApp/phone, send the pilot scoping agenda, and either secure a date or explicitly move this lead to nurture.`,
    },
    '1213361868733088': {
      label: 'Ahmed Elgyar',
      assignee: USER_GIDS.sahl,
      ownerOption: OWNER_OPTIONS.sahl,
      leadStatus: STATUS_OPTIONS.callPending,
      due_on: dueOn,
      nextAction: `${dueOn} Email/WhatsApp follow-up to confirm whether the planned demo happened and lock the next call or close to nurture.`,
      comment: `Growth reset update (${todayStamp()}): this lead is being treated as an active discovery opportunity. Confirm whether the previous demo happened and either secure the next step or explicitly close/nurture.`,
    },
    '1213390980620575': {
      label: 'Daniel Mayer',
      assignee: USER_GIDS.sahl,
      ownerOption: OWNER_OPTIONS.sahl,
      leadStatus: STATUS_OPTIONS.followUpNeeded,
      due_on: dueOn,
      nextAction: `${dueOn} Send tailored follow-up with partnership/use-case angle and propose a 20-minute pilot scoping call.`,
      comment: `Growth reset update (${todayStamp()}): follow up with a tighter use-case message and one CTA only: a 20-minute pilot scoping call.`,
    },
    '1213390980620566': {
      label: 'Marwa',
      assignee: USER_GIDS.sahl,
      ownerOption: OWNER_OPTIONS.sahl,
      leadStatus: STATUS_OPTIONS.followUpNeeded,
      due_on: dueOn,
      nextAction: `${dueOn} Send security training pilot follow-up with measurable outcomes angle and ask for a scoping call.`,
      comment: `Growth reset update (${todayStamp()}): reposition the follow-up around measurable team readiness and book a pilot scoping conversation.`,
    },
    '1213388386673001': {
      label: 'Ayman',
      assignee: USER_GIDS.nourhan,
      ownerOption: OWNER_OPTIONS.nourhan,
      leadStatus: STATUS_OPTIONS.followUpNeeded,
      due_on: dueOn,
      nextAction: `${dueOn} Follow up with discovery scheduling for the education pilot and confirm if an instructor/program lead should join.`,
      comment: `Growth reset update (${todayStamp()}): move this out of passive follow-up and into an active discovery scheduling motion for the education pilot.`,
    },
    '1213388385460636': {
      label: 'Sameh Ayman',
      assignee: USER_GIDS.sahl,
      ownerOption: OWNER_OPTIONS.sahl,
      leadStatus: STATUS_OPTIONS.followUpNeeded,
      due_on: dueOn,
      nextAction: `${dueOn} Send education use-case follow-up and ask for a 20-minute pilot scoping call.`,
      comment: `Growth reset update (${todayStamp()}): this lead now sits in the education conversion sprint and should receive a direct follow-up with one clear CTA.`,
    },
  };
}

async function main() {
  const apiKey = process.env.ASANA_PAT || '';
  if (!apiKey) {
    throw new Error('Missing ASANA_PAT');
  }

  ensureDir(PATHS.raw);
  ensureDir(PATHS.leadsInsights);

  const tasks = await fetchProjectTasks(apiKey);
  const ownerUpdates = [];
  const focusedUpdates = [];
  const errors = [];

  for (const task of tasks) {
    const priority = getFieldValue(task, 'Lead Priority');
    const owner = getFieldValue(task, 'Owner');
    if (!['A - Hot', 'B - Warm'].includes(priority || '')) continue;
    if (owner && owner !== 'Unassigned') continue;

    const chosen = chooseOwner(task);
    try {
      await asanaRequest('PUT', `/tasks/${task.gid}`, apiKey, {
        assignee: chosen.user,
        custom_fields: {
          [FIELD_GIDS.owner]: chosen.option,
        },
      });
      ownerUpdates.push({
        gid: task.gid,
        name: task.name,
        section: getSectionName(task),
        owner: chosen.label,
      });
    } catch (err) {
      errors.push({ gid: task.gid, name: task.name, step: 'owner_assignment', error: String(err.message || err) });
    }
  }

  const updateMap = focusedTaskUpdates();
  for (const [gid, update] of Object.entries(updateMap)) {
    try {
      await asanaRequest('PUT', `/tasks/${gid}`, apiKey, {
        assignee: update.assignee,
        due_on: update.due_on,
        custom_fields: {
          [FIELD_GIDS.owner]: update.ownerOption,
          [FIELD_GIDS.leadStatus]: update.leadStatus,
          [FIELD_GIDS.nextAction]: update.nextAction,
        },
      });
      await asanaRequest('POST', `/tasks/${gid}/stories`, apiKey, {
        text: update.comment,
      });
      focusedUpdates.push({
        gid,
        name: update.label,
        due_on: update.due_on,
        nextAction: update.nextAction,
      });
    } catch (err) {
      errors.push({ gid, name: update.label, step: 'focused_update', error: String(err.message || err) });
    }
  }

  const report = {
    generatedAt: isoNow(),
    owner_updates_count: ownerUpdates.length,
    focused_updates_count: focusedUpdates.length,
    errors_count: errors.length,
    owner_updates: ownerUpdates,
    focused_updates: focusedUpdates,
    errors,
  };

  const jsonPath = path.join(PATHS.raw, `simlabs_crm_hygiene_${todayStamp()}.json`);
  const mdPath = path.join(PATHS.leadsInsights, `SIMLABS_CRM_HYGIENE_${todayStamp()}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const mdLines = [
    '# SimLabs CRM Hygiene Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Owner assignments updated: ${report.owner_updates_count}`,
    `- Focused hot/warm tasks updated: ${report.focused_updates_count}`,
    `- Errors: ${report.errors_count}`,
    '',
    '## Owner Assignments',
    ...ownerUpdates.map((row) => `- ${row.name} (${row.section}) -> ${row.owner}`),
    '',
    '## Focused Task Updates',
    ...focusedUpdates.map((row) => `- ${row.name}: due ${row.due_on} | ${row.nextAction}`),
  ];
  fs.writeFileSync(mdPath, `${mdLines.join('\n')}\n`, 'utf8');

  console.log(JSON.stringify({
    owner_updates_count: ownerUpdates.length,
    focused_updates_count: focusedUpdates.length,
    errors_count: errors.length,
    jsonPath,
    mdPath,
  }));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
