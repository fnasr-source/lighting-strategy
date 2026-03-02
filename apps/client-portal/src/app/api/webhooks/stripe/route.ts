import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

/**
 * Stripe Webhook Handler
 * Receives payment events from Stripe and updates Firestore accordingly.
 * Endpoint: POST /api/webhooks/stripe
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const event = JSON.parse(body);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // Check metadata first (from our checkout sessions)
                if (session.metadata?.invoiceId) {
                    const invoiceRef = adminDb.collection('invoices').doc(session.metadata.invoiceId);
                    await invoiceRef.update({ status: 'paid', paidAt: new Date().toISOString() });

                    const invData = (await invoiceRef.get()).data();
                    await adminDb.collection('payments').add({
                        clientId: invData?.clientId || session.metadata.clientId || '',
                        clientName: invData?.clientName || '',
                        invoiceId: session.metadata.invoiceId,
                        invoiceNumber: invData?.invoiceNumber || session.metadata.invoiceNumber || '',
                        amount: session.amount_total / 100,
                        currency: session.currency?.toUpperCase(),
                        method: 'stripe',
                        status: 'succeeded',
                        stripePaymentIntentId: session.payment_intent,
                        paidAt: new Date().toISOString(),
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                } else if (session.payment_link) {
                    // Find by payment link ID
                    const invoicesSnap = await adminDb.collection('invoices')
                        .where('stripePaymentLinkId', '==', session.payment_link).get();

                    for (const invoiceDoc of invoicesSnap.docs) {
                        await invoiceDoc.ref.update({ status: 'paid', paidAt: new Date().toISOString() });
                        await adminDb.collection('payments').add({
                            clientId: invoiceDoc.data().clientId,
                            clientName: invoiceDoc.data().clientName,
                            invoiceId: invoiceDoc.id,
                            invoiceNumber: invoiceDoc.data().invoiceNumber,
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
                break;
            }

            case 'payment_intent.succeeded':
                console.log('Payment intent succeeded:', event.data.object.id);
                break;

            case 'payment_intent.payment_failed':
                console.log('Payment failed:', event.data.object.id);
                break;
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('Webhook error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
