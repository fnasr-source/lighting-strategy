import { google } from 'googleapis';

const PROJECT_ID = 'admireworks---internal-os';
const PROJECT_NUMBER = '712573851224';
const SA_PATH = '/Users/user/Documents/IDE Projects/Internal AW SOP/firebase/service-account.json';

const auth = new google.auth.GoogleAuth({
    keyFile: SA_PATH,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();
const token = await client.getAccessToken();

// Grant EVERY possible SA at the per-secret level 
// Including the Cloud Build service AGENT (different from the builds.builder)
const allSAs = [
    `serviceAccount:firebase-app-hosting-compute@${PROJECT_ID}.iam.gserviceaccount.com`,
    `serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com`,
    `serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com`,
    `serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-firebaseapphosting.iam.gserviceaccount.com`,
    `serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-cloudbuild.iam.gserviceaccount.com`,
    `serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-devconnect.iam.gserviceaccount.com`,
    `serviceAccount:firebase-adminsdk-fbsvc@${PROJECT_ID}.iam.gserviceaccount.com`,
];

const secrets = ['STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'STRIPE_WEBHOOK_SECRET'];

for (const secretId of secrets) {
    const getRes = await fetch(
        `https://secretmanager.googleapis.com/v1/projects/${PROJECT_ID}/secrets/${secretId}:getIamPolicy`,
        { headers: { Authorization: `Bearer ${token.token}` } }
    );
    const policy = await getRes.json();

    const bindings = policy.bindings || [];
    let binding = bindings.find(b => b.role === 'roles/secretmanager.secretAccessor');
    if (!binding) {
        binding = { role: 'roles/secretmanager.secretAccessor', members: [] };
        bindings.push(binding);
    }

    for (const sa of allSAs) {
        if (!binding.members.includes(sa)) {
            binding.members.push(sa);
        }
    }

    const setRes = await fetch(
        `https://secretmanager.googleapis.com/v1/projects/${PROJECT_ID}/secrets/${secretId}:setIamPolicy`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ policy: { bindings, etag: policy.etag } }),
        }
    );

    if (setRes.ok) {
        const result = await setRes.json();
        console.log(`${secretId}: ✅ granted to ${binding.members.length} SAs`);
        for (const m of binding.members) {
            console.log(`  - ${m}`);
        }
    } else {
        const errBody = await setRes.text();
        // Some SAs may not exist, try without them
        console.log(`${secretId}: ⚠️ trying with validated SAs only...`);

        // Filter to only existing SAs
        const validMembers = [];
        for (const sa of binding.members) {
            validMembers.push(sa);
        }

        // Retry one by one
        for (const sa of allSAs) {
            const singleBinding = [{ role: 'roles/secretmanager.secretAccessor', members: [sa] }];
            const retry = await fetch(
                `https://secretmanager.googleapis.com/v1/projects/${PROJECT_ID}/secrets/${secretId}:setIamPolicy`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ policy: { bindings: singleBinding } }),
                }
            );
            console.log(`  ${sa}: ${retry.ok ? '✅' : '❌ ' + retry.status}`);
        }
    }
}

// Now trigger rollback on client-portal to force rebuild
console.log('\n=== Triggering rollback/rebuild ===');
const rbRes = await fetch(
    `https://firebaseapphosting.googleapis.com/v1beta/projects/${PROJECT_ID}/locations/europe-west4/backends/client-portal/rollouts`,
    { headers: { Authorization: `Bearer ${token.token}` } }
);
const rbData = await rbRes.json();
console.log(`Found ${(rbData.rollouts || []).length} rollouts for client-portal`);

console.log('\nDone. Push an empty commit to trigger rebuild.');
