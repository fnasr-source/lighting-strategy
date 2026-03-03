/**
 * Clean stale data and re-sync fresh from API
 * 
 * Problem: Old "replit" source data has different platform name casing
 * (Meta Ads vs meta_ads) and wrong numbers. Combined rollups sum both
 * sources, creating inflated/wrong totals.
 * 
 * Fix: Delete all old replit-sourced docs for Genco, then delete stale 
 * rollups so next sync rebuilds them fresh from API data only.
 */
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
const GENCO_ID = 'OGBZCwtTuTFIchYXcKO9';

(async () => {
    let deleted = 0;

    // 1. Delete all old replit-sourced monthly platform metrics for Genco
    console.log('🗑️  Deleting old replit-sourced monthlyPlatformMetrics...');
    const oldMetrics = await db.collection('monthlyPlatformMetrics')
        .where('clientId', '==', GENCO_ID).get();
    for (const doc of oldMetrics.docs) {
        const data = doc.data();
        if (data.source === 'replit') {
            await doc.ref.delete();
            deleted++;
            console.log(`  Deleted: ${doc.id} (${data.platform}, ${data.monthEndDate})`);
        }
    }
    console.log(`  Removed ${deleted} replit docs from monthlyPlatformMetrics`);

    // 2. Delete ALL combined rollups for Genco (will be rebuilt on next sync)
    let rollupDeleted = 0;
    console.log('\n🗑️  Deleting all monthlyClientRollups for Genco...');
    const rollups = await db.collection('monthlyClientRollups')
        .where('clientId', '==', GENCO_ID).get();
    for (const doc of rollups.docs) {
        await doc.ref.delete();
        rollupDeleted++;
    }
    console.log(`  Removed ${rollupDeleted} rollup docs`);

    // 3. Also clean any replit-sourced docs from other collections
    let otherDeleted = 0;
    console.log('\n🗑️  Checking dailyPlatformMetrics for replit data...');
    const dailyDocs = await db.collection('dailyPlatformMetrics')
        .where('clientId', '==', GENCO_ID).get();
    for (const doc of dailyDocs.docs) {
        if (doc.data().source === 'replit') {
            await doc.ref.delete();
            otherDeleted++;
        }
    }
    console.log(`  Removed ${otherDeleted} replit daily docs`);

    console.log(`\n✅ Cleanup complete! Total deleted: ${deleted + rollupDeleted + otherDeleted}`);
    console.log('Next: trigger a sync from the dashboard to rebuild fresh data from Meta API.');
})();
