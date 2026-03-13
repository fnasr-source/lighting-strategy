/**
 * Update invoice AWI-202603-001 (RQM Group) to consolidate:
 * - Prorated March 1-12, 2026 service period
 * - Full April 2026 retainer
 *
 * Uses the workspace Firebase service account explicitly so the update
 * never depends on an interactive local login.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(join(__dirname, '../../../../firebase/node_modules/firebase-admin'));

const serviceAccountPath = join(__dirname, '../../../../firebase/service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
    });
}

const db = admin.firestore();
const invoiceRef = db.collection('invoices').doc('AWI-202603-001');

const monthlyRetainer = 5500;
const proratedMarchAmount = Number(((monthlyRetainer / 31) * 12).toFixed(2));
const revisedTotal = Number((proratedMarchAmount + monthlyRetainer).toFixed(2));

const updateData = {
    clientId: 'RQM-001',
    clientName: 'RQM Group',
    invoiceNumber: 'AWI-202603-001',
    issuedAt: '2026-03-13',
    dueDate: '2026-03-31',
    currency: 'AED',
    status: 'pending',
    lineItems: [
        {
            description: 'Full Marketing Retainer — Prorated service period for March 1-12, 2026 (12 active days before temporary pause).',
            qty: 1,
            rate: proratedMarchAmount,
            amount: proratedMarchAmount,
        },
        {
            description: 'Full Marketing Retainer — April 2026 monthly retainer.',
            qty: 1,
            rate: monthlyRetainer,
            amount: monthlyRetainer,
        },
    ],
    subtotal: revisedTotal,
    tax: 0,
    totalDue: revisedTotal,
    billingClarity: {
        title: 'What This Revised Invoice Covers',
        dueNowLabel: 'Prorated March 1-12, 2026 services + April 2026 retainer',
        schedule: [
            {
                label: 'March 2026 coverage',
                value: `${proratedMarchAmount.toFixed(2)} AED for 12 active days`,
            },
            {
                label: 'April 2026 coverage',
                value: `${monthlyRetainer.toFixed(2)} AED for the full month`,
            },
            {
                label: 'Requested payment target',
                value: 'Tuesday, March 31, 2026',
            },
        ],
        scopeIncluded: [
            'Direct response marketing execution',
            'Social media management',
            'Email campaigns and funnel support',
            'Multi-platform advertising management',
            'Ongoing performance coordination for RQM Group',
        ],
        scopeExcluded: [
            'Media spend paid directly by the client',
        ],
    },
    notes: 'Revised on March 13, 2026 to consolidate the prorated March 1-12 service period with the full April 2026 retainer, per client request. Due date moved to March 31, 2026.',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

async function main() {
    console.log('Updating invoice AWI-202603-001...');
    console.log(`Service account: ${serviceAccountPath}`);

    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) {
        console.error('Invoice AWI-202603-001 was not found in Firestore.');
        process.exit(1);
    }

    await invoiceRef.update(updateData);

    console.log('Invoice updated successfully.');
    console.log(`Prorated March 1-12 amount: ${proratedMarchAmount.toFixed(2)} AED`);
    console.log(`April 2026 amount: ${monthlyRetainer.toFixed(2)} AED`);
    console.log(`Revised total due: ${revisedTotal.toFixed(2)} AED`);
    console.log('Due date: 2026-03-31');
    console.log('Portal URL: https://my.admireworks.com/invoice/AWI-202603-001');
}

main().catch((error) => {
    console.error('Failed to update invoice:', error.message);
    process.exit(1);
});
