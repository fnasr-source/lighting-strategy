#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    args[key] = val;
  }
  return args;
}

function parseCsvSimple(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row = {};
    header.forEach((h, i) => {
      row[h] = cols[i] || '';
    });
    return row;
  });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function asPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    if (entry.name === '.DS_Store') return;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(abs, out);
      return;
    }
    out.push(abs);
  });
  return out;
}

function buildUrls(repoSlug) {
  const baseRaw = `https://raw.githubusercontent.com/${repoSlug}/main/`;
  const baseBlob = `https://github.com/${repoSlug}/blob/main/`;
  return {
    preview: (relPath) => `https://htmlpreview.github.io/?${baseRaw}${encodeURI(asPosix(relPath))}`,
    blob: (relPath) => `${baseBlob}${encodeURI(asPosix(relPath))}`
  };
}

function buildHomeHtml(ctx) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admireworks Internal OS</title>
  <style>
    :root {
      --navy: #0c1f55;
      --blue: #2a4aa8;
      --gold: #c89d4f;
      --bg: #eef1f8;
      --card: #fff;
      --line: #dce3ef;
      --text: #1f2738;
      --muted: #69748c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Akkurat Pro", "Helvetica Neue", Arial, sans-serif;
      background: radial-gradient(circle at 12% -10%, rgba(42, 74, 168, 0.12), transparent 45%),
                  radial-gradient(circle at 95% -5%, rgba(200, 157, 79, 0.2), transparent 35%),
                  var(--bg);
      color: var(--text);
      padding: 18px;
    }
    .wrap {
      max-width: 1120px;
      margin: 0 auto;
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      background: var(--card);
      box-shadow: 0 16px 40px rgba(17, 38, 100, 0.08);
    }
    .hero {
      padding: 24px;
      background: linear-gradient(135deg, var(--navy), #25459d);
      color: #fff;
    }
    .hero h1 { margin: 0 0 6px; font-size: 1.62rem; }
    .hero p { margin: 2px 0; font-size: 0.92rem; opacity: 0.95; }
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 14px;
    }
    .kpi {
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 9px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.08);
    }
    .kpi .label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.84; }
    .kpi .value { font-size: 1.14rem; font-weight: 700; margin-top: 5px; }
    .content { padding: 20px 24px; }
    .section-title { font-size: 1rem; margin: 0 0 12px; color: var(--navy); }
    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px;
      background: #fff;
    }
    .card h3 { margin: 0 0 6px; font-size: 1.02rem; }
    .card p { margin: 0 0 10px; color: var(--muted); font-size: 0.88rem; line-height: 1.45; }
    .card a {
      display: inline-block;
      text-decoration: none;
      color: #21439d;
      border: 1px solid #d6e0ff;
      background: #f3f6ff;
      border-radius: 8px;
      padding: 6px 9px;
      font-size: 0.84rem;
      margin-right: 6px;
      margin-bottom: 6px;
    }
    .list {
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
    }
    .row {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr 0.8fr auto;
      gap: 10px;
      border-bottom: 1px solid var(--line);
      padding: 10px 12px;
      font-size: 0.88rem;
      align-items: center;
    }
    .row:last-child { border-bottom: 0; }
    .muted { color: var(--muted); }
    .pill {
      display: inline-block;
      font-size: 0.72rem;
      border: 1px solid #e3d1af;
      border-radius: 999px;
      padding: 3px 8px;
      background: #fff6e7;
      color: #8a5c17;
      width: fit-content;
    }
    .foot {
      border-top: 1px solid var(--line);
      padding: 12px 24px;
      background: #fbfcff;
      color: var(--muted);
      font-size: 0.82rem;
    }
    @media (max-width: 900px) {
      body { padding: 10px; }
      .kpis { grid-template-columns: repeat(2, 1fr); }
      .cards { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <h1>Admireworks Internal OS</h1>
      <p>Central internal operating system for proposals, strategies, and CRM tracking.</p>
      <p>Generated: ${escapeHtml(ctx.generatedAt)} | Repo: ${escapeHtml(ctx.repoSlug)}</p>
      <div class="kpis">
        <div class="kpi"><div class="label">Total Proposals</div><div class="value">${ctx.totalProposals}</div></div>
        <div class="kpi"><div class="label">Ready To Send</div><div class="value">${ctx.readyToSend}</div></div>
        <div class="kpi"><div class="label">Legacy Records</div><div class="value">${ctx.legacyCount}</div></div>
        <div class="kpi"><div class="label">Strategy Assets</div><div class="value">${ctx.strategyAssets}</div></div>
      </div>
    </div>
    <div class="content">
      <h2 class="section-title">Core Modules</h2>
      <div class="cards">
        <div class="card">
          <h3>Proposals CRM Hub</h3>
          <p>Operational dashboard for sent and legacy proposals with direct open links.</p>
          <a href="${ctx.urls.proposalsHub}" target="_blank" rel="noopener noreferrer">Open Proposals Hub</a>
          <a href="${ctx.urls.registry}" target="_blank" rel="noopener noreferrer">Open Registry</a>
        </div>
        <div class="card">
          <h3>Strategies Hub</h3>
          <p>Cross-device index for strategy playbooks, reports, and client strategy assets.</p>
          <a href="${ctx.urls.strategiesHub}" target="_blank" rel="noopener noreferrer">Open Strategies Hub</a>
          <a href="${ctx.urls.strategiesRoot}" target="_blank" rel="noopener noreferrer">Open Strategies Folder</a>
        </div>
        <div class="card">
          <h3>System Manual</h3>
          <p>Operating guide, workflow standards, link map, and update rules.</p>
          <a href="${ctx.urls.systemManual}" target="_blank" rel="noopener noreferrer">Open System Manual</a>
          <a href="${ctx.urls.linkMap}" target="_blank" rel="noopener noreferrer">Open Link Map</a>
        </div>
      </div>

      <h2 class="section-title">Latest Proposal Records</h2>
      <div class="list">
        ${ctx.latestRows || '<div class="row"><div>No records yet</div></div>'}
      </div>
    </div>
    <div class="foot">Internal use only. Keep dashboards generated using scripts in <code>Proposals/_Proposal-System/scripts/</code>.</div>
  </div>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root || process.cwd());
  const repoSlug = String(args['repo-slug'] || process.env.REPO_SLUG || 'fnasr-source/lighting-strategy');
  const urls = buildUrls(repoSlug);

  const registry = parseCsvSimple(path.join(root, 'Proposals', '_Proposal-System', 'proposal-registry.csv'));
  const legacyPath = path.join(root, 'Proposals', '_Proposal-System', 'legacy-proposals.json');
  const legacy = fs.existsSync(legacyPath) ? JSON.parse(fs.readFileSync(legacyPath, 'utf8')) : [];
  const strategyAssets = walkFiles(path.join(root, 'Strategies'))
    .filter((p) => ['.md', '.pdf', '.html'].includes(path.extname(p).toLowerCase())).length;

  const totalProposals = registry.length + legacy.length;
  const readyToSend = registry.filter((r) => r.status === 'READY_TO_SEND').length;
  const legacyCount = legacy.length;
  const generatedAt = new Date().toISOString();

  const latest = [...registry]
    .sort((a, b) => Date.parse(b.send_date || '1970-01-01') - Date.parse(a.send_date || '1970-01-01'))
    .slice(0, 6);

  const latestRows = latest.map((r) => {
    const onePageRel = `${r.outgoing_folder}/one-page.html`;
    const onePage = urls.preview(onePageRel);
    const offer = urls.blob(`${r.source_folder}/06-Offer-and-Proposal.md`);
    return `<div class="row"><div><strong>${escapeHtml(r.proposal_number)}</strong><div class="muted">${escapeHtml(r.client_name)}</div></div><div>${escapeHtml(r.send_date)}</div><div><span class="pill">${escapeHtml(r.status)}</span></div><div><a href="${onePage}" target="_blank" rel="noopener noreferrer">View One-Page</a> <a href="${offer}" target="_blank" rel="noopener noreferrer">View Offer</a></div></div>`;
  }).join('');

  const linkMap = {
    generated_at: generatedAt,
    repo_slug: repoSlug,
    links: {
      internal_home: urls.preview('Internal-OS/index.html'),
      proposals_hub: urls.preview('Proposals/_Outgoing/_internal-crm/index.html'),
      proposals_hub_mirror: urls.preview('Internal-OS/proposals/index.html'),
      strategies_hub: urls.preview('Internal-OS/strategies/index.html'),
      system_manual: urls.blob('Internal-OS/system/INDEX.md'),
      proposal_registry: urls.blob('Proposals/_Proposal-System/proposal-registry.csv'),
      proposal_crm: urls.blob('Proposals/_Proposal-System/proposal-crm.csv'),
      numbering_system: urls.blob('Proposals/_Proposal-System/NUMBERING-SYSTEM.md'),
      workflow_checklist: urls.blob('Proposals/_Proposal-System/WORKFLOW-CHECKLIST.md'),
      payment_rules: urls.blob('Proposals/_Proposal-System/PAYMENT-RULES.md'),
      link_standards: urls.blob('Proposals/_Proposal-System/LINK-STANDARDS.md'),
      strategies_root: urls.blob('Strategies')
    }
  };

  const homeCtx = {
    generatedAt,
    repoSlug,
    totalProposals,
    readyToSend,
    legacyCount,
    strategyAssets,
    latestRows,
    urls: {
      proposalsHub: linkMap.links.proposals_hub,
      registry: linkMap.links.proposal_registry,
      strategiesHub: linkMap.links.strategies_hub,
      strategiesRoot: linkMap.links.strategies_root,
      systemManual: linkMap.links.system_manual,
      linkMap: urls.blob('Internal-OS/system/link-map.json')
    }
  };

  const homeHtml = buildHomeHtml(homeCtx);
  const homePath = path.join(root, 'Internal-OS', 'index.html');
  const linkMapPath = path.join(root, 'Internal-OS', 'system', 'link-map.json');
  ensureDir(path.dirname(homePath));
  ensureDir(path.dirname(linkMapPath));
  fs.writeFileSync(homePath, homeHtml, 'utf8');
  fs.writeFileSync(linkMapPath, JSON.stringify(linkMap, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify({
    generated_at: generatedAt,
    output_files: [path.relative(root, homePath), path.relative(root, linkMapPath)],
    totals: {
      total_proposals: totalProposals,
      ready_to_send: readyToSend,
      legacy_records: legacyCount,
      strategy_assets: strategyAssets
    }
  }, null, 2));
}

main();
