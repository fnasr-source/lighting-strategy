/**
 * Register a Firebase Web App and get its config (API key, App ID)
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = 'admireworks---internal-os';
const SA_PATH = join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
});

async function registerWebApp() {
    console.log('Registering Firebase Web App...');

    const { google } = await import('googleapis');
    const auth = new google.auth.GoogleAuth({
        keyFile: SA_PATH,
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    // List existing web apps
    const listRes = await fetch(
        `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`,
        { headers: { Authorization: `Bearer ${token.token}` } }
    );

    if (listRes.ok) {
        const data = await listRes.json();
        if (data.apps && data.apps.length > 0) {
            console.log(`Found existing web app: ${data.apps[0].displayName}`);
            // Get config
            const configRes = await fetch(
                `https://firebase.googleapis.com/v1beta1/${data.apps[0].name}/config`,
                { headers: { Authorization: `Bearer ${token.token}` } }
            );
            if (configRes.ok) {
                const config = await configRes.json();
                console.log('\nFirebase Web App Config:');
                console.log(JSON.stringify(config, null, 2));
                return;
            }
        }
    }

    // Create new web app
    const createRes = await fetch(
        `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                displayName: 'Client Portal',
            }),
        }
    );

    if (!createRes.ok) {
        const err = await createRes.json();
        console.error('Failed to create web app:', err);
        return;
    }

    // Poll operation
    const op = await createRes.json();
    console.log('Waiting for web app creation...');

    await new Promise(r => setTimeout(r, 3000));

    // Get operation result
    const opRes = await fetch(
        `https://firebase.googleapis.com/v1beta1/${op.name}`,
        { headers: { Authorization: `Bearer ${token.token}` } }
    );

    let appName;
    if (opRes.ok) {
        const opResult = await opRes.json();
        if (opResult.done) {
            appName = opResult.response?.name;
            console.log(`Web app created: ${opResult.response?.displayName}`);
        }
    }

    if (!appName) {
        // Try listing again
        const listRes2 = await fetch(
            `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`,
            { headers: { Authorization: `Bearer ${token.token}` } }
        );
        const data2 = await listRes2.json();
        appName = data2.apps?.[0]?.name;
    }

    if (appName) {
        const configRes = await fetch(
            `https://firebase.googleapis.com/v1beta1/${appName}/config`,
            { headers: { Authorization: `Bearer ${token.token}` } }
        );
        if (configRes.ok) {
            const config = await configRes.json();
            console.log('\nFirebase Web App Config:');
            console.log(JSON.stringify(config, null, 2));
        }
    }
}

registerWebApp().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
