import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { sendPaymentReceipt } from '@/lib/email-receipts';

/**
 * Stripe Webhook Handler
 * Handles Payment Intent + Checkout Session events.
 * After successful payment: marks invoice paid, creates payment record, sends receipt email.
 * POST /api/webhooks/stripe
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const event = JSON.parse(body);

        switch (event.type) {
            // ── Native Payment Intent (PaymentElement flow) ──
            case 'payment_intent.succeeded': {
                const pi = event.data.object;
                const invoiceId = pi.metadata?.invoiceId;

                if (invoiceId) {
                    const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
                    const invSnap = await invoiceRef.get();
                    if (invSnap.exists && invSnap.data()?.status !== 'paid') {
                        const invData = invSnap.data()!;
                        const paidAt = new Date().toISOString();

                        await invoiceRef.update({ status: 'paid', paidAt });
                        await adminDb.collection('payments').add({
                            clientId: pi.metadata.clientId || invData.clientId || '',
                            clientName: invData.clientName || '',
                            invoiceId,
                            invoiceNumber: pi.metadata.invoiceNumber || invData.invoiceNumber || '',
                            amount: pi.amount / 100,
                            currency: pi.currency?.toUpperCase(),
                            method: 'stripe',
                            status: 'succeeded',
                            stripePaymentIntentId: pi.id,
                            paidAt,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        console.log(`✅ Invoice ${invoiceId} marked paid (PI: ${pi.id})`);

                        // Send receipt email
                        await sendReceiptForInvoice(invData, invoiceId, paidAt);
                    }
                }
                break;
            }

            // ── Checkout Session flow (legacy/fallback) ──
            case 'checkout.session.completed': {
                const session = event.data.object;

                if (session.metadata?.invoiceId) {
                    const invoiceRef = adminDb.collection('invoices').doc(session.metadata.invoiceId);
                    const invSnap = await invoiceRef.get();
                    if (invSnap.exists && invSnap.data()?.status !== 'paid') {
                        const invData = invSnap.data()!;
                        const paidAt = new Date().toISOString();

                        await invoiceRef.update({ status: 'paid', paidAt });
                        await adminDb.collection('payments').add({
                            clientId: invData.clientId || session.metadata.clientId || '',
                            clientName: invData.clientName || '',
                            invoiceId: session.metadata.invoiceId,
                            invoiceNumber: invData.invoiceNumber || session.metadata.invoiceNumber || '',
                            amount: session.amount_total / 100,
                            currency: session.currency?.toUpperCase(),
                            method: 'stripe',
                            status: 'succeeded',
                            stripePaymentIntentId: session.payment_intent,
                            paidAt,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });

                        await sendReceiptForInvoice(invData, session.metadata.invoiceId, paidAt);
                    }
                } else if (session.payment_link) {
                    const invoicesSnap = await adminDb.collection('invoices')
                        .where('stripePaymentLinkId', '==', session.payment_link).get();
                    for (const doc of invoicesSnap.docs) {
                        if (doc.data().status !== 'paid') {
                            const invData = doc.data();
                            const paidAt = new Date().toISOString();

                            await doc.ref.update({ status: 'paid', paidAt });
                            await adminDb.collection('payments').add({
                                clientId: invData.clientId,
                                clientName: invData.clientName,
                                invoiceId: doc.id,
                                invoiceNumber: invData.invoiceNumber,
                                amount: session.amount_total / 100,
                                currency: session.currency?.toUpperCase(),
                                method: 'stripe',
                                status: 'succeeded',
                                stripePaymentIntentId: session.payment_intent,
                                paidAt,
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            });

                            await sendReceiptForInvoice(invData, doc.id, paidAt);
                        }
                    }
                }
                break;
            }

            case 'payment_intent.payment_failed':
                console.log('❌ Payment failed:', event.data.object.id, event.data.object.last_payment_error?.message);
                break;
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('Webhook error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}

/**
 * Look up client contacts and send branded receipt (primary + CC)
 */
async function sendReceiptForInvoice(invData: any, invoiceId: string, paidAt: string) {
    try {
        let clientEmail = '';
        let ccEmails: string[] = [];

        // Look up client contacts from clients collection
        if (invData.clientId) {
            const clientDoc = await adminDb.collection('clients').doc(invData.clientId).get();
            const clientData = clientDoc.data();
            if (clientData?.contacts && Array.isArray(clientData.contacts)) {
                const primary = clientData.contacts.find((c: any) => c.role === 'primary');
                clientEmail = primary?.email || clientData.email || clientData.contactEmail || '';
                ccEmails = clientData.contacts
                    .filter((c: any) => c.role === 'cc' && c.email)
                    .map((c: any) => c.email);
            } else {
                // Legacy: single email field
                clientEmail = clientData?.email || clientData?.contactEmail || '';
            }
        }

        // Fallback to invoice-level email
        if (!clientEmail) clientEmail = invData.clientEmail || '';

        // Get company info for the receipt
        const settingsDoc = await adminDb.collection('systemConfig').doc('settings').get();
        const settings = settingsDoc.data() || {};

        if (clientEmail) {
            await sendPaymentReceipt({
                clientName: invData.clientName,
                clientEmail,
                ccEmails,
                invoiceNumber: invData.invoiceNumber,
                amount: invData.totalDue,
                currency: invData.currency,
                paidAt,
                lineItems: invData.lineItems || [],
                companyName: settings.companyName || 'Admireworks',
                companyEmail: settings.companyEmail || 'hello@admireworks.com',
                companyPhone: settings.companyPhone || '(+971) 4295 8666',
            });
        } else {
            console.log(`⚠️  No email for client ${invData.clientName} — receipt skipped`);
        }
    } catch (err: any) {
        console.error('Receipt email failed:', err.message);
    }
}
