import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSecret } from '@/lib/secrets';
import Stripe from 'stripe';

/**
 * Create Stripe Payment Intent for native checkout
 * POST /api/stripe/create-payment-intent
 * Body: { invoiceId }
 * Returns: { clientSecret, amount, currency }
 */
export async function POST(req: NextRequest) {
    try {
        const stripeKey = await getSecret('STRIPE_SECRET_KEY');
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' as any });
        const { invoiceId } = await req.json();

        const invDoc = await adminDb.collection('invoices').doc(invoiceId).get();
        if (!invDoc.exists) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        const inv = invDoc.data()!;

        if (inv.status === 'paid') {
            return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
        }

        // Check for existing incomplete PaymentIntent
        if (inv.stripePaymentIntentId) {
            try {
                const existing = await stripe.paymentIntents.retrieve(inv.stripePaymentIntentId);
                if (existing.status === 'requires_payment_method' || existing.status === 'requires_confirmation') {
                    return NextResponse.json({
                        clientSecret: existing.client_secret,
                        amount: inv.totalDue,
                        currency: inv.currency,
                    });
                }
            } catch { /* create new one */ }
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(inv.totalDue * 100),
            currency: inv.currency.toLowerCase(),
            description: `Invoice ${inv.invoiceNumber} — ${inv.clientName}`,
            metadata: {
                invoiceId: invDoc.id,
                invoiceNumber: inv.invoiceNumber,
                clientId: inv.clientId,
            },
            automatic_payment_methods: { enabled: true },
        });

        // Store PI ID on invoice for idempotency
        await adminDb.collection('invoices').doc(invDoc.id).update({
            stripePaymentIntentId: paymentIntent.id,
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            amount: inv.totalDue,
            currency: inv.currency,
        });
    } catch (err: any) {
        console.error('Payment intent error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
