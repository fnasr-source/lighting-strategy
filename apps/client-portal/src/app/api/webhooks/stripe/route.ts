import { NextRequest, NextResponse } from 'next/server';

/**
 * Stripe Webhook Handler
 * Receives payment events from Stripe and updates Firestore accordingly.
 * 
 * Endpoint: POST /api/webhooks/stripe
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.text();

        // In production, verify the webhook signature using STRIPE_WEBHOOK_SECRET
        // For now, parse the event directly
        const event = JSON.parse(body);

        // Dynamically import firebase-admin (server-side only)
        const admin = (await import('firebase-admin')).default;
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');

        if (admin.apps.length === 0) {
            const saPath = resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../../firebase/service-account.json');
            const sa = JSON.parse(readFileSync(saPath, 'utf8'));
            admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
        }
        const db = admin.firestore();

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                // Find the invoice by payment link ID and update
                const invoicesSnap = await db.collection('invoices')
                    .where('stripePaymentLinkId', '==', session.payment_link)
                    .get();

                for (const invoiceDoc of invoicesSnap.docs) {
                    await invoiceDoc.ref.update({
                        status: 'paid',
                        paidAt: new Date().toISOString(),
                    });

                    // Create a payment record
                    await db.collection('payments').add({
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
                break;
            }

            case 'payment_intent.succeeded': {
                console.log('Payment intent succeeded:', event.data.object.id);
                break;
            }

            case 'payment_intent.payment_failed': {
                console.log('Payment failed:', event.data.object.id);
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('Webhook error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
