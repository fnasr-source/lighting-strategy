import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
if (!getApps().length) {
    const sa = JSON.parse(readFileSync(join(__dirname, 'service-account.json'), 'utf8'));
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

(async () => {
    const conns = await db.collection('platformConnections').get();
    conns.docs.forEach(d => {
        const data = d.data();
        console.log('--- Doc:', d.id, '---');
        console.log('Fields:', Object.keys(data).join(', '));
        // Show all fields but mask credential values
        for (const [k, v] of Object.entries(data)) {
            if (typeof v === 'string' && v.length > 50) {
                console.log(`  ${k}: "${v.slice(0, 30)}..." (${v.length} chars)`);
            } else if (v && typeof v === 'object' && v.toDate) {
                console.log(`  ${k}: ${v.toDate().toISOString()}`);
            } else {
                console.log(`  ${k}:`, v);
            }
        }
    });
})();
