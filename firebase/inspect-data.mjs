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
    // Check all monthly platform metrics for Genco
    console.log('=== MONTHLY PLATFORM METRICS (Genco) ===');
    const metrics = await db.collection('monthlyPlatformMetrics')
        .where('clientId', '==', GENCO_ID).get();
    const metricData = metrics.docs.map(d => ({ id: d.id, ...d.data() }));
    metricData.sort((a, b) => (b.monthEndDate || '').localeCompare(a.monthEndDate || ''));
    metricData.forEach(m => {
        console.log(JSON.stringify({
            id: m.id, month: m.monthEndDate, platform: m.platform,
            revenue: Math.round(m.revenue || 0), spend: Math.round(m.spend || 0),
            impressions: m.impressions || 0, clicks: m.clicks || 0,
            orders: m.orders || 0, conversions: m.conversions || 0,
            source: m.source, aggregatedAt: m.aggregatedAt,
        }));
    });

    // Check all monthly rollups for Genco
    console.log('\n=== MONTHLY CLIENT ROLLUPS (Genco) ===');
    const rollups = await db.collection('monthlyClientRollups')
        .where('clientId', '==', GENCO_ID).get();
    const rollupData = rollups.docs.map(d => ({ id: d.id, ...d.data() }));
    rollupData.sort((a, b) => (b.monthEndDate || '').localeCompare(a.monthEndDate || ''));
    rollupData.forEach(r => {
        console.log(JSON.stringify({
            id: r.id, month: r.monthEndDate, type: r.platformType,
            revenue: Math.round(r.revenue || 0), spend: Math.round(r.spend || 0),
            impressions: r.impressions || 0, clicks: r.clicks || 0,
            orders: r.orders || 0, source: r.source,
            aggregatedAt: r.aggregatedAt,
        }));
    });

    // Check daily metrics count
    const daily = await db.collection('dailyPlatformMetrics')
        .where('clientId', '==', GENCO_ID).get();
    console.log(`\n=== DAILY METRICS: ${daily.size} docs ===`);
    if (daily.size > 0) {
        const sorted = daily.docs.map(d => d.data()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        console.log('Latest 5:');
        sorted.slice(0, 5).forEach(d => console.log(JSON.stringify({
            date: d.date, revenue: Math.round(d.revenue || 0), spend: Math.round(d.spend || 0),
            impressions: d.impressions || 0, clicks: d.clicks || 0, orders: d.orders || 0,
        })));
    }
})();
