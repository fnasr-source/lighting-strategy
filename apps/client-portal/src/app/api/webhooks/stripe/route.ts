import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

/**
 * Stripe Webhook Handler
 * Handles both Checkout Session events and Payment Intent events.
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
                        await invoiceRef.update({ status: 'paid', paidAt: new Date().toISOString() });
                        await adminDb.collection('payments').add({
                            clientId: pi.metadata.clientId || invSnap.data()?.clientId || '',
                            clientName: invSnap.data()?.clientName || '',
                            invoiceId,
                            invoiceNumber: pi.metadata.invoiceNumber || invSnap.data()?.invoiceNumber || '',
                            amount: pi.amount / 100,
                            currency: pi.currency?.toUpperCase(),
                            method: 'stripe',
                            status: 'succeeded',
                            stripePaymentIntentId: pi.id,
                            paidAt: new Date().toISOString(),
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        console.log(`Invoice ${invoiceId} marked paid (PI: ${pi.id})`);
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
                        await invoiceRef.update({ status: 'paid', paidAt: new Date().toISOString() });
                        await adminDb.collection('payments').add({
                            clientId: invSnap.data()?.clientId || session.metadata.clientId || '',
                            clientName: invSnap.data()?.clientName || '',
                            invoiceId: session.metadata.invoiceId,
                            invoiceNumber: invSnap.data()?.invoiceNumber || session.metadata.invoiceNumber || '',
                            amount: session.amount_total / 100,
                            currency: session.currency?.toUpperCase(),
                            method: 'stripe',
                            status: 'succeeded',
                            stripePaymentIntentId: session.payment_intent,
                            paidAt: new Date().toISOString(),
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                } else if (session.payment_link) {
                    const invoicesSnap = await adminDb.collection('invoices')
                        .where('stripePaymentLinkId', '==', session.payment_link).get();
                    for (const doc of invoicesSnap.docs) {
                        if (doc.data().status !== 'paid') {
                            await doc.ref.update({ status: 'paid', paidAt: new Date().toISOString() });
                            await adminDb.collection('payments').add({
                                clientId: doc.data().clientId,
                                clientName: doc.data().clientName,
                                invoiceId: doc.id,
                                invoiceNumber: doc.data().invoiceNumber,
                                amount: session.amount_total / 100,
                                currency: session.currency?.toUpperCase(),
                                method: 'stripe',
                                status: 'succeeded',
                                stripePaymentIntentId: session.payment_intent,
                                paidAt: new Date().toISOString(),
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            });
                        }
                    }
                }
                break;
            }

            case 'payment_intent.payment_failed':
                console.log('Payment failed:', event.data.object.id, event.data.object.last_payment_error?.message);
                break;
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('Webhook error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
