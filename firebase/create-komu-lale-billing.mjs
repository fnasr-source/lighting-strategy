import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const csvPath = join(projectRoot, 'drafts', 'Active-clients-2026-1.csv');

const RATE_SOURCE_URL = 'https://realegp.com/usd';
const RATE_DATE = '2026-03-08';
const USD_TO_EGP = 49.91;
const AD_BUNDLE_USD = 700;
const AD_STANDARD_USD = 780;
const RAW_AD_BUNDLE_EGP = AD_BUNDLE_USD * USD_TO_EGP;
const RAW_DISCOUNT_EGP = (AD_STANDARD_USD - AD_BUNDLE_USD) * USD_TO_EGP;
const AD_BUNDLE_EGP = Math.round(RAW_AD_BUNDLE_EGP / 100) * 100;
const BUNDLE_DISCOUNT_EGP = Math.round(RAW_DISCOUNT_EGP / 100) * 100;
const AD_STANDARD_EGP = Math.round((AD_STANDARD_USD * USD_TO_EGP) / 100) * 100;
const CREATIVE_PACK_EGP = 22000;
const ISSUED_AT = RATE_DATE;
const SEND_LEAD_DAYS = 3;
const DUE_DATE = '2026-03-11';
const NEXT_SEND_DATE = '2026-06-08';
const NEXT_DUE_DATE = '2026-06-11';

function initDb() {
    if (!getApps().length) {
        const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'service-account.json'), 'utf8'));
        initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
    }
    return getFirestore();
}

function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function parseCsv(text) {
    const lines = text.split('\n').filter((line) => line.trim());
    const headers = parseLine(lines[0]).map((item) => item.trim());
    return lines.slice(1).map((line) => {
        const values = parseLine(line);
        return headers.reduce((acc, header, index) => {
            acc[header] = (values[index] || '').trim();
            return acc;
        }, {});
    });
}

function nextInvoiceNumber(existingNumbers) {
    const prefix = 'AWI-202603-';
    let nextSeq = 1;
    for (const invoiceNumber of existingNumbers) {
        if (!invoiceNumber.startsWith(prefix)) continue;
        const seq = Number(invoiceNumber.slice(prefix.length));
        if (Number.isFinite(seq)) nextSeq = Math.max(nextSeq, seq + 1);
    }
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

async function findOrCreateClient(db, row) {
    const clientCode = row['Client Code'];
    let clientDoc = null;

    if (clientCode) {
        const byCode = await db.collection('clients').where('clientCode', '==', clientCode).limit(1).get();
        clientDoc = byCode.docs[0] || null;
    }
    if (!clientDoc) {
        const byName = await db.collection('clients').where('name', '==', row['Client Name']).limit(1).get();
        clientDoc = byName.docs[0] || null;
    }

    const clientPayload = {
        name: row['Client Name'],
        company: row['Client Name'],
        email: row.Email,
        phone: `+${row['Country Code']}${row['Contact Number']}`,
        contacts: [
            {
                name: [row['First Name'], row['Second Name']].filter(Boolean).join(' ').trim() || row['Client Name'],
                email: row.Email,
                phone: `+${row['Country Code']}${row['Contact Number']}`,
                title: 'Primary Contact',
                role: 'primary',
            },
        ],
        region: 'EG',
        baseCurrency: 'EGP',
        status: 'active',
        clientCode,
        legacyServiceCode: 'Ad Mgt',
        billingCadence: '3_months',
        billingStatusLabel: 'Current cycle issued',
        nextInvoiceSendDate: NEXT_SEND_DATE,
        nextInvoiceDueDate: NEXT_DUE_DATE,
        legacyRateModel: 'legacy_eg_old_clients_usd_equivalent',
        marketRegion: 'Egypt',
        platformCount: 1,
        notes: [
            'Komu Lale existing client record aligned to legacy billing sheet.',
            'Teenagers/new-account billing scope added on 2026-03-08.',
        ].join('\n'),
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (clientDoc) {
        await clientDoc.ref.set(clientPayload, { merge: true });
        return { id: clientDoc.id, ...clientPayload };
    }

    const createdRef = await db.collection('clients').add({
        ...clientPayload,
        createdAt: FieldValue.serverTimestamp(),
    });
    return { id: createdRef.id, ...clientPayload };
}

async function main() {
    const db = initDb();
    const rows = parseCsv(readFileSync(csvPath, 'utf8'));
    const row = rows.find((item) => item['Client Name'] === 'Komu Lale');
    if (!row) throw new Error('Komu Lale row not found in Active-clients-2026-1.csv');

    const client = await findOrCreateClient(db, row);

    const existingInvoicesSnap = await db.collection('invoices').get();
    const existingNumbers = existingInvoicesSnap.docs
        .map((doc) => doc.data().invoiceNumber)
        .filter((value) => typeof value === 'string');
    const invoiceNumber = nextInvoiceNumber(existingNumbers);

    const staticInvoiceUrl = `https://ops.admireworks.com/Proposals/Komu-Lale/invoices/${invoiceNumber}/invoice.html`;
    const existingInvoice = await db.collection('invoices').where('invoiceNumber', '==', invoiceNumber).limit(1).get();
    if (!existingInvoice.empty) {
        console.log(JSON.stringify({ invoiceNumber, invoiceId: existingInvoice.docs[0].id, clientId: client.id }, null, 2));
        return;
    }

    const subtotal = AD_BUNDLE_EGP + CREATIVE_PACK_EGP + BUNDLE_DISCOUNT_EGP;
    const totalDue = AD_BUNDLE_EGP + CREATIVE_PACK_EGP;

    const invoicePayload = {
        invoiceNumber,
        clientId: client.id,
        clientName: client.name,
        billTo: row['First Name'] ? `${row['First Name']} ${row['Second Name'] || ''}`.trim() : client.name,
        billToContactName: `${row['First Name']} ${row['Second Name'] || ''}`.trim(),
        billToContactTitle: 'Primary Contact',
        lineItems: [
            {
                description: 'Ad Campaign Management — Egypt Market — 1 Platform — 3 Months',
                qty: 1,
                rate: AD_STANDARD_EGP,
                amount: AD_STANDARD_EGP,
            },
            {
                description: 'Creative Pack — Quarterly Content (8 videos + 4 images)',
                qty: 1,
                rate: CREATIVE_PACK_EGP,
                amount: CREATIVE_PACK_EGP,
            },
        ],
        subtotal,
        discount: BUNDLE_DISCOUNT_EGP,
        discountLabel: 'Legacy 3-Month Bundle Savings',
        tax: 0,
        totalDue,
        currency: 'EGP',
        status: 'pending',
        issuedAt: ISSUED_AT,
        dueDate: DUE_DATE,
        notes: [
            'Komu Lale Teenagers/new-account scope.',
            `Legacy ad-management pricing: $700 bundle converted at ${USD_TO_EGP} EGP/USD and rounded for invoicing.`,
            'Creative Pack covers 8 videos + 4 images for the quarter.',
        ].join('\n'),
        paymentTerms: 'Payment starts the Teenagers/new-account scope immediately. Invoice issued 3 days before due date.',
        legacyUrl: staticInvoiceUrl,
        exchangeRateSnapshot: {
            used: USD_TO_EGP,
            date: RATE_DATE,
            sourceUrl: RATE_SOURCE_URL,
            pricingRule: 'legacy_eg_3mo_700usd',
            baseAmountUsd: AD_BUNDLE_USD,
            convertedAmount: Number(RAW_AD_BUNDLE_EGP.toFixed(2)),
            roundedAmount: AD_BUNDLE_EGP,
        },
        exchangeRateUsed: USD_TO_EGP,
        exchangeRateDate: RATE_DATE,
        exchangeRateSourceUrl: RATE_SOURCE_URL,
        pricingRule: 'legacy_eg_3mo_700usd',
        sendLeadDays: SEND_LEAD_DAYS,
        billingPolicy: {
            legacyServiceCode: 'Ad Mgt',
            billingCadence: '3_months',
            billingStatusLabel: 'Current cycle issued',
            marketRegion: 'Egypt',
            platformCount: 1,
            legacyRateModel: 'legacy_eg_old_clients_usd_equivalent',
            sendLeadDays: SEND_LEAD_DAYS,
            minimumEngagementMonths: 3,
        },
        billingClarity: {
            title: 'What You Are Paying For',
            dueNowLabel: 'Due now to start the Teenagers/new-account scope',
            schedule: [
                { label: 'Current cycle', value: `${ISSUED_AT} issued · ${DUE_DATE} due` },
                { label: 'Next 3-month cycle', value: `${NEXT_SEND_DATE} issue target · ${NEXT_DUE_DATE} due` },
            ],
            scopeIncluded: [
                'Ad management for the new Teenagers account',
                'Quarterly creative pack: 8 videos + 4 images',
                'Creatives usable for both ads and social content',
                'Instagram and TikTok-focused execution scope',
            ],
            scopeExcluded: [
                'Publishing and daily account management',
                'Stories, replies, and community management',
                'Influencer outreach and coordination',
                'Extra creatives outside the agreed quarterly pack',
            ],
        },
        reminderState: {
            legacyFollowUps: { first: false, second: false, third: false },
            statusLabel: 'Invoice created',
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    const invoiceRef = await db.collection('invoices').add(invoicePayload);

    const recurringTemplateName = 'Komu Lale — Teenagers New Account — Quarterly Billing';
    const recurringExisting = await db.collection('recurringInvoices')
        .where('clientId', '==', client.id)
        .where('templateName', '==', recurringTemplateName)
        .limit(1)
        .get();

    const recurringPayload = {
        clientId: client.id,
        clientName: client.name,
        templateName: recurringTemplateName,
        lineItems: [
            {
                description: 'Ad Campaign Management — Egypt Market — 1 Platform — 3 Months',
                qty: 1,
                rate: AD_STANDARD_EGP,
                amount: AD_STANDARD_EGP,
            },
            {
                description: 'Creative Pack — Quarterly Content (8 videos + 4 images)',
                qty: 1,
                rate: CREATIVE_PACK_EGP,
                amount: CREATIVE_PACK_EGP,
            },
        ],
        subtotal,
        tax: 0,
        totalDue,
        currency: 'EGP',
        frequency: 'quarterly',
        billingDay: 8,
        nextSendDate: NEXT_SEND_DATE,
        nextDueDate: NEXT_DUE_DATE,
        billingCadence: '3_months',
        intervalMonths: 3,
        billingPolicy: {
            legacyServiceCode: 'Ad Mgt',
            billingCadence: '3_months',
            billingStatusLabel: 'Quarterly recurring template active',
            marketRegion: 'Egypt',
            platformCount: 1,
            legacyRateModel: 'legacy_eg_old_clients_usd_equivalent',
            sendLeadDays: SEND_LEAD_DAYS,
            minimumEngagementMonths: 3,
        },
        exchangeRateSnapshot: {
            used: USD_TO_EGP,
            date: RATE_DATE,
            sourceUrl: RATE_SOURCE_URL,
            pricingRule: 'legacy_eg_3mo_700usd',
            baseAmountUsd: AD_BUNDLE_USD,
            convertedAmount: Number(RAW_AD_BUNDLE_EGP.toFixed(2)),
            roundedAmount: AD_BUNDLE_EGP,
        },
        sendLeadDays: SEND_LEAD_DAYS,
        reminderState: {
            legacyFollowUps: { first: false, second: false, third: false },
            statusLabel: 'Recurring template ready',
        },
        invoiceTemplateData: {
            billingClarity: invoicePayload.billingClarity,
            paymentTerms: invoicePayload.paymentTerms,
            discount: BUNDLE_DISCOUNT_EGP,
            discountLabel: 'Legacy 3-Month Bundle Savings',
            pricingRule: 'legacy_eg_3mo_700usd',
        },
        active: true,
        autoSendEmail: false,
        paymentMethods: ['instapay', 'stripe'],
        notes: 'Quarterly billing template for Komu Lale Teenagers/new-account scope.',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (recurringExisting.empty) {
        await db.collection('recurringInvoices').add(recurringPayload);
    } else {
        await recurringExisting.docs[0].ref.set(recurringPayload, { merge: true });
    }

    await db.collection('clients').doc(client.id).set({
        billingStatusLabel: 'Invoice created',
        nextInvoiceSendDate: NEXT_SEND_DATE,
        nextInvoiceDueDate: NEXT_DUE_DATE,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(JSON.stringify({
        clientId: client.id,
        invoiceId: invoiceRef.id,
        invoiceNumber,
        invoiceUrl: `https://my.admireworks.com/invoice/${invoiceRef.id}`,
        staticInvoiceUrl,
        adBundleRoundedEg: AD_BUNDLE_EGP,
        creativePackEg: CREATIVE_PACK_EGP,
        totalDue,
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
