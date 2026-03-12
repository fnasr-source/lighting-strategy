/**
 * Update invoice AWI-202603-004 (Meguiar's Egypt) to the final March 8 commercial structure.
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
                description: 'E-Commerce Store Build & Launch — Agreed Start Price (One-Time)',
                qty: 1,
                rate: 45000,
                amount: 40000,
            },
            {
                description: 'Growth Management & Ads Oversight — Month 1 (Monthly Upfront)',
                qty: 1,
                rate: 32500,
                amount: 15000,
            },
            {
                description: 'Commercial note (reference): Month 2 onward starts at 15,000 EGP/month upfront, with future commercial review tied to initial e-commerce growth / KPI review.',
                qty: 1,
                rate: 0,
                amount: 0,
            },
        ],
        subtotal: 77500,
        tax: 0,
        discount: 22500,
        discountLabel: 'Launch pricing adjustment',
        totalDue: 55000,
        currency: 'EGP',
        optionalAddOns: [],
        optionalItems: [],
        billingClarity: {
            title: 'What This Payment Covers',
            dueNowLabel: 'Due now to begin build + Month 1 management',
            schedule: [
                {
                    label: 'Month 2 onward (monthly upfront)',
                    value: '15,000 EGP / month at launch level',
                },
                {
                    label: 'Commercial review',
                    value: 'Step-up reviewed only after initial growth / KPI review',
                },
            ],
            scopeIncluded: [
                'E-commerce store build and launch setup',
                'Month 1 growth management and ads oversight',
                'Tracking, reporting, and performance visibility',
                'Coordination with Promolinks / content side on performance requirements',
            ],
            scopeExcluded: [
                'Ad spend is paid directly by the client',
                'Content production / filming execution is not included in this amount',
                'Future phase systems are excluded unless separately approved',
            ],
        },
        notes: 'Final March 8 commercial alignment applied. E-commerce build discounted from 45,000 EGP to 40,000 EGP. Monthly management launch level discounted from 32,500 EGP to 15,000 EGP/month upfront. Future uplift is subject to initial e-commerce growth and KPI review.',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await doc.ref.update(updateData);

    console.log('✅ Invoice updated successfully.');
    console.log('   List price: 77,500 EGP');
    console.log('   Launch pricing adjustment: -22,500 EGP');
    console.log('   Total due now: 55,000 EGP');
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
