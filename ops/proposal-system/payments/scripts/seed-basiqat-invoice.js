/**
 * Seed Basseqat Invoice to Firestore
 * 
 * Adds the Basseqat client and invoice AWI-202603-003 to the
 * client portal at my.admireworks.com
 * 
 * Usage: node seed-basiqat-invoice.js
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const saPath = path.resolve(__dirname, '../../firebase/service-account.json');
const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id,
});

const db = admin.firestore();

async function seedBasseqat() {
    console.log('🚀 Seeding Basseqat client and invoice...\n');

    // 1. Create or check client
    const clientsRef = db.collection('clients');
    const existingClients = await clientsRef.where('name', '==', 'Basseqat').get();

    let clientId;
    if (!existingClients.empty) {
        clientId = existingClients.docs[0].id;
        console.log(`✅ Client "Basseqat" already exists (ID: ${clientId})`);
    } else {
        const clientDoc = await clientsRef.add({
            name: 'Basseqat',
            company: 'Basseqat — بصيقات',
            email: '',
            phone: '',
            contacts: [
                { name: 'Eng. Khaled Nasseredin', email: '', phone: '', title: 'Owner', role: 'primary' },
                { name: 'Islam Darwish', email: '', phone: '', title: 'Contact', role: 'cc' },
            ],
            region: 'EG',
            baseCurrency: 'EGP',
            status: 'proposal_sent',
            notes: 'Full Growth Partnership + CRM + Reply Management. Launch promos applied.',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        clientId = clientDoc.id;
        console.log(`✅ Created client "Basseqat" (ID: ${clientId})`);
    }

    // 2. Create invoice (check if it already exists)
    const invoicesRef = db.collection('invoices');
    const existingInvoices = await invoicesRef.where('invoiceNumber', '==', 'AWI-202603-003').get();

    if (!existingInvoices.empty) {
        console.log(`⚠️  Invoice AWI-202603-003 already exists (ID: ${existingInvoices.docs[0].id})`);
        console.log(`   View at: https://my.admireworks.com/invoice/${existingInvoices.docs[0].id}`);
        return;
    }

    const invoiceDoc = await invoicesRef.add({
        invoiceNumber: 'AWI-202603-003',
        clientId: clientId,
        clientName: 'Basseqat — Eng. Khaled Nasseredin',
        lineItems: [
            { description: 'Full Growth Partnership — Setup Fee', qty: 1, rate: 35000, amount: 35000 },
            { description: 'Full Growth Partnership — Month 1 Retainer', qty: 1, rate: 32500, amount: 32500 },
            { description: 'Reply Management — Setup & Integration (WAIVED)', qty: 1, rate: 12500, amount: 0 },
            { description: 'Reply Management — Month 1 (FREE)', qty: 1, rate: 5000, amount: 0 },
            { description: 'Reply Management — Month 2 (FREE)', qty: 1, rate: 5000, amount: 0 },
            { description: 'CRM System — Setup & Integration (40% OFF)', qty: 1, rate: 7500, amount: 4500 },
            { description: 'CRM System — Month 1 (FREE)', qty: 1, rate: 3500, amount: 0 },
            { description: '1× UGC Video — Welcome Bonus (FREE)', qty: 1, rate: 5500, amount: 0 },
        ],
        subtotal: 106500,
        discount: 34500,
        discountLabel: 'Launch Promotion Savings',
        tax: 0,
        totalDue: 72000,
        currency: 'EGP',
        status: 'pending',
        issuedAt: '2026-03-03',
        dueDate: '2026-03-10',
        notes: 'Option 3 + Reply Mgmt (setup waived + 2mo free) + CRM (40% off + 1mo free) + 1 UGC bonus. Save 34,500 EGP.',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Created invoice AWI-202603-003 (ID: ${invoiceDoc.id})`);
    console.log(`\n📄 Invoice URL: https://my.admireworks.com/invoice/${invoiceDoc.id}`);
    console.log(`📊 Admin view: https://my.admireworks.com/dashboard/invoices`);
}

seedBasseqat()
    .then(() => {
        console.log('\n✨ Done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
