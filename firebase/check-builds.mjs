import { google } from 'googleapis';

const PROJECT_ID = 'admireworks---internal-os';
const LOCATION = 'europe-west4';
const SA_PATH = '/Users/user/Documents/IDE Projects/Internal AW SOP/firebase/service-account.json';

const auth = new google.auth.GoogleAuth({
    keyFile: SA_PATH,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();
const token = await client.getAccessToken();

async function getBuilds(backend) {
    const res = await fetch(
        `https://firebaseapphosting.googleapis.com/v1beta/projects/${PROJECT_ID}/locations/${LOCATION}/backends/${backend}/rollouts?pageSize=3`,
        { headers: { Authorization: `Bearer ${token.token}` } }
    );
    const data = await res.json();

    console.log(`\n${'='.repeat(50)}`);
    console.log(`BACKEND: ${backend}`);
    console.log(`${'='.repeat(50)}`);

    for (const r of (data.rollouts || []).slice(0, 3)) {
        const buildName = r.build;
        const buildId = buildName.split('/').pop();

        const bRes = await fetch(
            `https://firebaseapphosting.googleapis.com/v1beta/${buildName}`,
            { headers: { Authorization: `Bearer ${token.token}` } }
        );
        const build = await bRes.json();

        console.log(`\n${buildId} | ${build.state} | ${build.source?.codebase?.displayName?.substring(0, 8)}`);
        if (build.error) console.log(`  ERROR: ${build.error.message}`);
        if (build.buildLogsUri) console.log(`  Logs: ${build.buildLogsUri}`);
    }
}

await getBuilds('client-portal');
await getBuilds('internal-ops');
