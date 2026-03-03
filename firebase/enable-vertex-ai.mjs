/**
 * Enable Vertex AI API for the project using service account credentials.
 */
import { readFileSync } from 'fs';
import { GoogleAuth } from 'google-auth-library';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const keyFile = JSON.parse(readFileSync(join(__dirname, 'service-account.json'), 'utf8'));
const auth = new GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();
const token = await client.getAccessToken();

const projectId = keyFile.project_id;
const url = `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/aiplatform.googleapis.com:enable`;

console.log(`Enabling Vertex AI API for project: ${projectId}...`);
const resp = await fetch(url, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json',
    },
});
const json = await resp.json();
console.log('Response:', JSON.stringify(json, null, 2));
if (resp.ok) {
    console.log('✅ Vertex AI API enabled successfully!');
} else {
    console.log('❌ Failed:', resp.status, resp.statusText);
}
