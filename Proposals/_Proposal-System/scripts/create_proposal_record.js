#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

function randBase36(len) {
  let out = '';
  while (out.length < len) {
    out += Math.floor(Math.random() * 36).toString(36).toUpperCase();
  }
  return out.slice(0, len);
}

function encodeToken(month, day, sequence) {
  const packed = ((month & 0x0f) << 12) | ((day & 0x1f) << 7) | (sequence & 0x7f);
  const obfuscated = packed ^ 0x5A3D;
  return obfuscated.toString(36).toUpperCase().padStart(4, '0');
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    return { header: [], rows: [] };
  }
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return { header: [], rows: [] };
  const lines = raw.split('\n');
  const header = lines[0].split(',');
  const rows = lines.slice(1).filter(Boolean).map((line) => {
    const cols = line.split(',');
    const row = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });
    return row;
  });
  return { header, rows };
}

function writeCsv(filePath, header, rows) {
  const lines = [header.join(',')];
  rows.forEach((row) => {
    lines.push(header.map((h) => String(row[h] || '')).join(','));
  });
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.cpSync(src, dest, { recursive: true });
  } else {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const required = ['root', 'country', 'send-date', 'client', 'source-folder', 'owner', 'contact-email', 'contact-phone'];
  for (const r of required) {
    if (!args[r]) {
      console.error(`Missing required argument: --${r}`);
      process.exit(1);
    }
  }

  const root = path.resolve(args.root);
  const country = String(args.country).toUpperCase();
  const sendDate = String(args['send-date']);
  const client = String(args.client);
  const sourceFolder = String(args['source-folder']);
  const owner = String(args.owner);
  const contactEmail = String(args['contact-email']);
  const contactPhone = String(args['contact-phone']);
  const status = String(args.status || 'DRAFT');
  const recommended = String(args['recommended-option'] || '');
  const publishPresentation = String(args['publish-presentation'] || 'false') === 'true';
  const skipHubBuild = String(args['skip-hub-build'] || 'false') === 'true';
  const repoSlug = String(args['repo-slug'] || process.env.REPO_SLUG || 'fnasr-source/lighting-strategy');

  const [yearStr, monthStr, dayStr] = sendDate.split('-');
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!yearStr || !monthStr || !dayStr || Number.isNaN(month) || Number.isNaN(day)) {
    console.error('Invalid --send-date. Expected YYYY-MM-DD');
    process.exit(1);
  }

  const registryPath = path.join(root, 'Proposals', '_Proposal-System', 'proposal-registry.csv');
  const header = [
    'proposal_number',
    'country_code',
    'send_date',
    'daily_sequence',
    'token',
    'nonce',
    'client_name',
    'client_email',
    'client_phone',
    'source_folder',
    'outgoing_folder',
    'status',
    'owner',
    'recommended_option'
  ];

  const existing = readCsv(registryPath);
  const rows = existing.rows;

  const sameDay = rows.filter(
    (r) => r.country_code === country && r.send_date === sendDate
  );
  const dailySequence = sameDay.length + 1;

  let proposalNumber = '';
  let token = '';
  let nonce = '';

  const existingIds = new Set(rows.map((r) => r.proposal_number));
  for (let i = 0; i < 50; i++) {
    token = encodeToken(month, day, dailySequence);
    nonce = randBase36(3);
    proposalNumber = `AWP-${country}-${token}-${nonce}`;
    if (!existingIds.has(proposalNumber)) break;
  }

  const outgoingFolder = `Proposals/_Outgoing/${proposalNumber}`;
  const outgoingAbs = path.join(root, outgoingFolder);
  ensureDir(outgoingAbs);

  const sourceAbs = path.join(root, sourceFolder);

  const onePagerSrc = path.join(sourceAbs, '10-One-Page-Proposal.html');
  const fallbackOnePagerSrc = path.join(sourceAbs, 'proposal.html');
  if (fs.existsSync(onePagerSrc)) {
    copyIfExists(onePagerSrc, path.join(outgoingAbs, 'one-page.html'));
  } else {
    copyIfExists(fallbackOnePagerSrc, path.join(outgoingAbs, 'one-page.html'));
  }

  const presentationSrc = path.join(sourceAbs, '11-Final-Presentation.html');
  const fallbackPresentationSrc = path.join(sourceAbs, 'Master_Presentation.html');
  if (publishPresentation) {
    if (fs.existsSync(presentationSrc)) {
      copyIfExists(presentationSrc, path.join(outgoingAbs, 'presentation.html'));
    } else if (fs.existsSync(fallbackPresentationSrc)) {
      copyIfExists(fallbackPresentationSrc, path.join(outgoingAbs, 'presentation.html'));
    }
    copyIfExists(path.join(sourceAbs, 'styles.css'), path.join(outgoingAbs, 'styles.css'));
    copyIfExists(path.join(sourceAbs, 'app.js'), path.join(outgoingAbs, 'app.js'));
    copyIfExists(path.join(sourceAbs, 'assets'), path.join(outgoingAbs, 'assets'));
  }

  rows.push({
    proposal_number: proposalNumber,
    country_code: country,
    send_date: sendDate,
    daily_sequence: String(dailySequence),
    token,
    nonce,
    client_name: client,
    client_email: contactEmail,
    client_phone: contactPhone,
    source_folder: sourceFolder,
    outgoing_folder: outgoingFolder,
    status,
    owner,
    recommended_option: recommended
  });

  writeCsv(registryPath, header, rows);

  if (!skipHubBuild) {
    const scripts = [
      path.join(root, 'Proposals', '_Proposal-System', 'scripts', 'build_proposals_hub.js'),
      path.join(root, 'Proposals', '_Proposal-System', 'scripts', 'build_strategies_hub.js'),
      path.join(root, 'Proposals', '_Proposal-System', 'scripts', 'build_internal_home.js')
    ];

    scripts.forEach((scriptPath) => {
      if (!fs.existsSync(scriptPath)) return;
      const run = childProcess.spawnSync(
        'node',
        [scriptPath, '--root', root, '--repo-slug', repoSlug],
        { stdio: 'inherit' }
      );
      if (run.status !== 0) {
        console.error(`Failed while running ${scriptPath}`);
        process.exit(run.status || 1);
      }
    });
  }

  const result = {
    proposal_number: proposalNumber,
    outgoing_folder: outgoingFolder,
    one_page_path: `${outgoingFolder}/one-page.html`,
    presentation_path: publishPresentation ? `${outgoingFolder}/presentation.html` : '',
    send_date: sendDate,
    daily_sequence: dailySequence,
    client_email: contactEmail,
    client_phone: contactPhone,
    hub_build_skipped: skipHubBuild,
    repo_slug: repoSlug
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
