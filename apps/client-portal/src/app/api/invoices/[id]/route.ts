import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Invoice data API
 * GET /api/invoices/[id]
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const invoiceDoc = await adminDb.collection('invoices').doc(id).get();
        if (!invoiceDoc.exists) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const configDoc = await adminDb.collection('systemConfig').doc('settings').get();
        const config = configDoc.data();

        return NextResponse.json({
            invoice: { id: invoiceDoc.id, ...invoiceDoc.data() },
            company: {
                name: config?.companyName, tagline: config?.companyTagline,
                email: config?.companyEmail, phone: config?.companyPhone, address: config?.companyAddress,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
