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

function exists(root, relPath) {
  if (!relPath) return false;
  return fs.existsSync(path.join(root, relPath));
}

function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root || process.cwd());

  const requiredFiles = [
    'Internal-OS/index.html',
    'Internal-OS/proposals/index.html',
    'Internal-OS/strategies/index.html',
    'Internal-OS/system/INDEX.md',
    'Internal-OS/system/link-map.json',
    'Proposals/_Outgoing/_internal-crm/index.html',
    'Proposals/_Proposal-System/proposal-registry.csv',
    'Proposals/_Proposal-System/proposal-crm.csv',
    'Proposals/_Proposal-System/legacy-proposals.json'
  ];

  const missing = requiredFiles.filter((f) => !exists(root, f));

  const linkMapPath = path.join(root, 'Internal-OS', 'system', 'link-map.json');
  const invalidUrls = [];
  if (fs.existsSync(linkMapPath)) {
    const map = JSON.parse(fs.readFileSync(linkMapPath, 'utf8'));
    const links = map.links || {};
    Object.entries(links).forEach(([key, value]) => {
      if (!String(value || '').startsWith('https://')) {
        invalidUrls.push({ key, value });
      }
    });
  }

  const registry = parseCsvSimple(path.join(root, 'Proposals', '_Proposal-System', 'proposal-registry.csv'));
  const missingRegistryArtifacts = [];
  registry.forEach((row) => {
    const onePage = `${row.outgoing_folder}/one-page.html`;
    if (!exists(root, onePage)) {
      missingRegistryArtifacts.push({ proposal_number: row.proposal_number, missing: onePage });
    }
  });

  const legacyPath = path.join(root, 'Proposals', '_Proposal-System', 'legacy-proposals.json');
  const missingLegacyArtifacts = [];
  if (fs.existsSync(legacyPath)) {
    const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    legacy.forEach((item) => {
      const links = item.links || {};
      Object.values(links).forEach((rel) => {
        if (rel && !exists(root, rel)) {
          missingLegacyArtifacts.push({ record_id: item.record_id, missing: rel });
        }
      });
    });
  }

  const report = {
    missing_required_files: missing,
    invalid_urls: invalidUrls,
    missing_registry_artifacts: missingRegistryArtifacts,
    missing_legacy_artifacts: missingLegacyArtifacts
  };

  const hasErrors =
    missing.length > 0 ||
    invalidUrls.length > 0 ||
    missingRegistryArtifacts.length > 0 ||
    missingLegacyArtifacts.length > 0;

  console.log(JSON.stringify(report, null, 2));

  if (hasErrors) {
    process.exit(1);
  }
}

main();
