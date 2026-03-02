import { google } from 'googleapis';
import { readFileSync } from 'fs';

const SA_PATH = '/Users/user/Documents/IDE Projects/Internal AW SOP/firebase/service-account.json';
const PROJECT_ID = 'admireworks---internal-os';
const PROJECT_NUMBER = '712573851224';

const authGoog = new google.auth.GoogleAuth({
    keyFile: SA_PATH,
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
});
const client = await authGoog.getClient();
const token = await client.getAccessToken();

// Step 1: Enable the Google Cloud APIs we need
console.log('=== Enabling required APIs ===');
const apisToEnable = [
    'identitytoolkit.googleapis.com',
];
for (const api of apisToEnable) {
    const res = await fetch(
        `https://serviceusage.googleapis.com/v1/projects/${PROJECT_NUMBER}/services/${api}:enable`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
        }
    );
    console.log(`${api}: ${res.ok ? '✅' : res.status}`);
}

// Step 2: Get the auto-generated Web Client ID from the GCP project
console.log('\n=== Finding OAuth2 Web Client ID ===');

// Firebase projects auto-generate OAuth2 clients. We need to find the web type.
const oauthRes = await fetch(
    `https://oauth2.clients6.google.com/v1/projects/${PROJECT_NUMBER}/oauthClients?pageSize=50`,
    { headers: { Authorization: `Bearer ${token.token}` } }
);
console.log('OAuth clients API:', oauthRes.status);

// Try the GCP Cloud Console API for OAuth2 credentials
const credRes = await fetch(
    `https://www.googleapis.com/oauth2/v1/projects/${PROJECT_NUMBER}/oauthClients`,
    { headers: { Authorization: `Bearer ${token.token}` } }
);
console.log('OAuth2 v1:', credRes.status);

// Try looking up Firebase web app configs which should contain the OAuth info
const webAppsRes = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`,
    { headers: { Authorization: `Bearer ${token.token}` } }
);
const webApps = await webAppsRes.json();
console.log('\nWeb Apps:', JSON.stringify(webApps, null, 2));

// Get the config for the first web app (should have authDomain)
if (webApps.apps) {
    for (const app of webApps.apps) {
        const cfgRes = await fetch(
            `https://firebase.googleapis.com/v1beta1/${app.name}/config`,
            { headers: { Authorization: `Bearer ${token.token}` } }
        );
        const cfg = await cfgRes.json();
        console.log(`\nConfig for ${app.displayName}: authDomain=${cfg.authDomain}, apiKey=${cfg.apiKey}`);
    }
}

// Step 3: Try to create Google IdP config with auto-generated client
// Firebase generates a Web Client ID at: projectId.firebaseapp.com
// The format is typically: PROJECT_NUMBER-xxx.apps.googleusercontent.com
// But we need to enable it via the Console or CLI first

// Let's try to get the existing IdP configs
const idpListRes = await fetch(
    `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs`,
    { headers: { Authorization: `Bearer ${token.token}` } }
);
const idpList = await idpListRes.json();
console.log('\nExisting IDP configs:', JSON.stringify(idpList, null, 2));

process.exit(0);
