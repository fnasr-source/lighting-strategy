import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyApiUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

function parseCsv(input: string) {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
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
  return rows.filter((rowItem) => rowItem.some((cell) => cell));
}

function moneyToNumber(input: string) {
  const clean = input.replace(/[^0-9.-]/g, '');
  const value = Number(clean);
  return Number.isFinite(value) ? value : 0;
}

function parseUpcomingDate(input: string) {
  if (!input) return new Date().toISOString().slice(0, 10);
  const [month, day, year] = input.split('/');
  if (!month || !day || !year) return new Date().toISOString().slice(0, 10);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildAliases(input: string) {
  const value = (input || '').trim();
  if (!value) return [];
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return Array.from(new Set([value, normalized].filter(Boolean)));
}

export async function POST(req: NextRequest) {
  const user = await verifyApiUser(req.headers.get('authorization'));
  if (!user || !['owner', 'admin'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
  }

  const csv = await file.text();
  const rows = parseCsv(csv);
  const header = rows[0] || [];
  const db = getAdminDb();
  const existing = await db.collection('recurringExpenses').where('source', '==', 'csv').get();
  if (!existing.empty) {
    const deleteBatch = db.batch();
    existing.docs.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
  }
  let imported = 0;

  for (const row of rows.slice(1)) {
    if (!row[0] || row[0].toUpperCase().includes('TOTAL')) continue;
    const record = Object.fromEntries(header.map((key, index) => [key, row[index] || '']));
    if (!record['SUBSCRIPTIONS / EXPENSES']) continue;

    await db.collection('recurringExpenses').add({
      name: record['SUBSCRIPTIONS / EXPENSES'],
      vendor: record['SUBSCRIPTIONS / EXPENSES'],
      category: record['CATEGORIES'] || 'Other',
      utilizedBy: record['UTILIZED BY'] || '',
      cadence: 'monthly',
      intervalMonths: 1,
      nextChargeDate: parseUpcomingDate(record['Upcoming']),
      amount: moneyToNumber(record['AED']) || moneyToNumber(record['USD']),
      currency: moneyToNumber(record['AED']) > 0 ? 'AED' : 'USD',
      normalizedAmount: moneyToNumber(record['AED']) > 0 ? moneyToNumber(record['AED']) : undefined,
      normalizedCurrency: moneyToNumber(record['AED']) > 0 ? 'AED' : undefined,
      paymentAccount: record['Card'] || '',
      status: (record['STATUS'] || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'active',
      source: 'csv',
      remarks: record['REMARKS'] || '',
      aliases: buildAliases(record['SUBSCRIPTIONS / EXPENSES']),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    imported += 1;
  }

  return NextResponse.json({ success: true, imported });
}
