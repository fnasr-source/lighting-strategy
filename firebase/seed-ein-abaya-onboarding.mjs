import admin from 'firebase-admin';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(__dirname, 'service-account.json');
const PAYLOAD_PATH = join(PROJECT_ROOT, 'Proposals/Ein-Abaya/briefing/prefill-payload.json');
const BASE_URL = process.env.ONBOARDING_BASE_URL || 'https://my.admireworks.com';
const SHOULD_OVERWRITE = process.argv.includes('--overwrite');
const SHOULD_ROTATE_KEY = process.argv.includes('--rotate-key');

const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
const payload = JSON.parse(readFileSync(PAYLOAD_PATH, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
    });
}

const db = admin.firestore();

function generateAccessKey() {
    return `ein-abaya-${randomBytes(8).toString('hex')}`;
}

async function seed() {
    const docId = payload.slug;
    const ref = db.collection('clientOnboardingForms').doc(docId);
    const existing = await ref.get();

    let accessKey = generateAccessKey();
    let status = payload.status || 'draft';
    let responses = payload.responses;
    let fieldStates = payload.fieldStates;
    let submissionCount = 0;
    let submittedAt = null;
    let lastSavedAt = null;
    let lastNotifiedAt = null;

    if (existing.exists) {
        const current = existing.data() || {};
        if (!SHOULD_ROTATE_KEY && current.accessKey) accessKey = current.accessKey;
        if (!SHOULD_OVERWRITE) {
            responses = current.responses || responses;
            fieldStates = current.fieldStates || fieldStates;
            status = current.status || status;
            submissionCount = current.submissionCount || 0;
            submittedAt = current.submittedAt || null;
            lastSavedAt = current.lastSavedAt || null;
            lastNotifiedAt = current.lastNotifiedAt || null;
        }
    }

    const data = {
        clientId: payload.clientId,
        clientName: payload.clientName,
        slug: payload.slug,
        accessKey,
        language: payload.language,
        platform: payload.platform,
        status,
        notificationEmails: payload.notificationEmails || [],
        responses,
        fieldStates,
        submissionCount,
        submittedAt,
        lastSavedAt,
        lastNotifiedAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
    };

    await ref.set(data, { merge: true });

    console.log('');
    console.log('Ein Abaya onboarding form seeded successfully.');
    console.log(`Document ID: ${docId}`);
    console.log(`Access URL: ${BASE_URL}/onboarding/${accessKey}`);
    console.log(`Overwrite mode: ${SHOULD_OVERWRITE ? 'yes' : 'no'}`);
    console.log(`Rotated key: ${SHOULD_ROTATE_KEY ? 'yes' : 'no'}`);
    console.log('');
}

seed().catch((err) => {
    console.error('Failed to seed Ein Abaya onboarding form:', err);
    process.exit(1);
});
