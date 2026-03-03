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
    // Get all clients
    const snap = await db.collection('clients').get();
    console.log('=== CLIENTS ===');
    snap.docs.forEach(d => {
        const data = d.data();
        console.log(JSON.stringify({
            id: d.id, name: data.name, status: data.status,
            region: data.region, currency: data.baseCurrency,
            notes: data.notes?.slice(0, 100)
        }));
    });

    // Get platform connections
    const conns = await db.collection('platformConnections').get();
    console.log('\n=== CONNECTIONS ===');
    conns.docs.forEach(d => {
        const data = d.data();
        console.log(JSON.stringify({
            clientId: data.clientId, platform: data.platform,
            isConnected: data.isConnected, syncStatus: data.syncStatus,
            lastError: data.lastError?.slice(0, 120)
        }));
    });

    // Get metric months coverage
    const metrics = await db.collection('monthlyPlatformMetrics').get();
    console.log('\n=== METRICS SUMMARY ===');
    const byClient = {};
    metrics.docs.forEach(d => {
        const data = d.data();
        if (!byClient[data.clientId]) byClient[data.clientId] = { platforms: new Set(), months: new Set(), totalRevenue: 0 };
        byClient[data.clientId].platforms.add(data.platform);
        byClient[data.clientId].months.add(data.monthEndDate);
        byClient[data.clientId].totalRevenue += data.revenue || 0;
    });
    Object.entries(byClient).forEach(([cid, info]) => {
        console.log(JSON.stringify({
            clientId: cid,
            platforms: [...info.platforms],
            monthsCovered: info.months.size,
            totalRevenue: Math.round(info.totalRevenue),
        }));
    });
})();
