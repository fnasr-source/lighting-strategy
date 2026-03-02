/**
 * Fix Admin User + Run Full Data Migration
 *
 * 1. Finds fnasr@admireworks.com in Firebase Auth
 * 2. Sets their Firestore UserProfile to 'owner' with full permissions
 * 3. Migrates all Replit data (clients, connections, metrics, rollups)
 *
 * Usage: node firebase/fix-admin-and-migrate.mjs
 */
import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!getApps().length) {
    const sa = JSON.parse(readFileSync(join(__dirname, 'service-account.json'), 'utf8'));
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();
const auth = getAuth();

// ── All owner permissions ──
const OWNER_PERMISSIONS = [
    'clients:read', 'clients:write', 'invoices:read', 'invoices:write',
    'payments:read', 'payments:write', 'leads:read', 'leads:write',
    'proposals:read', 'proposals:write', 'reports:read', 'reports:write',
    'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
    'settings:read', 'settings:write', 'team:read', 'team:write',
    'billing:read', 'billing:write',
];

async function fixAdmin() {
    console.log('═══════════════════════════════════════════');
    console.log('  STEP 1: Fix Admin User Profile');
    console.log('═══════════════════════════════════════════\n');

    const email = 'fnasr@admireworks.com';

    try {
        // Find user in Firebase Auth
        const userRecord = await auth.getUserByEmail(email);
        console.log(`✅ Found Firebase Auth user: ${userRecord.uid}`);
        console.log(`   Email: ${userRecord.email}`);
        console.log(`   Name: ${userRecord.displayName || '(not set)'}\n`);

        // Check existing profile
        const profileRef = db.collection('userProfiles').doc(userRecord.uid);
        const existingProfile = await profileRef.get();

        if (existingProfile.exists) {
            const data = existingProfile.data();
            console.log(`   Existing role: ${data.role}`);
            console.log(`   Existing permissions: ${(data.permissions || []).length}`);
        }

        // Set profile to owner with full permissions
        await profileRef.set({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName || 'Fareed Nasr',
            role: 'owner',
            permissions: OWNER_PERMISSIONS,
            isActive: true,
            lastLoginAt: new Date().toISOString(),
            updatedAt: FieldValue.serverTimestamp(),
            ...(existingProfile.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        }, { merge: true });

        console.log(`\n✅ Profile updated to OWNER with ${OWNER_PERMISSIONS.length} permissions`);

        // Set custom claims for future login
        await auth.setCustomUserClaims(userRecord.uid, { role: 'owner' });
        console.log(`✅ Firebase Auth custom claims set: { role: 'owner' }`);

    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            console.log(`⚠️  User ${email} not found in Firebase Auth.`);
            console.log(`   They need to sign in first, then re-run this script.`);

            // List all users to help debug
            const listResult = await auth.listUsers(10);
            console.log('\n   Existing users:');
            listResult.users.forEach(u => {
                console.log(`   - ${u.email || u.uid} (${u.displayName || 'no name'})`);
            });
        } else {
            throw err;
        }
    }
}

// ── DATA MIGRATION ──────────────────────────────────

const CLIENTS = [
    { legacyId: 'd62f5b38-f080-4dbc-a56d-a3eb5499fcfc', name: 'Genco', baseCurrency: 'EGP', region: 'EG' },
    { legacyId: '5a2f20f7-1d2a-42e9-b65a-9521ff8dd8a6', name: 'Jasmin Store', baseCurrency: 'EGP', region: 'EG' },
    { legacyId: 'fdc892a7-d308-47b8-976a-6dc9f1eac27e', name: 'Pose', baseCurrency: 'EGP', region: 'EG' },
    { legacyId: '2f3110f0-87be-4416-8797-32bd0d755596', name: 'Sultan Saray', baseCurrency: 'EGP', region: 'EG' },
];

const clientMap = {};

const PLATFORM_CONNECTIONS = [
    { client: 'Genco', platform: 'meta_ads', credentials: { adAccountId: '565810425828068', accessToken: 'EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD' } },
    { client: 'Genco', platform: 'shopify', credentials: { shopUrl: '46c213.myshopify.com', accessToken: process.env.SHOPIFY_ACCESS_TOKEN || 'set-via-env' } },
    { client: 'Jasmin Store', platform: 'meta_ads', credentials: { adAccountId: '235252242319187', accessToken: 'EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD' } },
    { client: 'Pose', platform: 'meta_ads', credentials: { adAccountId: '718586248586722', accessToken: 'EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD' } },
    { client: 'Sultan Saray', platform: 'meta_ads', credentials: { adAccountId: '837221486760083', accessToken: 'EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD' } },
];

const MONTHLY_METRICS = [
    { month: '2025-10-31', platform: 'Meta Ads', type: 'ad', impressions: 291240, clicks: 5592, spend: 17210.71, revenue: 119386.57, conversions: 101, reach: 97772, frequency: 2.98, linkClicks: 4120, cpm: 7.02 },
    { month: '2025-09-30', platform: 'Meta Ads', type: 'ad', impressions: 1034536, clicks: 22269, spend: 58647.02, revenue: 524570.10, conversions: 433, reach: 206345, frequency: 5.01, linkClicks: 16070, cpm: 6.73 },
    { month: '2025-08-31', platform: 'Meta Ads', type: 'ad', impressions: 614766, clicks: 13726, spend: 45536.50, revenue: 353428.39, conversions: 269, reach: 136306, frequency: 4.51, linkClicks: 9371, cpm: 8.80 },
    { month: '2025-07-31', platform: 'Meta Ads', type: 'ad', impressions: 936367, clicks: 21551, spend: 62798.90, revenue: 518450.39, conversions: 326, reach: 208273, frequency: 4.50, linkClicks: 14831, cpm: 7.97 },
    { month: '2025-06-30', platform: 'Meta Ads', type: 'ad', impressions: 1141780, clicks: 24644, spend: 53388.63, revenue: 529166.63, conversions: 404, reach: 246390, frequency: 4.63, linkClicks: 17400, cpm: 5.55 },
    { month: '2025-05-31', platform: 'Meta Ads', type: 'ad', impressions: 853814, clicks: 24250, spend: 39505.86, revenue: 402151.97, conversions: 341, reach: 218285, frequency: 3.91, linkClicks: 20134, cpm: 5.50 },
    { month: '2025-04-30', platform: 'Meta Ads', type: 'ad', impressions: 660493, clicks: 18911, spend: 27889.65, revenue: 260493.15, conversions: 197, reach: 184074, frequency: 3.59, linkClicks: 14316, cpm: 5.02 },
    { month: '2025-03-31', platform: 'Meta Ads', type: 'ad', impressions: 345868, clicks: 11076, spend: 16573.51, revenue: 167176.33, conversions: 99, reach: 99554, frequency: 3.47, linkClicks: 9531, cpm: 5.69 },
    { month: '2025-02-28', platform: 'Meta Ads', type: 'ad', impressions: 508712, clicks: 17045, spend: 22803.86, revenue: 227034.00, conversions: 175, reach: 129228, frequency: 3.94, linkClicks: 14737, cpm: 5.32 },
    { month: '2025-01-31', platform: 'Meta Ads', type: 'ad', impressions: 646396, clicks: 15292, spend: 26273.76, revenue: 251204.20, conversions: 201, reach: 155250, frequency: 4.16, linkClicks: 11808, cpm: 4.83 },
    { month: '2024-12-31', platform: 'Meta Ads', type: 'ad', impressions: 498496, clicks: 11692, spend: 22651.05, revenue: 188710.09, conversions: 134, reach: 146659, frequency: 3.40, linkClicks: 7384, cpm: 5.40 },
    { month: '2025-10-31', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 474344.90, conversions: 0, orders: 247, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2025-09-30', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 885584.30, conversions: 0, orders: 464, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2025-08-31', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 665754.10, conversions: 0, orders: 306, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2025-07-31', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 928732.10, conversions: 0, orders: 361, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2025-06-30', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 919703.40, conversions: 0, orders: 426, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2025-05-31', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 772794.61, conversions: 0, orders: 384, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2025-04-30', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 472128.90, conversions: 0, orders: 222, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2025-03-31', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 318313.10, conversions: 0, orders: 115, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2025-02-28', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 452493.10, conversions: 0, orders: 206, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2025-01-31', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 440830.20, conversions: 0, orders: 213, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2024-12-31', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 405227.50, conversions: 0, orders: 168, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2024-11-30', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 861200.40, conversions: 0, orders: 319, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2024-10-31', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 820234.10, conversions: 0, orders: 281, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
    { month: '2024-09-30', platform: 'Shopify', type: 'ecommerce', impressions: 0, clicks: 0, spend: 0, revenue: 923805.65, conversions: 0, orders: 322, reach: 0, frequency: 0, linkClicks: 0, cpm: 0 },
];

const MONTHLY_ROLLUPS = [
    { month: '2025-10-31', impressions: 291240, clicks: 5592, spend: 17210.71, revenue: 593731.47, conversions: 348, orders: 247, roas: 6.94, cpo: 170.40, aov: 1920.42, cpm: 59.09 },
    { month: '2025-09-30', impressions: 1034536, clicks: 22269, spend: 58647.02, revenue: 1410154.40, conversions: 897, orders: 464, roas: 8.94, cpo: 135.44, aov: 1908.59, cpm: 56.69 },
    { month: '2025-08-31', impressions: 614766, clicks: 13726, spend: 45536.50, revenue: 1019182.49, conversions: 575, orders: 306, roas: 7.76, cpo: 169.28, aov: 2175.67, cpm: 74.07 },
    { month: '2025-07-31', impressions: 936367, clicks: 21551, spend: 62798.90, revenue: 1447182.49, conversions: 687, orders: 361, roas: 8.26, cpo: 192.63, aov: 2572.67, cpm: 67.07 },
    { month: '2025-06-30', impressions: 1141780, clicks: 24644, spend: 53388.63, revenue: 1448870.03, conversions: 830, orders: 426, roas: 9.91, cpo: 132.15, aov: 2158.93, cpm: 46.76 },
    { month: '2025-05-31', impressions: 853814, clicks: 24250, spend: 39505.86, revenue: 1174946.58, conversions: 725, orders: 384, roas: 10.18, cpo: 115.85, aov: 2012.49, cpm: 46.27 },
    { month: '2025-04-30', impressions: 660493, clicks: 18911, spend: 27889.65, revenue: 732622.05, conversions: 419, orders: 222, roas: 9.34, cpo: 141.57, aov: 2126.71, cpm: 42.23 },
    { month: '2025-03-31', impressions: 345868, clicks: 11076, spend: 16573.51, revenue: 485489.43, conversions: 214, orders: 115, roas: 10.09, cpo: 167.41, aov: 2767.94, cpm: 47.92 },
    { month: '2025-02-28', impressions: 508712, clicks: 17045, spend: 22803.86, revenue: 679527.10, conversions: 381, orders: 206, roas: 9.96, cpo: 130.31, aov: 2196.57, cpm: 44.83 },
    { month: '2025-01-31', impressions: 646396, clicks: 15292, spend: 26273.76, revenue: 692034.40, conversions: 414, orders: 213, roas: 9.56, cpo: 130.72, aov: 2069.63, cpm: 40.65 },
    { month: '2024-12-31', impressions: 498496, clicks: 11692, spend: 22651.05, revenue: 593937.59, conversions: 302, orders: 168, roas: 8.33, cpo: 169.04, aov: 2412.07, cpm: 45.44 },
    { month: '2024-11-30', impressions: 0, clicks: 0, spend: 0, revenue: 861200.40, conversions: 319, orders: 319, roas: 0, cpo: 0, aov: 2699.69, cpm: 0 },
    { month: '2024-10-31', impressions: 0, clicks: 0, spend: 0, revenue: 820234.10, conversions: 281, orders: 281, roas: 0, cpo: 0, aov: 2918.98, cpm: 0 },
    { month: '2024-09-30', impressions: 0, clicks: 0, spend: 0, revenue: 923805.65, conversions: 322, orders: 322, roas: 0, cpo: 0, aov: 2868.96, cpm: 0 },
];

async function migrateData() {
    console.log('\n═══════════════════════════════════════════');
    console.log('  STEP 2: Migrate Replit Data to Firestore');
    console.log('═══════════════════════════════════════════\n');

    // ── Clients ──
    console.log('👥 Clients:');
    for (const c of CLIENTS) {
        const existing = await db.collection('clients').where('name', '==', c.name).get();
        if (!existing.empty) {
            await existing.docs[0].ref.update({ legacyId: c.legacyId, baseCurrency: c.baseCurrency, region: c.region });
            clientMap[c.name] = existing.docs[0].id;
            console.log(`  ↻ ${c.name} (${existing.docs[0].id})`);
        } else {
            const ref = await db.collection('clients').add({
                name: c.name, email: '', baseCurrency: c.baseCurrency, region: c.region,
                status: 'active', legacyId: c.legacyId, source: 'replit',
                createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
            });
            clientMap[c.name] = ref.id;
            console.log(`  ✅ ${c.name} (${ref.id})`);
        }
    }

    // ── Platform Connections ──
    console.log('\n🔗 Platform Connections:');
    for (const pc of PLATFORM_CONNECTIONS) {
        const clientId = clientMap[pc.client];
        if (!clientId) continue;
        const existing = await db.collection('platformConnections').where('clientId', '==', clientId).where('platform', '==', pc.platform).get();
        if (!existing.empty) {
            await existing.docs[0].ref.update({ credentials: pc.credentials, isConnected: true });
            console.log(`  ↻ ${pc.client} — ${pc.platform}`);
        } else {
            await db.collection('platformConnections').add({
                clientId, platform: pc.platform, isConnected: true,
                credentials: pc.credentials, createdAt: FieldValue.serverTimestamp(),
            });
            console.log(`  ✅ ${pc.client} — ${pc.platform}`);
        }
    }

    // ── Monthly Platform Metrics (Genco) ──
    console.log('\n📊 Monthly Metrics:');
    const gencoId = clientMap['Genco'];
    let metricCount = 0;
    for (const m of MONTHLY_METRICS) {
        const docId = `${gencoId}_${m.platform.replace(/\s/g, '_')}_${m.month}`;
        await db.collection('monthlyPlatformMetrics').doc(docId).set({
            clientId: gencoId, platform: m.platform, platformType: m.type,
            monthEndDate: m.month, currency: 'EGP',
            impressions: m.impressions, clicks: m.clicks, spend: m.spend,
            revenue: m.revenue, conversions: m.conversions,
            orders: m.orders || 0, reach: m.reach || 0, frequency: m.frequency || 0,
            linkClicks: m.linkClicks || 0, cpm: m.cpm || 0,
            source: 'replit', aggregatedAt: FieldValue.serverTimestamp(),
        });
        metricCount++;
    }
    console.log(`  ✅ ${metricCount} platform metrics imported`);

    // ── Monthly Rollups ──
    console.log('\n📈 Monthly Rollups:');
    let rollupCount = 0;
    for (const r of MONTHLY_ROLLUPS) {
        const docId = `${gencoId}_combined_${r.month}`;
        await db.collection('monthlyClientRollups').doc(docId).set({
            clientId: gencoId, platformType: 'combined', monthEndDate: r.month, currency: 'EGP',
            impressions: r.impressions, clicks: r.clicks, spend: r.spend,
            revenue: r.revenue, conversions: r.conversions, orders: r.orders,
            roas: r.roas, cpo: r.cpo, aov: r.aov, cpm: r.cpm,
            source: 'replit', aggregatedAt: FieldValue.serverTimestamp(),
        });
        rollupCount++;
    }
    console.log(`  ✅ ${rollupCount} monthly rollups imported`);

    // ── Also migrate CSV invoices ──
    console.log('\n📄 Invoices:');
    const invoiceData = [
        { number: 'AWI-202603-001', clientName: 'RQM Group', service: 'Full Marketing Retainer', amount: 5500, currency: 'AED', date: '2026-03-01', due: '2026-03-08' },
        { number: 'AWI-202603-002', clientName: 'Ein Abaya', service: 'Growth Partnership — Ramadan Special', amount: 16000, currency: 'SAR', date: '2026-03-02', due: '2026-03-09' },
    ];
    for (const inv of invoiceData) {
        const existing = await db.collection('invoices').where('invoiceNumber', '==', inv.number).get();
        if (!existing.empty) { console.log(`  ↻ ${inv.number} exists`); continue; }
        await db.collection('invoices').add({
            invoiceNumber: inv.number, clientName: inv.clientName,
            lineItems: [{ description: inv.service, qty: 1, rate: inv.amount, amount: inv.amount }],
            subtotal: inv.amount, tax: 0, totalDue: inv.amount, currency: inv.currency,
            status: 'pending', issuedAt: inv.date, dueDate: inv.due,
            source: 'legacy', createdAt: FieldValue.serverTimestamp(),
        });
        console.log(`  ✅ ${inv.number} — ${inv.clientName}`);
    }
}

async function main() {
    await fixAdmin();
    await migrateData();

    console.log('\n═══════════════════════════════════════════');
    console.log('  ✨ All done!');
    console.log('═══════════════════════════════════════════');
    console.log('\nNext: Sign out and sign back in on my.admireworks.com');
    console.log('You should now see all sections as Owner.\n');
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
