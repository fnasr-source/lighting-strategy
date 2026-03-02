import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Public Invoice data API
 * GET /api/invoices/[id]
 * Returns invoice data + company info for the public invoice page
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
