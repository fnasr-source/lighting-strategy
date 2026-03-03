/**
 * Update Ein Abaya Invoice AWI-202603-002 to Split Payment (2 Payments)
 * 
 * Payment 1: 8,000 SAR — Due now (website rebuild deposit)
 * Payment 2: 8,000 SAR — Due upon Marketing Strategy approval
 * 
 * Usage: cd firebase && node ../Proposals/_Proposal-System/payments/scripts/update-ein-abaya-split.mjs
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = join(__dirname, '../../../firebase/service-account.json');

if (!admin.apps.length) {
    const sa = JSON.parse(readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}

const db = admin.firestore();

async function updateEinAbayaSplit() {
    console.log('🔍 Looking up invoice AWI-202603-002...\n');

    const invoicesRef = db.collection('invoices');
    const snapshot = await invoicesRef.where('invoiceNumber', '==', 'AWI-202603-002').get();

    if (snapshot.empty) {
        console.error('❌ Invoice AWI-202603-002 not found in Firestore!');
        process.exit(1);
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    console.log(`✅ Found invoice: ${doc.id}`);
    console.log(`   Client: ${data.clientName}`);
    console.log(`   Current totalDue: ${data.totalDue} ${data.currency}`);
    console.log(`   Current status: ${data.status}\n`);

    // Update to split payment
    const updateData = {
        // Set totalDue to Payment 1 amount (what Stripe will charge)
        totalDue: 8000,

        // Add split payment structure
        paymentSplit: {
            type: '2-payments',
            totalInvestment: 16000,
            deposit1: {
                amount: 8000,
                label: 'Payment 1 — Due Now',
                description: 'Website rebuild deposit — to kick off development immediately',
                status: 'pending',
            },
            deposit2: {
                amount: 8000,
                label: 'Payment 2 — Due in 2 Weeks',
                description: 'Due by March 18, 2026 (2 weeks after Payment 1)',
                status: 'upcoming',
            },
        },

        // Update notes
        notes: 'Website rebuild + strategy + tracking + ads Month 1. Market value 42,000 SAR. Split: 8k now + 8k upon Marketing Strategy approval.',

        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await doc.ref.update(updateData);

    console.log('✅ Invoice updated successfully!');
    console.log('   totalDue: 8,000 SAR (Payment 1 — due now)');
    console.log('   Payment 2: 8,000 SAR (upon Marketing Strategy approval)');
    console.log(`\n📄 Invoice URL: https://my.admireworks.com/invoice/${doc.id}`);
    console.log('📊 Admin view: https://my.admireworks.com/dashboard/invoices');
}

updateEinAbayaSplit()
    .then(() => {
        console.log('\n✨ Done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
