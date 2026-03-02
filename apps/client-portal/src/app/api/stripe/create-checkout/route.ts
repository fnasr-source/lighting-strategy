import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * Create Stripe Checkout Session API
 * POST /api/stripe/create-checkout
 * Body: { invoiceId, successUrl, cancelUrl }
 */
export async function POST(req: NextRequest) {
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' as any });

        const admin = (await import('firebase-admin')).default;
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');
        if (admin.apps.length === 0) {
            const saPath = resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../../firebase/service-account.json');
            const sa = JSON.parse(readFileSync(saPath, 'utf8'));
            admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
        }
        const db = admin.firestore();

        const { invoiceId, successUrl, cancelUrl } = await req.json();

        // Get invoice
        const invDoc = await db.collection('invoices').doc(invoiceId).get();
        if (!invDoc.exists) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        const inv = invDoc.data()!;

        // Create Stripe checkout session
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
            metadata: {
                invoiceId: invDoc.id,
                invoiceNumber: inv.invoiceNumber,
                clientId: inv.clientId,
            },
            customer_email: undefined, // Will be set if client email is available
        });

        // Get client email for pre-fill
        if (inv.clientId) {
            const clientDoc = await db.collection('clients').doc(inv.clientId).get();
            if (clientDoc.exists && clientDoc.data()?.email) {
                // Note: customer_email can't be updated after creation, but we could use customer
            }
        }

        return NextResponse.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
        console.error('Stripe checkout error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
