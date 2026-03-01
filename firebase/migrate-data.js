/**
 * Data Migration Script — imports existing CSV data into Firestore
 * Run: cd firebase && node migrate-data.js
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SA_PATH = join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
});

const db = admin.firestore();

function parseCSV(content) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Simple CSV parse handling quoted fields
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') { inQuotes = !inQuotes; continue; }
            if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
            current += char;
        }
        values.push(current.trim());
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        rows.push(row);
    }
    return rows;
}

async function migrateClients() {
    console.log('\n👥 Migrating clients...');
    const csvPath = join(__dirname, '..', 'Proposals', '_Proposal-System', 'payments', 'client-directory.csv');
    const rows = parseCSV(readFileSync(csvPath, 'utf8'));

    for (const row of rows) {
        if (!row.client_name) continue;
        // Check if already exists
        const existing = await db.collection('clients').where('name', '==', row.client_name).get();
        if (!existing.empty) {
            console.log(`   ⏭️  ${row.client_name} already exists`);
            continue;
        }

        const ref = await db.collection('clients').add({
            name: row.client_name,
            company: row.company || row.client_name,
            email: row.contact_email || '',
            phone: row.contact_phone || '',
            region: row.country || 'AE',
            baseCurrency: row.currency || 'USD',
            status: row.status === 'active' ? 'active' : 'prospect',
            notes: row.notes || '',
            legacyId: row.client_id,
            service: row.service || '',
            monthlyAmount: parseFloat(row.amount) || 0,
            billingCycle: row.billing_cycle || 'monthly',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ✅ ${row.client_name} → ${ref.id}`);
    }
}

async function migrateInvoices() {
    console.log('\n🧾 Migrating invoices...');
    const csvPath = join(__dirname, '..', 'Proposals', '_Proposal-System', 'payments', 'invoice-registry.csv');
    const rows = parseCSV(readFileSync(csvPath, 'utf8'));

    for (const row of rows) {
        if (!row.invoice_number) continue;
        // Check if already exists
        const existing = await db.collection('invoices').where('invoiceNumber', '==', row.invoice_number).get();
        if (!existing.empty) {
            console.log(`   ⏭️  ${row.invoice_number} already exists`);
            continue;
        }

        // Find client ID
        let clientId = '';
        const clientSnap = await db.collection('clients').where('legacyId', '==', row.client_id).get();
        if (!clientSnap.empty) clientId = clientSnap.docs[0].id;

        const amount = parseFloat(row.amount) || 0;
        const ref = await db.collection('invoices').add({
            invoiceNumber: row.invoice_number,
            clientId: clientId,
            clientName: row.client_name,
            lineItems: [{ description: row.service, qty: 1, rate: amount, amount: amount }],
            subtotal: amount,
            tax: 0,
            totalDue: amount,
            currency: row.currency || 'USD',
            status: row.status || 'pending',
            issuedAt: row.invoice_date,
            dueDate: row.due_date,
            stripePaymentLinkUrl: row.stripe_link || '',
            notes: row.notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ✅ ${row.invoice_number} → ${ref.id}`);
    }
}

async function migratePaymentLinks() {
    console.log('\n🔗 Migrating payment links...');
    const csvPath = join(__dirname, '..', 'Proposals', '_Proposal-System', 'payments', 'payment-links.csv');
    const rows = parseCSV(readFileSync(csvPath, 'utf8'));

    for (const row of rows) {
        if (!row.link_id) continue;
        const existing = await db.collection('paymentLinks').where('stripePaymentLinkId', '==', row.link_id).get();
        if (!existing.empty) {
            console.log(`   ⏭️  ${row.link_id} already exists`);
            continue;
        }

        const ref = await db.collection('paymentLinks').add({
            stripePaymentLinkId: row.link_id,
            url: row.url,
            productName: row.client || 'Unknown',
            amount: parseFloat(row.amount) || 0,
            currency: row.currency || 'USD',
            billingType: row.type === 'recurring' ? 'monthly' : 'one-time',
            clientName: row.client || '',
            status: row.status || 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ✅ ${row.link_id} → ${ref.id}`);
    }
}

async function migrateProposals() {
    console.log('\n📝 Migrating proposals from registry...');
    const csvPath = join(__dirname, '..', 'Proposals', '_Proposal-System', 'proposal-registry.csv');
    try {
        const rows = parseCSV(readFileSync(csvPath, 'utf8'));
        for (const row of rows) {
            if (!row.proposal_number) continue;
            const existing = await db.collection('proposals').where('proposalNumber', '==', row.proposal_number).get();
            if (!existing.empty) {
                console.log(`   ⏭️  ${row.proposal_number} already exists`);
                continue;
            }
            const ref = await db.collection('proposals').add({
                proposalNumber: row.proposal_number,
                clientName: row.client || row.client_name || '',
                status: row.status?.toLowerCase() || 'sent',
                sentDate: row.send_date || '',
                validUntil: row.valid_until || '',
                recommendedOption: row.recommended_option || '',
                documentUrl: row.url || '',
                notes: '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`   ✅ ${row.proposal_number} → ${ref.id}`);
        }
    } catch (e) {
        console.log('   ⚠️  No proposal-registry.csv found or format mismatch — skipping');
    }
}

async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Admireworks Data Migration                  ║');
    console.log('╚══════════════════════════════════════════════╝');

    await migrateClients();
    await migrateInvoices();
    await migratePaymentLinks();
    await migrateProposals();

    console.log('\n✅ Migration complete!');
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
