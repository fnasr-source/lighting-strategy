import { google } from 'googleapis';
import { readFileSync } from 'fs';

const SA_PATH = '/Users/user/Documents/IDE Projects/Internal AW SOP/firebase/service-account.json';
const PROJECT_ID = 'admireworks---internal-os';

const authGoog = new google.auth.GoogleAuth({
    keyFile: SA_PATH,
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
});
const client = await authGoog.getClient();
const token = await client.getAccessToken();

console.log('=== Adding Authorized Domains ===\n');

// 1. Get current config
const getRes = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`,
    { headers: { Authorization: `Bearer ${token.token}` } }
);
const config = await getRes.json();
const currentDomains = config.authorizedDomains || [];
console.log('Current domains:', currentDomains);

// 2. Add required domains
const requiredDomains = [
    'localhost',
    'my.admireworks.com',
    'admin.admireworks.com',
    'admireworks---internal-os.firebaseapp.com',
    'admireworks---internal-os.web.app'
];

const newDomains = [...new Set([...currentDomains, ...requiredDomains])];

// 3. Update config
const updateRes = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=authorizedDomains`,
    {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizedDomains: newDomains }),
    }
);

if (updateRes.ok) {
    const updated = await updateRes.json();
    console.log('✅ Updated domains:', updated.authorizedDomains);
} else {
    console.log('❌ Error updating domains:', updateRes.status, await updateRes.text());
}
