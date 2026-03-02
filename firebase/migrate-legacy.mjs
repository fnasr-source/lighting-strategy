/**
 * Legacy Data Migration Script
 *
 * Imports historical invoices and client data from CSV files
 * into Firestore. Run once to bring old data into the new platform.
 *
 * Usage: node firebase/migrate-legacy.mjs
 */
import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, 'service-account-key.json'), 'utf8')
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── CSV parser (simple, handles quoted fields) ──
function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const headers = parseLine(lines[0]);
    return lines.slice(1).map(line => {
        const values = parseLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
        return obj;
    });
}

function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
        else { current += char; }
    }
    result.push(current);
    return result;
}

async function migrate() {
    const basePath = join(__dirname, '..', 'Proposals', '_Proposal-System', 'payments');

    // ── 1. Migrate Invoices ──
    console.log('\n📄 Migrating invoices...');
    const invoiceCSV = readFileSync(join(basePath, 'invoice-registry.csv'), 'utf8');
    const invoices = parseCSV(invoiceCSV);

    for (const inv of invoices) {
        if (!inv.invoice_number) continue;

        // Check if already exists
        const existing = await db.collection('invoices')
            .where('invoiceNumber', '==', inv.invoice_number)
            .get();

        if (!existing.empty) {
            console.log(`  ⏩ ${inv.invoice_number} already exists, skipping`);
            continue;
        }

        const amount = parseFloat(inv.amount) || 0;
        await db.collection('invoices').add({
            invoiceNumber: inv.invoice_number,
            clientId: inv.client_id,
            clientName: inv.client_name,
            lineItems: [{ description: inv.service, qty: 1, rate: amount, amount }],
            subtotal: amount,
            tax: 0,
            totalDue: amount,
            currency: inv.currency || 'AED',
            status: inv.status || 'pending',
            issuedAt: inv.invoice_date,
            dueDate: inv.due_date,
            paidAt: inv.payment_date || null,
            notes: inv.notes,
            legacyUrl: inv.invoice_url || null,
            legacyStripeLink: inv.stripe_link || null,
            source: 'legacy_csv',
            createdAt: FieldValue.serverTimestamp(),
        });
        console.log(`  ✅ ${inv.invoice_number} — ${inv.client_name} — ${amount} ${inv.currency}`);
    }

    // ── 2. Verify client data (already in Firestore from prior imports) ──
    console.log('\n👥 Checking client records...');
    const clientCSV = readFileSync(join(basePath, 'client-directory.csv'), 'utf8');
    const clients = parseCSV(clientCSV);

    for (const cl of clients) {
        if (!cl.client_id) continue;

        // Check if client exists by searching for matching name
        const existing = await db.collection('clients')
            .where('name', '==', cl.client_name)
            .get();

        if (!existing.empty) {
            console.log(`  ⏩ ${cl.client_name} already exists`);

            // Update with any missing billing info
            const docRef = existing.docs[0].ref;
            const data = existing.docs[0].data();
            const updates = {};
            if (!data.baseCurrency && cl.currency) updates.baseCurrency = cl.currency;
            if (Object.keys(updates).length > 0) {
                await docRef.update(updates);
                console.log(`  📝 Updated ${cl.client_name} with: ${Object.keys(updates).join(', ')}`);
            }
            continue;
        }

        // Create client if missing
        await db.collection('clients').add({
            name: cl.client_name,
            company: cl.company,
            email: cl.contact_email,
            phone: cl.contact_phone,
            region: cl.country || 'AE',
            baseCurrency: cl.currency || 'AED',
            status: cl.status === 'active' ? 'active' : 'prospect',
            notes: cl.notes,
            source: 'legacy_csv',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`  ✅ Created ${cl.client_name}`);
    }

    console.log('\n✨ Migration complete!');
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
