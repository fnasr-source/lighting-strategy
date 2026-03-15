import { existsSync, readFileSync } from 'fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    index += 1;
  }

  return args;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function initAdmin() {
  if (getApps().length > 0) return;

  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    join(__dirname, 'service-account.json'),
    join(resolve(__dirname, '..'), 'service-account.json'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const raw = readFileSync(resolve(candidate), 'utf8');
      const serviceAccount = JSON.parse(raw);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      return;
    } catch {
      // Continue through candidates.
    }
  }

  throw new Error('No Firebase service account file found for publish-client-artifact.');
}

function loadManifest(manifestPath) {
  if (!manifestPath) return {};
  const absolutePath = resolve(manifestPath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Manifest not found: ${absolutePath}`);
  }
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

function toArtifactId(clientId, artifactType, slug) {
  return `${slugify(clientId)}__${slugify(artifactType)}__${slugify(slug)}`;
}

function buildPayload(args, manifest) {
  const merged = { ...manifest, ...args };
  const clientId = merged['client-id'] || merged.clientId;
  const clientName = merged['client-name'] || merged.clientName;
  const artifactType = merged['type'] || merged.artifactType;
  const title = merged.title;
  const slug = merged.slug || slugify(title);
  const status = merged.status || 'published';
  const visibility = merged.visibility || 'client';
  const version = merged.version || 'v1';
  const publishedBy = merged['published-by'] || merged.publishedBy || process.env.USER || 'publish-script';

  if (!clientId || !clientName || !artifactType || !title) {
    throw new Error('Missing required values. Required: clientId, clientName, artifactType/type, title.');
  }

  return {
    artifactId: merged['artifact-id'] || merged.artifactId || toArtifactId(clientId, artifactType, slug),
    clientId,
    clientName,
    artifactType,
    title,
    slug,
    status,
    visibility,
    sourcePath: merged['source-path'] || merged.sourcePath || null,
    summary: merged.summary || null,
    locale: merged.locale || null,
    version,
    storageUrl: merged['storage-url'] || merged.storageUrl || null,
    opsUrl: merged['ops-url'] || merged.opsUrl || null,
    tags: Array.isArray(merged.tags) ? merged.tags : [],
    publishedBy,
    publishedAt: merged['published-at'] || merged.publishedAt || new Date().toISOString(),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = loadManifest(args.manifest);
  const payload = buildPayload(args, manifest);

  initAdmin();
  const db = getFirestore();
  const artifactRef = db.collection('clientArtifacts').doc(payload.artifactId);
  const snapshot = await artifactRef.get();

  const writeData = {
    clientId: payload.clientId,
    clientName: payload.clientName,
    artifactType: payload.artifactType,
    title: payload.title,
    slug: payload.slug,
    status: payload.status,
    visibility: payload.visibility,
    sourcePath: payload.sourcePath,
    summary: payload.summary,
    locale: payload.locale,
    version: payload.version,
    storageUrl: payload.storageUrl,
    opsUrl: payload.opsUrl,
    tags: payload.tags,
    publishedBy: payload.publishedBy,
    publishedAt: payload.publishedAt,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!snapshot.exists) {
    writeData.createdAt = FieldValue.serverTimestamp();
  }

  await artifactRef.set(writeData, { merge: true });
  await db.collection('clientArtifactVersions').add({
    artifactId: payload.artifactId,
    clientId: payload.clientId,
    clientName: payload.clientName,
    artifactType: payload.artifactType,
    visibility: payload.visibility,
    version: payload.version,
    summary: payload.summary,
    publishedBy: payload.publishedBy,
    snapshot: writeData,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`Published artifact ${payload.artifactId}`);
  console.log(`Client: ${payload.clientName} (${payload.clientId})`);
  console.log(`Type: ${payload.artifactType}`);
  if (payload.opsUrl) console.log(`Ops URL: ${payload.opsUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});



