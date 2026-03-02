import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSecret } from '@/lib/secrets';
import Stripe from 'stripe';

/**
 * Create Stripe Checkout Session API
 * POST /api/stripe/create-checkout
 */
export async function POST(req: NextRequest) {
    try {
        const stripeKey = await getSecret('STRIPE_SECRET_KEY');
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' as any });
        const { invoiceId, successUrl, cancelUrl } = await req.json();

        const invDoc = await adminDb.collection('invoices').doc(invoiceId).get();
        if (!invDoc.exists) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        const inv = invDoc.data()!;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: inv.lineItems.map((item: any) => ({
                price_data: {
                    currency: inv.currency.toLowerCase(),
                    product_data: { name: item.description || 'Service' },
                    unit_amount: Math.round(item.amount * 100),
                },
                quantity: item.qty || 1,
            })),
            mode: 'payment',
            success_url: successUrl || `${req.nextUrl.origin}/dashboard/payments?success=true`,
            cancel_url: cancelUrl || `${req.nextUrl.origin}/dashboard/invoices`,
            metadata: { invoiceId: invDoc.id, invoiceNumber: inv.invoiceNumber, clientId: inv.clientId },
        });

        return NextResponse.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
        console.error('Stripe checkout error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
