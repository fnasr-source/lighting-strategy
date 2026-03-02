import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendPaymentConfirmedEmail } from '@/lib/email-receipts';

/**
 * POST /api/invoices/[id]/confirm-paid
 * Called by admin when marking an invoice as paid.
 * Sends a confirmation email to the client.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const invoiceDoc = await adminDb.collection('invoices').doc(id).get();
        if (!invoiceDoc.exists) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }
        const invData = invoiceDoc.data()!;

        // Get client email info
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

        await sendPaymentConfirmedEmail({
            clientName: invData.clientName?.split(' — ')[0] || invData.clientName,
            clientEmail,
            ccEmails,
            invoiceNumber: invData.invoiceNumber,
            amount: invData.totalDue,
            currency: invData.currency,
            paidAt: invData.paidAt || new Date().toISOString(),
            lineItems: invData.lineItems || [],
            companyEmail: settings.companyEmail || 'hello@admireworks.com',
            companyPhone: settings.companyPhone || '(+971) 4295 8666',
        });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error('confirm-paid error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
