/**
 * Cron API Route: Automated Invoice Generation & Reminders
 *
 * This route is designed to be called by a cron scheduler (e.g., Vercel Cron, Cloud Scheduler).
 * It runs daily and:
 *   1. Generates invoices from active recurring templates when their nextDueDate is today or past
 *   2. Sends reminder emails for upcoming/overdue invoices
 *
 * POST /api/cron/invoices
 * Headers: { Authorization: Bearer <CRON_SECRET> }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    addMonthsToISODate,
    computeInvoiceDueDate,
    generateInvoiceNumber,
    getCadenceIntervalMonths,
    withReminderState,
} from '@/lib/billing';

export const dynamic = 'force-dynamic';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

/** Lazy-init Firebase Admin to avoid build-time errors */
async function getAdminDb() {
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    if (!getApps().length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
        initializeApp({ credential: cert(serviceAccount) });
    }
    return getFirestore();
}

export async function POST(req: NextRequest) {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'admireworks-cron-2026';
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getAdminDb();
    const { FieldValue } = await import('firebase-admin/firestore');
    const today = new Date().toISOString().slice(0, 10);
    const results = { invoicesGenerated: 0, remindersCreated: 0, errors: [] as string[] };

    try {
        // ── 1. Generate invoices from recurring templates ──
        const recurringSnap = await db.collection('recurringInvoices')
            .where('active', '==', true)
            .get();
        const allInvoicesSnap = await db.collection('invoices').get();
        const existingInvoiceNumbers = allInvoicesSnap.docs
            .map((doc) => doc.data().invoiceNumber)
            .filter((value): value is string => typeof value === 'string' && value.length > 0);

        for (const rdoc of recurringSnap.docs) {
            const template = rdoc.data();
            const triggerDate = template.nextSendDate || template.nextDueDate;
            if (!triggerDate || triggerDate > today) continue;

            try {
                const sendLeadDays = Number(template.sendLeadDays) || 0;
                const invoiceNumber = generateInvoiceNumber(existingInvoiceNumbers, today);
                existingInvoiceNumbers.push(invoiceNumber);
                const dueDate = computeInvoiceDueDate(today, sendLeadDays);

                await db.collection('invoices').add({
                    invoiceNumber,
                    clientId: template.clientId,
                    clientName: template.clientName,
                    lineItems: template.lineItems,
                    subtotal: template.subtotal,
                    tax: template.tax,
                    totalDue: template.totalDue,
                    currency: template.currency,
                    status: 'pending',
                    issuedAt: today,
                    dueDate,
                    billingPolicy: template.billingPolicy || null,
                    billingClarity: template.invoiceTemplateData?.billingClarity || null,
                    paymentTerms: template.invoiceTemplateData?.paymentTerms || null,
                    discount: template.invoiceTemplateData?.discount || 0,
                    discountLabel: template.invoiceTemplateData?.discountLabel || null,
                    pricingRule: template.invoiceTemplateData?.pricingRule || template.exchangeRateSnapshot?.pricingRule || null,
                    exchangeRateSnapshot: template.exchangeRateSnapshot || null,
                    exchangeRateUsed: template.exchangeRateSnapshot?.used || null,
                    exchangeRateDate: template.exchangeRateSnapshot?.date || null,
                    exchangeRateSourceUrl: template.exchangeRateSnapshot?.sourceUrl || null,
                    sendLeadDays,
                    reminderState: template.reminderState || { legacyFollowUps: { first: false, second: false, third: false } },
                    notes: template.notes ? `Auto-generated from: ${template.templateName}\n\n${template.notes}` : `Auto-generated from: ${template.templateName}`,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });

                const intervalMonths = getCadenceIntervalMonths(template.billingCadence, template.intervalMonths);
                const currentSendDate = template.nextSendDate || today;
                const nextSendDate = addMonthsToISODate(currentSendDate, intervalMonths);
                const nextDueDate = computeInvoiceDueDate(nextSendDate, sendLeadDays);

                await rdoc.ref.update({
                    nextSendDate,
                    nextDueDate,
                    lastGeneratedAt: today,
                    updatedAt: FieldValue.serverTimestamp(),
                });

                results.invoicesGenerated++;
            } catch (err: unknown) {
                results.errors.push(`Failed for ${template.clientName}: ${errorMessage(err)}`);
            }
        }

        // ── 2. Create reminders for overdue invoices ──
        const pendingSnap = await db.collection('invoices')
            .where('status', '==', 'pending')
            .get();

        for (const pdoc of pendingSnap.docs) {
            const inv = pdoc.data();
            if (!inv.dueDate) continue;

            const daysDiff = Math.ceil((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
            let reminderType: string | null = null;
            if (daysDiff === -1) reminderType = 'upcoming';
            else if (daysDiff === 0) reminderType = 'due_today';
            else if (daysDiff === 3) reminderType = 'overdue_3d';
            else if (daysDiff === 7) reminderType = 'overdue_7d';
            else if (daysDiff === 14) reminderType = 'overdue_14d';

            if (reminderType) {
                const existing = await db.collection('invoiceReminders')
                    .where('invoiceId', '==', pdoc.id)
                    .where('type', '==', reminderType)
                    .get();

                if (existing.empty) {
                    await db.collection('invoiceReminders').add({
                        invoiceId: pdoc.id,
                        invoiceNumber: inv.invoiceNumber,
                        clientId: inv.clientId,
                        clientName: inv.clientName,
                        type: reminderType,
                        status: 'pending',
                        createdAt: FieldValue.serverTimestamp(),
                    });
                    await pdoc.ref.update({
                        reminderState: withReminderState(inv.reminderState, reminderType as 'upcoming' | 'due_today' | 'overdue_3d' | 'overdue_7d' | 'overdue_14d', 'pending', today),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    results.remindersCreated++;
                }
            }
        }
    } catch (err: unknown) {
        results.errors.push(`Top-level error: ${errorMessage(err)}`);
    }

    return NextResponse.json({ success: true, date: today, ...results });
}
