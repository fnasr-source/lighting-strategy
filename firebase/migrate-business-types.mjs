/**
 * One-time migration: Set businessType and industry for all existing clients.
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

const CLIENT_TYPES = {
    'OGBZCwtTuTFIchYXcKO9': { businessType: 'ecommerce', industry: 'fashion' },        // Genco
    'TEDZmsmAND4JMJ6kQLUV': { businessType: 'ecommerce', industry: 'food_beverage' },   // Sultan Saray
    'v3UKGRblpKJI0VBJ7cBo': { businessType: 'ecommerce', industry: 'fashion' },         // Jasmin Store
    'DmFMtfZi8pCqjwAmAomy': { businessType: 'ecommerce', industry: 'fashion' },         // Pose
    'EIN-001': { businessType: 'ecommerce', industry: 'fashion' },         // Ein Abaya
    'RQM-001': { businessType: 'lead_gen', industry: 'marketing_services' },// RQM Group
    'dJc8S9grZsv8ofVCTvHm': { businessType: 'lead_gen', industry: 'hr_consulting' },    // Aspire HR
    'IWvO6Ct67XFWztaufyeT': { businessType: 'lead_gen', industry: 'creative_services' },// Basseqat
};

(async () => {
    for (const [id, data] of Object.entries(CLIENT_TYPES)) {
        const ref = db.collection('clients').doc(id);
        const doc = await ref.get();
        if (!doc.exists) {
            console.log(`  ⏭  ${id} — not found, skipping`);
            continue;
        }
        await ref.update(data);
        console.log(`  ✅ ${doc.data().name} → ${data.businessType} / ${data.industry}`);
    }
    console.log('\n✨ Migration complete!');
})();
