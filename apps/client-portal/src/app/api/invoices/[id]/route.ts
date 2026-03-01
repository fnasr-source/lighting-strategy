import { NextRequest, NextResponse } from 'next/server';

/**
 * Invoice Generation API — Get invoice data for rendering
 * GET /api/invoices/[id]
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const admin = (await import('firebase-admin')).default;
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');

        if (admin.apps.length === 0) {
            const saPath = resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../../firebase/service-account.json');
            const sa = JSON.parse(readFileSync(saPath, 'utf8'));
            admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
        }

        const invoiceDoc = await admin.firestore().collection('invoices').doc(id).get();
        if (!invoiceDoc.exists) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const invoice = invoiceDoc.data();

        // Get system config for branding
        const configDoc = await admin.firestore().collection('systemConfig').doc('settings').get();
        const config = configDoc.data();

        return NextResponse.json({
            invoice: { id: invoiceDoc.id, ...invoice },
            company: {
                name: config?.companyName,
                tagline: config?.companyTagline,
                email: config?.companyEmail,
                phone: config?.companyPhone,
                address: config?.companyAddress,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
