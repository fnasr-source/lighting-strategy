/**
 * Update invoice AWI-202603-004 (Meguiar's Egypt) with optional add-on metadata.
 *
 * Usage:
 *   cd firebase && node ../Proposals/_Proposal-System/payments/scripts/update-meguiars-invoice-awi-202603-004.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(join(__dirname, '../../../../firebase/node_modules/firebase-admin'));
const saPath = join(__dirname, '../../../../firebase/service-account.json');

if (!admin.apps.length) {
    const sa = JSON.parse(readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}

const db = admin.firestore();
const INVOICE_NUMBER = 'AWI-202603-004';

async function updateInvoice() {
    console.log(`🔍 Looking up invoice ${INVOICE_NUMBER}...\n`);

    const snapshot = await db.collection('invoices').where('invoiceNumber', '==', INVOICE_NUMBER).limit(1).get();
    if (snapshot.empty) {
        console.error(`❌ Invoice ${INVOICE_NUMBER} not found.`);
        process.exit(1);
    }

    const doc = snapshot.docs[0];
    const current = doc.data();
    console.log(`✅ Found invoice: ${doc.id}`);
    console.log(`   Client: ${current.clientName}`);
    console.log(`   Current totalDue: ${current.totalDue} ${current.currency}\n`);

    const updateData = {
        lineItems: [
            {
                description: 'Growth Partnership — Month 1 (monthly upfront)',
                qty: 1,
                rate: 41250,
                amount: 41250,
            },
            {
                description: 'Pricing structure reference: Months 2–4 at 41,250 EGP/month upfront, then 32,500 EGP/month from Month 5 onward.',
                qty: 1,
                rate: 0,
                amount: 0,
            },
        ],
        subtotal: 41250,
        tax: 0,
        discount: 0,
        totalDue: 41250,
        currency: 'EGP',
        optionalAddOns: [
            {
                id: 'full-ecommerce-build-addon',
                description: 'Optional: Full E-commerce Build Add-On (one-time)',
                amount: 28000,
                defaultSelected: false,
                selectable: true,
            },
        ],
        notes: 'Option A applied with monthly-upfront structure. Optional e-commerce add-on (28,000 EGP one-time) is outside the default total and should only be included when selected.',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await doc.ref.update(updateData);

    console.log('✅ Invoice updated successfully.');
    console.log('   Default due now: 41,250 EGP');
    console.log('   Optional add-on: +28,000 EGP (unchecked by default)');
    console.log(`\n📄 Invoice URL: https://my.admireworks.com/invoice/${doc.id}`);
}

updateInvoice()
    .then(() => {
        console.log('\n✨ Done!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
