import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const clientsDir = join(rootDir, 'clients');

const WORKSPACE_DIRECTORIES = [
  ['active_state', 'Decision log, blockers, current next steps'],
  ['briefing', 'Kickoff forms, briefs, gap analyses'],
  ['communications', 'Client-safe message packs and delivery notes'],
  ['handoff', 'Execution-safe exports for client build repos'],
  ['invoices', 'Static invoice assets if they are needed'],
  ['kb', 'Canonical raw context, transcripts, links, reference material'],
  ['meetings', 'Meeting recordings and transcripts'],
  ['meetings/recordings', 'Source meeting recordings'],
  ['meetings/transcripts', 'Meeting transcripts'],
  ['messaging', 'Ad copy, email flows, WhatsApp logic, campaign scripts'],
  ['presentations', 'Presentation source and published deck metadata'],
  ['proposal', 'Proposal documents and assets'],
  ['research', 'Validated market and competitor research outputs'],
  ['strategy', 'Written strategy deliverables and supporting docs'],
];

function titleFromFolder(folderName) {
  if (folderName === '_templates') return '{Client Name}';
  return folderName.replace(/-/g, ' ');
}

function slugFromFolder(folderName) {
  if (folderName === '_templates') return '{client-slug}';
  return folderName.toLowerCase();
}

function ensureDirectory(targetDir) {
  mkdirSync(targetDir, { recursive: true });
  const hasFiles = readdirSync(targetDir).length > 0;
  if (!hasFiles) {
    writeFileSync(join(targetDir, '.gitkeep'), '');
  }
}

function buildWorkspaceDoc(folderName) {
  const clientName = titleFromFolder(folderName);
  const clientSlug = slugFromFolder(folderName);

  return `# Client Workspace: ${clientName}

This folder is the canonical internal workspace for ${clientName}.

## Operating Rules
- Keep research, strategy, messaging, and presentation work in this internal workspace.
- Publish only approved, client-safe snapshots into \`my.admireworks.com\`.
- Publish branded static decks from this workspace to \`ops.admireworks.com\`.
- Export only execution-safe materials from \`handoff/\` into client build repos.
- Do not duplicate the full KB, transcripts, or internal frameworks into delivery repos.

## Canonical Folders
| Folder | Use |
|---|---|
| \`kb/\` | Raw context, references, internal notes that should not leave the internal OS |
| \`research/\` | Validated research, competitor scans, market findings |
| \`strategy/\` | Written strategy deliverables |
| \`messaging/\` | Ad copy, email flows, WhatsApp flows, approved messaging work |
| \`presentations/\` | Presentation source, deck metadata, ops publishing details |
| \`communications/\` | Client-safe summaries, response packs, or delivery notes |
| \`handoff/\` | Execution-ready exports for app/landing-page repos |
| \`active_state/\` | Current blockers, decisions, and next actions |

## Publish Paths
- Portal artifact source path example: \`clients/${clientSlug}/strategy/\`
- Ops presentation path example: \`https://ops.admireworks.com/presentations/${clientSlug}/\`

## Notes
- \`my.admireworks.com\` is the client workspace.
- \`ops.admireworks.com\` is the branded static publishing layer.
- Client build repos are execution-only.
`;
}

function buildClientIndex(folderName) {
  const clientName = titleFromFolder(folderName);
  return `# Client Index: ${clientName}

## Status
- **Stage:** Research | Proposal | Active | Ongoing
- **Portal Client ID:** _(Firestore doc ID once created)_
- **Portal Status:** lead | prospect | proposal_sent | active | churned
- **Region:** EG | SA | AE | US
- **Currency:** EGP | SAR | AED | USD
- **Date Created:** YYYY-MM-DD

## Contacts
| Name | Role | Email | Phone |
|---|---|---|---|
| | | | |

## Key Links
- **Portal:** \`https://my.admireworks.com/dashboard/clients/{clientId}\`
- **Ops Presentation:** \`https://ops.admireworks.com/presentations/{client-slug}/\`

## Assigned Team
- **Account Owner:** Fouad Nasseredin
- **Team Member(s):** _

## Scope of Work
_Brief description of what Admireworks is doing for this client._

## Notes
_Any additional context, history, or important decisions._
`;
}

function scaffoldWorkspace(folderName) {
  const workspaceDir = join(clientsDir, folderName);
  mkdirSync(workspaceDir, { recursive: true });

  for (const [relativeDir] of WORKSPACE_DIRECTORIES) {
    ensureDirectory(join(workspaceDir, relativeDir));
  }

  const workspaceDocPath = join(workspaceDir, 'CLIENT_WORKSPACE.md');
  writeFileSync(workspaceDocPath, buildWorkspaceDoc(folderName));

  const clientIndexPath = join(workspaceDir, '00-Client-Index.md');
  if (!existsSync(clientIndexPath)) {
    if (folderName === '_templates') {
      const templatePath = join(clientsDir, '_templates', '00-Client-Index.md');
      if (existsSync(templatePath)) {
        writeFileSync(clientIndexPath, readFileSync(templatePath, 'utf8'));
      } else {
        writeFileSync(clientIndexPath, buildClientIndex(folderName));
      }
    } else {
      writeFileSync(clientIndexPath, buildClientIndex(folderName));
    }
  }
}

const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error('Usage: node scripts/scaffold-client-workspace.mjs <client-folder> [more-folders...]');
  process.exit(1);
}

for (const target of targets) {
  scaffoldWorkspace(target);
  console.log(`Scaffolded internal workspace: clients/${target}`);
}
