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

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { header: [], rows: [] };

  function parseLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  const header = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseLine(line);
    const row = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });
    return row;
  });
  return { header, rows };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function asPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function safeReadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function safeReadCsv(filePath) {
  if (!fs.existsSync(filePath)) return { header: [], rows: [] };
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fileExists(root, relPath) {
  if (!relPath) return false;
  return fs.existsSync(path.join(root, relPath));
}

function buildUrls(repoSlug) {
  const baseBlob = `https://github.com/${repoSlug}/blob/main/`;
  const baseRaw = `https://raw.githubusercontent.com/${repoSlug}/main/`;

  return {
    blob: (relPath) => `${baseBlob}${encodeURI(asPosix(relPath))}`,
    raw: (relPath) => `${baseRaw}${encodeURI(asPosix(relPath))}`,
    preview: (relPath) => `https://htmlpreview.github.io/?${baseRaw}${encodeURI(asPosix(relPath))}`
  };
}

function linkType(relPath) {
  const ext = path.extname(relPath || '').toLowerCase();
  if (ext === '.html') return 'preview';
  if (ext === '.md' || ext === '.pdf' || ext === '.csv' || ext === '.json') return 'blob';
  return 'raw';
}

function normalizeLink(relPath, urls) {
  if (!relPath) return '';
  const t = linkType(relPath);
  if (t === 'preview') return urls.preview(relPath);
  if (t === 'blob') return urls.blob(relPath);
  return urls.raw(relPath);
}

function toDateValue(input) {
  if (!input) return 0;
  const ts = Date.parse(input);
  return Number.isFinite(ts) ? ts : 0;
}

function createDashboardHtml(data, generatedAtIso, repoSlug) {
  const payload = JSON.stringify(data);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Internal Proposal CRM Hub</title>
  <style>
    :root {
      --navy: #0d1f53;
      --gold: #c89a4a;
      --bg: #f4f5f8;
      --card: #ffffff;
      --line: #dde1ea;
      --text: #1e2536;
      --muted: #65708a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Akkurat Pro", "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(160deg, #eef1f7 0%, #f8f9fc 60%, #f3f4f7 100%);
      color: var(--text);
      padding: 20px;
    }
    .wrap {
      max-width: 1240px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(13, 31, 83, 0.08);
    }
    .hero {
      padding: 24px;
      background: radial-gradient(circle at 85% 0%, rgba(200, 154, 74, 0.2), transparent 42%),
                  linear-gradient(130deg, #0d1f53, #213b89);
      color: #fff;
    }
    .hero h1 {
      margin: 0 0 6px;
      font-size: 1.65rem;
      letter-spacing: 0.2px;
    }
    .hero p {
      margin: 4px 0;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.4;
      font-size: 0.95rem;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .kpi {
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
    }
    .kpi .label { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.84; }
    .kpi .value { font-size: 1.2rem; font-weight: 700; margin-top: 4px; }
    .controls {
      padding: 18px 24px;
      border-bottom: 1px solid var(--line);
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 10px;
      background: #fbfcff;
    }
    input, select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.92rem;
      color: var(--text);
      background: #fff;
    }
    .table-wrap { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 980px;
    }
    thead th {
      text-align: left;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      border-bottom: 1px solid var(--line);
      padding: 12px 14px;
      background: #f7f9ff;
    }
    tbody td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
      font-size: 0.9rem;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 0.73rem;
      background: #eef3ff;
      border: 1px solid #cfdbff;
      color: #2a4da2;
      white-space: nowrap;
    }
    .status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 0.73rem;
      border: 1px solid #e4d4b6;
      background: #fff7e8;
      color: #8a5a12;
      white-space: nowrap;
    }
    .links a {
      display: inline-block;
      margin: 0 8px 8px 0;
      color: #214196;
      text-decoration: none;
      font-size: 0.84rem;
      padding: 4px 8px;
      border: 1px solid #d7e1ff;
      border-radius: 7px;
      background: #f5f8ff;
    }
    .links a:hover { background: #ebf0ff; }
    .empty {
      padding: 26px;
      text-align: center;
      color: var(--muted);
    }
    .footer {
      padding: 14px 24px;
      color: var(--muted);
      font-size: 0.82rem;
      background: #fcfcfe;
      border-top: 1px solid var(--line);
    }
    @media (max-width: 900px) {
      .kpis { grid-template-columns: repeat(2, 1fr); }
      .controls { grid-template-columns: 1fr; }
      body { padding: 10px; }
      .hero h1 { font-size: 1.35rem; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <h1>Admireworks Internal Proposal CRM</h1>
      <p>Unified operational view for sent and legacy proposals.</p>
      <p>Generated: ${escapeHtml(generatedAtIso)} | Repo: ${escapeHtml(repoSlug)}</p>
      <div class="kpis">
        <div class="kpi"><div class="label">Total Records</div><div class="value" id="kpi-total">0</div></div>
        <div class="kpi"><div class="label">Ready To Send</div><div class="value" id="kpi-ready">0</div></div>
        <div class="kpi"><div class="label">Legacy Records</div><div class="value" id="kpi-legacy">0</div></div>
        <div class="kpi"><div class="label">Registry Records</div><div class="value" id="kpi-registry">0</div></div>
      </div>
    </div>

    <div class="controls">
      <input id="search" type="search" placeholder="Search by proposal ID or client name" />
      <select id="statusFilter"><option value="">All Statuses</option></select>
      <select id="sourceFilter">
        <option value="">All Sources</option>
        <option value="registry">Registry</option>
        <option value="legacy">Legacy</option>
      </select>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Proposal</th>
            <th>Client</th>
            <th>Date</th>
            <th>Status</th>
            <th>Pipeline</th>
            <th>Source</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
      <div id="empty" class="empty" style="display:none;">No proposals match the current filters.</div>
    </div>

    <div class="footer">
      Internal use only. Keep this page updated through proposal system scripts.
    </div>
  </div>

  <script id="crm-data" type="application/json">${escapeHtml(payload)}</script>
  <script>
    const records = JSON.parse(document.getElementById('crm-data').textContent);
    const rowsEl = document.getElementById('rows');
    const emptyEl = document.getElementById('empty');
    const searchEl = document.getElementById('search');
    const statusEl = document.getElementById('statusFilter');
    const sourceEl = document.getElementById('sourceFilter');

    function renderKpis(items) {
      document.getElementById('kpi-total').textContent = String(items.length);
      document.getElementById('kpi-ready').textContent = String(items.filter((r) => r.status === 'READY_TO_SEND').length);
      document.getElementById('kpi-legacy').textContent = String(items.filter((r) => r.source_type === 'legacy').length);
      document.getElementById('kpi-registry').textContent = String(items.filter((r) => r.source_type === 'registry').length);
    }

    function buildStatusOptions(items) {
      const set = new Set(items.map((r) => r.status).filter(Boolean));
      [...set].sort().forEach((status) => {
        const opt = document.createElement('option');
        opt.value = status;
        opt.textContent = status;
        statusEl.appendChild(opt);
      });
    }

    function actionsHtml(record) {
      const links = [];
      if (record.links.one_page) links.push('<a href="' + record.links.one_page + '" target="_blank" rel="noopener noreferrer">👉 View One-Page</a>');
      if (record.links.presentation) links.push('<a href="' + record.links.presentation + '" target="_blank" rel="noopener noreferrer">👉 View Presentation</a>');
      if (record.links.offer_doc) links.push('<a href="' + record.links.offer_doc + '" target="_blank" rel="noopener noreferrer">👉 View Offer</a>');
      if (record.links.research_doc) links.push('<a href="' + record.links.research_doc + '" target="_blank" rel="noopener noreferrer">👉 View Research</a>');
      if (record.links.pdf) links.push('<a href="' + record.links.pdf + '" target="_blank" rel="noopener noreferrer">👉 View PDF</a>');
      if (record.links.package_index) links.push('<a href="' + record.links.package_index + '" target="_blank" rel="noopener noreferrer">👉 View Package Index</a>');
      return links.join('');
    }

    function renderTable(items) {
      rowsEl.innerHTML = '';
      if (!items.length) {
        emptyEl.style.display = 'block';
        return;
      }
      emptyEl.style.display = 'none';

      items.forEach((r) => {
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td><strong>' + (r.id || '-') + '</strong><br><span class="badge">' + (r.country_code || 'NA') + '</span></td>' +
          '<td>' + (r.client_name || '-') + '<br><small style="color:#6a7286;">' + (r.owner || '-') + '</small></td>' +
          '<td>' + (r.send_date || '-') + '</td>' +
          '<td><span class="status">' + (r.status || '-') + '</span></td>' +
          '<td>' + (r.pipeline_stage || '-') + '<br><small style="color:#6a7286;">' + (r.next_action || '') + '</small></td>' +
          '<td><span class="badge">' + (r.source_type || '-') + '</span></td>' +
          '<td class="links">' + actionsHtml(r) + '</td>';
        rowsEl.appendChild(tr);
      });
    }

    function applyFilters() {
      const q = searchEl.value.trim().toLowerCase();
      const status = statusEl.value;
      const source = sourceEl.value;

      const filtered = records.filter((r) => {
        const searchable = ((r.id || '') + ' ' + (r.client_name || '')).toLowerCase();
        if (q && !searchable.includes(q)) return false;
        if (status && r.status !== status) return false;
        if (source && r.source_type !== source) return false;
        return true;
      });

      renderTable(filtered);
    }

    renderKpis(records);
    buildStatusOptions(records);
    renderTable(records);

    searchEl.addEventListener('input', applyFilters);
    statusEl.addEventListener('change', applyFilters);
    sourceEl.addEventListener('change', applyFilters);
  </script>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root || process.cwd());
  const repoSlug = String(args['repo-slug'] || process.env.REPO_SLUG || 'fnasr-source/lighting-strategy');

  const registryPath = path.join(root, 'Proposals', '_Proposal-System', 'proposal-registry.csv');
  const crmPath = path.join(root, 'Proposals', '_Proposal-System', 'proposal-crm.csv');
  const legacyPath = path.join(root, 'Proposals', '_Proposal-System', 'legacy-proposals.json');

  const registry = safeReadCsv(registryPath).rows;
  const crmRows = safeReadCsv(crmPath).rows;
  const legacy = safeReadJson(legacyPath, []);

  const crmMap = new Map();
  crmRows.forEach((row) => {
    if (row.proposal_number) crmMap.set(row.proposal_number, row);
  });

  const urls = buildUrls(repoSlug);

  const registryRecords = registry.map((row) => {
    const crm = crmMap.get(row.proposal_number) || {};

    const relOnePage = `${row.outgoing_folder}/one-page.html`;
    const relPresentationOutgoing = `${row.outgoing_folder}/presentation.html`;
    const relPresentationSource = `${row.source_folder}/11-Final-Presentation.html`;
    const relOffer = `${row.source_folder}/06-Offer-and-Proposal.md`;
    const relResearch = `${row.source_folder}/02-Research-Report.md`;
    const relIndex = `${row.source_folder}/00-Proposal-Index.md`;

    const links = {
      one_page: fileExists(root, relOnePage) ? urls.preview(relOnePage) : '',
      presentation: fileExists(root, relPresentationOutgoing)
        ? urls.preview(relPresentationOutgoing)
        : (fileExists(root, relPresentationSource) ? urls.preview(relPresentationSource) : ''),
      offer_doc: fileExists(root, relOffer) ? urls.blob(relOffer) : '',
      research_doc: fileExists(root, relResearch) ? urls.blob(relResearch) : '',
      pdf: '',
      package_index: fileExists(root, relIndex) ? urls.blob(relIndex) : ''
    };

    return {
      id: row.proposal_number,
      source_type: 'registry',
      client_name: row.client_name,
      country_code: row.country_code,
      send_date: row.send_date,
      status: row.status,
      owner: row.owner,
      pipeline_stage: crm.pipeline_stage || row.status || '',
      next_action: crm.next_action || '',
      next_action_date: crm.next_action_date || '',
      priority: crm.priority || '',
      last_contact_date: crm.last_contact_date || '',
      recommended_option: row.recommended_option || '',
      links
    };
  });

  const legacyRecords = legacy.map((item) => {
    const links = {
      one_page: normalizeLink(item.links && item.links.one_page, urls),
      presentation: normalizeLink(item.links && item.links.presentation, urls),
      offer_doc: normalizeLink(item.links && item.links.offer_doc, urls),
      research_doc: normalizeLink(item.links && item.links.research_doc, urls),
      pdf: normalizeLink(item.links && item.links.pdf, urls),
      package_index: normalizeLink(item.links && item.links.package_index, urls)
    };

    return {
      id: item.record_id || '',
      source_type: 'legacy',
      client_name: item.client_name || '',
      country_code: item.country_code || '',
      send_date: item.send_date || '',
      status: item.status || 'ARCHIVED',
      owner: item.owner || '',
      pipeline_stage: item.pipeline_stage || 'Historical',
      next_action: item.next_action || '',
      next_action_date: item.next_action_date || '',
      priority: item.priority || '',
      last_contact_date: item.last_contact_date || '',
      recommended_option: '',
      links
    };
  });

  const records = [...registryRecords, ...legacyRecords].sort((a, b) => {
    const dateCmp = toDateValue(b.send_date) - toDateValue(a.send_date);
    if (dateCmp !== 0) return dateCmp;
    return (a.client_name || '').localeCompare(b.client_name || '');
  });

  const generatedAt = new Date().toISOString();
  const html = createDashboardHtml(records, generatedAt, repoSlug);

  const outputs = [
    path.join(root, 'Proposals', '_Outgoing', '_internal-crm', 'index.html'),
    path.join(root, 'Internal-OS', 'proposals', 'index.html')
  ];

  outputs.forEach((out) => {
    ensureDir(path.dirname(out));
    fs.writeFileSync(out, html, 'utf8');
  });

  console.log(JSON.stringify({
    generated_at: generatedAt,
    repo_slug: repoSlug,
    record_count: records.length,
    output_files: outputs.map((p) => path.relative(root, p))
  }, null, 2));
}

main();
