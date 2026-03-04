import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { sendInstapaySubmittedEmail } from '@/lib/email-receipts';
import { resolveInvoicePayableAmount } from '@/lib/invoice-optionals';

/**
 * Public Invoice data API
 * GET /api/invoices/[id]  — Returns invoice data + company info
 * PATCH /api/invoices/[id] — Submit InstaPay payment notification
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const invoiceDoc = await adminDb.collection('invoices').doc(id).get();
        if (!invoiceDoc.exists) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const configDoc = await adminDb.collection('systemConfig').doc('settings').get();
        const config = configDoc.data() || {};

        return NextResponse.json({
            invoice: { id: invoiceDoc.id, ...invoiceDoc.data() },
            company: {
                name: config.companyName || 'Admireworks',
                tagline: config.companyTagline || 'Admirable Venture Services',
                email: config.companyEmail || 'hello@admireworks.com',
                phone: config.companyPhone || '(+971) 4295 8666',
                address: config.companyAddress || 'P.O.Box/36846, DXB, UAE',
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/invoices/[id]
 * Client submits InstaPay payment confirmation.
 * Creates a pending payment record and sends email notifications.
 *
 * Body: { paymentMethod: 'instapay', instapayRef?: string, selectedOptionalAddOns?: string[] }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json() as {
            paymentMethod?: string;
            instapayRef?: string;
            selectedOptionalAddOns?: string[];
        };
        const { paymentMethod, instapayRef, selectedOptionalAddOns } = body;

        if (paymentMethod !== 'instapay') {
            return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
        }

        // Get invoice
        const invoiceRef = adminDb.collection('invoices').doc(id);
        const invoiceSnap = await invoiceRef.get();
        if (!invoiceSnap.exists) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }
        const invData = invoiceSnap.data()!;
        const pricing = resolveInvoicePayableAmount(invData, selectedOptionalAddOns);
        const selectedAddOnsPayload = pricing.selectedOptionalAddOns.map((addOn) => ({
            id: addOn.id,
            description: addOn.description,
            amount: addOn.amount,
        }));

        if (invData.status === 'paid') {
            return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
        }

        // Create pending payment record
        const submittedAt = new Date().toISOString();
        await adminDb.collection('payments').add({
            clientId: invData.clientId || '',
            clientName: invData.clientName || '',
            invoiceId: id,
            invoiceNumber: invData.invoiceNumber || '',
            amount: pricing.totalAmount,
            currency: invData.currency,
            method: 'instapay',
            status: 'pending',
            instapayRef: instapayRef || '',
            optionalAddOnTotal: pricing.optionalAmount,
            selectedOptionalAddOns: selectedAddOnsPayload,
            paidAt: submittedAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update invoice with submission info
        await invoiceRef.update({
            instapaySubmittedAt: submittedAt,
            instapayRef: instapayRef || '',
            instapayAmount: pricing.totalAmount,
            instapaySelectedOptionalAddOns: selectedAddOnsPayload,
            instapayOptionalAddOnTotal: pricing.optionalAmount,
        });

        // Send notifications
        try {
            let clientEmail = '';
            let ccEmails: string[] = [];

            if (invData.clientId) {
                const clientDoc = await adminDb.collection('clients').doc(invData.clientId).get();
                const cd = clientDoc.data();
                if (cd?.contacts && Array.isArray(cd.contacts)) {
                    const primary = cd.contacts.find((c: any) => c.role === 'primary');
                    clientEmail = primary?.email || cd.email || '';
                    ccEmails = cd.contacts.filter((c: any) => c.role === 'cc' && c.email).map((c: any) => c.email);
                } else {
                    clientEmail = cd?.email || '';
                }
            }

            const settingsDoc = await adminDb.collection('systemConfig').doc('settings').get();
            const settings = settingsDoc.data() || {};

            await sendInstapaySubmittedEmail({
                clientName: invData.clientName?.split(' — ')[0] || invData.clientName,
                clientEmail,
                ccEmails,
                invoiceNumber: invData.invoiceNumber,
                amount: pricing.totalAmount,
                currency: invData.currency,
                instapayRef: instapayRef || undefined,
                submittedAt,
                companyEmail: settings.companyEmail || 'hello@admireworks.com',
                companyPhone: settings.companyPhone || '(+971) 4295 8666',
            });
        } catch (emailErr: any) {
            console.error('Email notification failed:', emailErr.message);
        }

        return NextResponse.json({ ok: true, message: 'Payment submitted' });
    } catch (err: any) {
        console.error('PATCH /api/invoices/[id] error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
