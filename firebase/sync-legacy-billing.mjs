import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const args = process.argv.slice(2);
const clientFilterIndex = args.indexOf('--client');
const clientFilter = clientFilterIndex >= 0 ? (args[clientFilterIndex + 1] || '').trim().toLowerCase() : '';
const dryRun = args.includes('--dry-run');

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

function parseLegacyDate(value) {
    if (!value) return '';
    const [month, day, year] = value.split('/').map((part) => Number(part));
    if (!month || !day || !year) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function mapRegion(countryCode) {
    const code = (countryCode || '').trim();
    if (code === '20') return { region: 'EG', label: 'Egypt', currency: 'EGP' };
    if (code === '966') return { region: 'SA', label: 'Saudi Arabia', currency: 'SAR' };
    if (code === '971') return { region: 'AE', label: 'UAE', currency: 'AED' };
    return { region: 'US', label: 'International', currency: 'USD' };
}

function mapStatus(status) {
    const normalized = (status || '').trim().toLowerCase();
    if (normalized === 'active') return 'active';
    if (normalized === 'paused' || normalized === 'stopped') return 'churned';
    return 'prospect';
}

function mapCadence(payment) {
    const normalized = (payment || '').trim().toLowerCase();
    if (normalized === 'monthly') return 'monthly';
    if (normalized === '2 months') return '2_months';
    if (normalized === '3 months') return '3_months';
    if (normalized === '6 months') return '6_months';
    return 'one_time';
}

function buildPhone(countryCode, number) {
    const trimmedNumber = (number || '').replace(/\s+/g, '');
    const trimmedCode = (countryCode || '').replace(/\s+/g, '');
    if (!trimmedNumber) return '';
    return trimmedCode ? `+${trimmedCode}${trimmedNumber}` : trimmedNumber;
}

function buildContacts(row) {
    const contacts = [];
    const primaryEmail = row.Email || '';
    if (primaryEmail) {
        contacts.push({
            name: [row['First Name'], row['Second Name']].filter(Boolean).join(' ').trim() || row['Client Name'],
            email: primaryEmail,
            phone: buildPhone(row['Country Code'], row['Contact Number']),
            title: 'Primary Contact',
            role: 'primary',
        });
    }

    const secondaryEmail = row['Email 2'] || '';
    if (secondaryEmail) {
        contacts.push({
            name: [row['FName 2'], row['SName 2']].filter(Boolean).join(' ').trim() || 'Secondary Contact',
            email: secondaryEmail,
            phone: buildPhone(row['Country Code 2'], row['Contact Number 2']),
            title: 'CC Contact',
            role: 'cc',
        });
    }

    return contacts;
}

async function syncClient(db, row) {
    const mappedRegion = mapRegion(row['Country Code']);
    const contacts = buildContacts(row);
    const primaryContact = contacts.find((contact) => contact.role === 'primary');
    const payload = {
        name: row['Client Name'],
        company: row['Client Name'],
        email: primaryContact?.email || '',
        phone: primaryContact?.phone || '',
        contacts,
        region: mappedRegion.region,
        baseCurrency: mappedRegion.currency,
        status: mapStatus(row.Status),
        clientCode: row['Client Code'] || '',
        legacyServiceCode: row.Service || 'Ad Mgt',
        billingCadence: mapCadence(row.Payment),
        billingStatusLabel: row.Condition || '',
        nextInvoiceSendDate: parseLegacyDate(row['Send Invoice']),
        nextInvoiceDueDate: parseLegacyDate(row['Date of Invoice']),
        legacyRateModel: mappedRegion.region === 'EG' && row.Service === 'Ad Mgt'
            ? 'legacy_eg_old_clients_usd_equivalent'
            : 'legacy_sheet_import',
        marketRegion: mappedRegion.label,
        platformCount: 1,
        notes: [
            row.Remarks ? `Legacy remarks: ${row.Remarks}` : '',
            `Imported from Active-clients-2026-1.csv on ${new Date().toISOString().slice(0, 10)}`,
        ].filter(Boolean).join('\n'),
        updatedAt: FieldValue.serverTimestamp(),
    };

    let existingDoc = null;
    if (payload.clientCode) {
        const existingByCode = await db.collection('clients').where('clientCode', '==', payload.clientCode).limit(1).get();
        existingDoc = existingByCode.docs[0] || null;
    }
    if (!existingDoc) {
        const existingByName = await db.collection('clients').where('name', '==', payload.name).limit(1).get();
        existingDoc = existingByName.docs[0] || null;
    }

    if (dryRun) {
        console.log(existingDoc ? `Would update ${payload.name}` : `Would create ${payload.name}`);
        console.log(JSON.stringify(payload, null, 2));
        return;
    }

    if (existingDoc) {
        await existingDoc.ref.set(payload, { merge: true });
        console.log(`Updated ${payload.name} (${existingDoc.id})`);
        return;
    }

    const createdRef = await db.collection('clients').add({
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`Created ${payload.name} (${createdRef.id})`);
}

async function main() {
    const db = initDb();
    const csvPath = join(projectRoot, 'drafts', 'Active-clients-2026-1.csv');
    const rows = parseCsv(readFileSync(csvPath, 'utf8'));
    const filteredRows = rows.filter((row) => row['Client Name'] && (!clientFilter || row['Client Name'].toLowerCase() === clientFilter));

    if (filteredRows.length === 0) {
        console.error('No matching client rows found.');
        process.exit(1);
    }

    for (const row of filteredRows) {
        await syncClient(db, row);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
