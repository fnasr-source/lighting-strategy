/**
 * Deploy Firestore security rules using the Firebase service account.
 * Uses the Firebase Rules REST API (v1).
 */
import { readFileSync } from 'fs';
import { GoogleAuth } from 'google-auth-library';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyFile = JSON.parse(readFileSync(join(__dirname, 'service-account.json'), 'utf8'));
const rulesSource = readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8');

const auth = new GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
});

const projectId = keyFile.project_id;

async function deploy() {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const headers = {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json',
    };

    // Step 1: Create a new ruleset
    console.log('📋 Creating new Firestore ruleset...');
    const createUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
    const createResp = await fetch(createUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            source: {
                files: [{
                    name: 'firestore.rules',
                    content: rulesSource,
                }],
            },
        }),
    });

    if (!createResp.ok) {
        const err = await createResp.text();
        console.error('❌ Failed to create ruleset:', createResp.status, err);
        process.exit(1);
    }

    const ruleset = await createResp.json();
    const rulesetName = ruleset.name; // e.g. "projects/xxx/rulesets/yyyy"
    console.log(`✅ Ruleset created: ${rulesetName}`);

    // Step 2: Release (deploy) the ruleset to cloud.firestore
    console.log('🚀 Deploying ruleset to cloud.firestore...');
    const releaseName = `projects/${projectId}/releases/cloud.firestore`;

    // Try PATCH first (update existing release), fall back to POST (create)
    let releaseResp = await fetch(
        `https://firebaserules.googleapis.com/v1/${releaseName}`,
        {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                release: {
                    name: releaseName,
                    rulesetName,
                },
            }),
        }
    );

    if (!releaseResp.ok) {
        // Try creating the release instead
        releaseResp = await fetch(
            `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: releaseName,
                    rulesetName,
                }),
            }
        );
    }

    if (!releaseResp.ok) {
        const err = await releaseResp.text();
        console.error('❌ Failed to deploy ruleset:', releaseResp.status, err);
        process.exit(1);
    }

    const release = await releaseResp.json();
    console.log('✅ Firestore rules deployed successfully!');
    console.log(`   Release: ${release.name || releaseName}`);
    console.log(`   Ruleset: ${rulesetName}`);
    console.log(`   Time: ${new Date().toISOString()}`);
}

deploy().catch(err => {
    console.error('❌ Deploy error:', err.message);
    process.exit(1);
});
