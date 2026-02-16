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

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function walkFiles(dir, root, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    if (entry.name === '.DS_Store') return;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(abs, root, out);
      return;
    }
    out.push(path.relative(root, abs));
  });
  return out;
}

function asPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function normalizeBaseUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildUrls(repoSlug, siteBaseInput) {
  const siteBase = normalizeBaseUrl(siteBaseInput || process.env.SITE_BASE || 'https://ops.admireworks.com');
  const raw = siteBase;
  const blob = siteBase;
  const preview = siteBase;
  return {
    preview: (relPath) => `${preview}${encodeURI(asPosix(relPath))}`,
    blob: (relPath) => `${blob}${encodeURI(asPosix(relPath))}`
  };
}

function classify(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const lower = filePath.toLowerCase();
  if (ext === '.md') return 'Playbooks';
  if (ext === '.pdf') return 'PDF Reports';
  if (ext === '.html') return 'Interactive HTML';
  if (lower.includes('font') || ['.otf', '.ttf', '.woff', '.woff2', '.eot'].includes(ext)) return 'Assets';
  return 'Other';
}

function linkFor(filePath, urls) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return urls.preview(filePath);
  return urls.blob(filePath);
}

function renderHtml(records, generatedAt, repoSlug) {
  const json = JSON.stringify(records).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Internal Strategies Hub</title>
  <style>
    :root {
      --navy: #0e1f4f;
      --blue: #2947a8;
      --bg: #f4f6fb;
      --card: #fff;
      --line: #dfe5f2;
      --text: #1d2638;
      --muted: #62718f;
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 18px; background: var(--bg); font-family: "Akkurat Pro", "Helvetica Neue", Arial, sans-serif; color: var(--text); }
    .wrap { max-width: 1140px; margin: 0 auto; background: var(--card); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
    .hero { padding: 22px; color: #fff; background: linear-gradient(135deg, var(--navy), var(--blue)); }
    .hero h1 { margin: 0 0 6px; font-size: 1.5rem; }
    .hero p { margin: 2px 0; font-size: 0.92rem; opacity: 0.92; }
    .controls { padding: 14px 22px; border-bottom: 1px solid var(--line); display: grid; grid-template-columns: 2fr 1fr; gap: 8px; background: #fafcff; }
    input, select { border: 1px solid var(--line); border-radius: 8px; padding: 9px 10px; font-size: 0.9rem; }
    .list { padding: 14px 22px 20px; }
    .row { border: 1px solid var(--line); border-radius: 10px; padding: 12px; margin-bottom: 10px; background: #fff; display: grid; grid-template-columns: 1.1fr 0.9fr 0.55fr auto; gap: 10px; align-items: center; }
    .file { font-size: 0.92rem; font-weight: 600; }
    .path { font-size: 0.8rem; color: var(--muted); word-break: break-word; }
    .cat { font-size: 0.78rem; padding: 4px 8px; border-radius: 999px; background: #edf2ff; border: 1px solid #cfdbff; color: #26479a; width: fit-content; }
    .open a { color: #20429f; text-decoration: none; font-size: 0.85rem; border: 1px solid #d9e3ff; background: #f3f7ff; padding: 6px 9px; border-radius: 8px; }
    .empty { text-align: center; padding: 18px; color: var(--muted); }
    .footer { border-top: 1px solid var(--line); padding: 10px 22px; color: var(--muted); font-size: 0.8rem; }
    @media (max-width: 900px) {
      .controls { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; }
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <h1>Admireworks Strategies Hub</h1>
      <p>Cross-device directory for strategy playbooks and client strategy files.</p>
      <p>Generated: ${escapeHtml(generatedAt)} | Repo: ${escapeHtml(repoSlug)}</p>
    </div>
    <div class="controls">
      <input id="search" type="search" placeholder="Search by file name or path" />
      <select id="category">
        <option value="">All Categories</option>
      </select>
    </div>
    <div class="list" id="list"></div>
    <div class="empty" id="empty" style="display:none;">No files match the selected filters.</div>
    <div class="footer">Internal use only</div>
  </div>
  <script id="strategy-data" type="application/json">${json}</script>
  <script>
    const rows = JSON.parse(document.getElementById('strategy-data').textContent);
    const listEl = document.getElementById('list');
    const emptyEl = document.getElementById('empty');
    const searchEl = document.getElementById('search');
    const categoryEl = document.getElementById('category');

    function populateCategories() {
      const set = new Set(rows.map((r) => r.category));
      [...set].sort().forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categoryEl.appendChild(opt);
      });
    }

    function render(items) {
      listEl.innerHTML = '';
      if (!items.length) {
        emptyEl.style.display = 'block';
        return;
      }
      emptyEl.style.display = 'none';

      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML =
          '<div><div class="file">' + item.name + '</div><div class="path">' + item.path + '</div></div>' +
          '<div>' + item.group + '</div>' +
          '<div><span class="cat">' + item.category + '</span></div>' +
          '<div class="open"><a href="' + item.url + '" target="_blank" rel="noopener noreferrer">Open</a></div>';
        listEl.appendChild(row);
      });
    }

    function apply() {
      const q = searchEl.value.toLowerCase().trim();
      const cat = categoryEl.value;
      const filtered = rows.filter((r) => {
        if (q && !(r.name + ' ' + r.path).toLowerCase().includes(q)) return false;
        if (cat && r.category !== cat) return false;
        return true;
      });
      render(filtered);
    }

    populateCategories();
    render(rows);
    searchEl.addEventListener('input', apply);
    categoryEl.addEventListener('change', apply);
  </script>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root || process.cwd());
  const repoSlug = String(args['repo-slug'] || process.env.REPO_SLUG || 'fnasr-source/admireworks-internal-os');
  const siteBase = String(args['site-base'] || process.env.SITE_BASE || 'https://ops.admireworks.com');
  const urls = buildUrls(repoSlug, siteBase);

  const strategyRoot = path.join(root, 'Strategies');
  const files = walkFiles(strategyRoot, root)
    .filter((rel) => ['.md', '.pdf', '.html'].includes(path.extname(rel).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const records = files.map((relPath) => {
    const normalized = asPosix(relPath);
    const segments = normalized.split('/');
    const name = path.basename(normalized);
    return {
      name,
      path: normalized,
      group: segments.length > 1 ? segments.slice(0, -1).join('/') : 'root',
      category: classify(normalized),
      url: linkFor(normalized, urls)
    };
  });

  const generatedAt = new Date().toISOString();
  const html = renderHtml(records, generatedAt, repoSlug);
  const output = path.join(root, 'Internal-OS', 'strategies', 'index.html');
  ensureDir(path.dirname(output));
  fs.writeFileSync(output, html, 'utf8');

  console.log(JSON.stringify({
    generated_at: generatedAt,
    repo_slug: repoSlug,
    file_count: records.length,
    output_file: path.relative(root, output)
  }, null, 2));
}

main();
