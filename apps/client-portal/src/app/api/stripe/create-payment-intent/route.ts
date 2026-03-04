import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSecret } from '@/lib/secrets';
import { resolveInvoicePayableAmount } from '@/lib/invoice-optionals';
import Stripe from 'stripe';

/**
 * Create Stripe Payment Intent for native checkout
 * POST /api/stripe/create-payment-intent
 * Body: { invoiceId, selectedOptionalAddOns? }
 * Returns: { clientSecret, amount, currency }
 */
export async function POST(req: NextRequest) {
    try {
        const stripeKey = await getSecret('STRIPE_SECRET_KEY');
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' as any });
        const body = await req.json() as { invoiceId?: string; selectedOptionalAddOns?: string[] };
        const invoiceId = body.invoiceId?.trim();
        if (!invoiceId) {
            return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
        }

        const invDoc = await adminDb.collection('invoices').doc(invoiceId).get();
        if (!invDoc.exists) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        const inv = invDoc.data()!;
        const pricing = resolveInvoicePayableAmount(inv, body.selectedOptionalAddOns);
        const amountToCharge = pricing.totalAmount;
        if (amountToCharge <= 0) {
            return NextResponse.json({ error: 'Invalid invoice amount' }, { status: 400 });
        }

        if (inv.status === 'paid') {
            return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
        }

        // Check for existing incomplete PaymentIntent
        if (inv.stripePaymentIntentId) {
            try {
                const existing = await stripe.paymentIntents.retrieve(inv.stripePaymentIntentId);
                if (existing.status === 'requires_payment_method' || existing.status === 'requires_confirmation') {
                    const expectedAmountCents = Math.round(amountToCharge * 100);
                    if (existing.amount === expectedAmountCents && existing.currency === String(inv.currency || '').toLowerCase()) {
                        return NextResponse.json({
                            clientSecret: existing.client_secret,
                            amount: amountToCharge,
                            currency: inv.currency,
                        });
                    }
                }
            } catch { /* create new one */ }
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amountToCharge * 100),
            currency: inv.currency.toLowerCase(),
            description: `Invoice ${inv.invoiceNumber} — ${inv.clientName}`,
            metadata: {
                invoiceId: invDoc.id,
                invoiceNumber: inv.invoiceNumber,
                clientId: inv.clientId,
                optionalAddOnIds: pricing.selectedOptionalAddOnIds.join(','),
                optionalAddOnAmount: String(pricing.optionalAmount),
                baseAmount: String(pricing.baseAmount),
            },
            automatic_payment_methods: { enabled: true },
        });

        // Store PI ID on invoice for idempotency
        await adminDb.collection('invoices').doc(invDoc.id).update({
            stripePaymentIntentId: paymentIntent.id,
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            amount: amountToCharge,
            currency: inv.currency,
        });
    } catch (err: any) {
        console.error('Payment intent error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
