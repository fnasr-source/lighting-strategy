import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = "/Users/user/Downloads/Admireworks' Subscriptions - Subscription - 2025 (Monthly).csv";

if (!getApps().length) {
  const sa = JSON.parse(readFileSync(join(__dirname, 'service-account.json'), 'utf8'));
  initializeApp({ credential: cert(sa) });
}

const db = getFirestore();
const GMAIL_CONNECTED_EMAIL = 'fnasr@admireworks.com';
const WATCHED_LABELS = ['Invoices', '@Invoices'];

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      if (field.length || row.length) {
        row.push(field.trim());
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field.trim());
    rows.push(row);
  }
  return rows.filter((item) => item.some(Boolean));
}

function moneyToNumber(input = '') {
  const clean = String(input).replace(/[^0-9.-]/g, '');
  const value = Number(clean);
  return Number.isFinite(value) ? value : 0;
}

function parseDate(input = '') {
  const [month, day, year] = String(input).split('/');
  if (!month || !day || !year) return new Date().toISOString().slice(0, 10);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildAliases(input = '') {
  const value = String(input).trim();
  if (!value) return [];
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return Array.from(new Set([value, normalized].filter(Boolean)));
}

function addMonthsToIsoDate(isoDate, months) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function getServicePeriodMonths(cadence, intervalMonths) {
  if (Number.isFinite(intervalMonths) && intervalMonths > 0) return intervalMonths;
  if (cadence === 'monthly') return 1;
  if (cadence === 'quarterly' || cadence === '3_months') return 3;
  if (cadence === 'semiannual' || cadence === '6_months') return 6;
  if (cadence === 'annual') return 12;
  return 0;
}

const csv = readFileSync(CSV_PATH, 'utf8');
const rows = parseCsv(csv);
const header = rows[0] || [];

await db.collection('systemConfig').doc('finance').set({
  gmailConnectedEmail: GMAIL_CONNECTED_EMAIL,
  watchedLabels: WATCHED_LABELS,
  pollingMinutes: 15,
  digestRecipients: [],
  baseCurrency: 'AED',
  forecastHorizons: [30, 90, 180],
  dailyDigestHourDubai: 9,
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });

const existing = await db.collection('recurringExpenses').where('source', '==', 'csv').get();
const deleteBatch = db.batch();
existing.docs.forEach((doc) => deleteBatch.delete(doc.ref));
if (!existing.empty) await deleteBatch.commit();

let imported = 0;
for (const row of rows.slice(1)) {
  if (!row[0] || /^total/i.test(row[0])) continue;
  const record = Object.fromEntries(header.map((key, index) => [key, row[index] || '']));
  if (!record['SUBSCRIPTIONS / EXPENSES']) continue;

  await db.collection('recurringExpenses').add({
    name: record['SUBSCRIPTIONS / EXPENSES'],
    vendor: record['SUBSCRIPTIONS / EXPENSES'],
    category: record['CATEGORIES'] || 'Other',
    utilizedBy: record['UTILIZED BY'] || '',
    cadence: 'monthly',
    intervalMonths: 1,
    nextChargeDate: parseDate(record['Upcoming']),
    amount: moneyToNumber(record['AED']) || moneyToNumber(record['USD']),
    currency: moneyToNumber(record['AED']) > 0 ? 'AED' : 'USD',
    normalizedAmount: moneyToNumber(record['AED']) > 0 ? moneyToNumber(record['AED']) : undefined,
    normalizedCurrency: moneyToNumber(record['AED']) > 0 ? 'AED' : undefined,
    paymentAccount: record['Card'] || '',
    status: String(record['STATUS'] || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'active',
    source: 'csv',
    remarks: record['REMARKS'] || '',
    aliases: buildAliases(record['SUBSCRIPTIONS / EXPENSES']),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  imported += 1;
}

const recurringTemplates = await db.collection('recurringInvoices').get();
for (const doc of recurringTemplates.docs) {
  const data = doc.data();
  const months = getServicePeriodMonths(data.billingCadence || data.frequency, data.intervalMonths);
  const start = data.servicePeriodStart || data.nextSendDate || new Date().toISOString().slice(0, 10);
  const end = data.servicePeriodEnd || (months > 0 ? addMonthsToIsoDate(start, months) : start);
  await doc.ref.set({
    servicePeriodStart: start,
    servicePeriodMonths: months,
    servicePeriodEnd: end,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  if (data.clientId) {
    await db.collection('clients').doc(data.clientId).set({
      billingCadence: data.billingCadence || data.frequency || 'monthly',
      nextInvoiceSendDate: data.nextSendDate || null,
      nextInvoiceDueDate: data.nextDueDate || null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}

const invoices = await db.collection('invoices').get();
for (const doc of invoices.docs) {
  const data = doc.data();
  const cadence = data.billingPolicy?.billingCadence;
  const months = getServicePeriodMonths(cadence, data.billingPolicy?.intervalMonths);
  const start = data.servicePeriodStart || data.issuedAt || new Date().toISOString().slice(0, 10);
  const end = data.servicePeriodEnd || (months > 0 ? addMonthsToIsoDate(start, months) : start);
  await doc.ref.set({
    servicePeriodStart: start,
    servicePeriodMonths: months,
    servicePeriodEnd: end,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

console.log(`Imported ${imported} recurring expenses from CSV.`);
