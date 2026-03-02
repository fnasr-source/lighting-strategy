import { NextRequest, NextResponse } from 'next/server';

/**
 * Send Invoice Email API
 * POST /api/emails/send-invoice
 * Body: { invoiceId } OR { to, clientName, invoiceNumber, amount, currency, dueDate, paymentUrl }
 */
export async function POST(req: NextRequest) {
    try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@admireworks.com';

        // Verify admin
        const admin = (await import('firebase-admin')).default;
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');
        if (admin.apps.length === 0) {
            const saPath = resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../../firebase/service-account.json');
            const sa = JSON.parse(readFileSync(saPath, 'utf8'));
            admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
        }

        const authHeader = req.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1];
            const decoded = await admin.auth().verifyIdToken(token);
            if (decoded.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
        }

        const body = await req.json();
        const db = admin.firestore();

        let to: string, clientName: string, invoiceNumber: string, amount: number, currency: string, dueDate: string, paymentUrl: string;

        if (body.invoiceId) {
            // Fetch from Firestore
            const invDoc = await db.collection('invoices').doc(body.invoiceId).get();
            if (!invDoc.exists) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            const inv = invDoc.data()!;

            // Get client email
            let clientEmail = '';
            if (inv.clientId) {
                const clientDoc = await db.collection('clients').doc(inv.clientId).get();
                if (clientDoc.exists) clientEmail = clientDoc.data()!.email || '';
            }
            if (!clientEmail && body.to) clientEmail = body.to;
            if (!clientEmail) return NextResponse.json({ error: 'No client email found' }, { status: 400 });

            to = clientEmail;
            clientName = inv.clientName;
            invoiceNumber = inv.invoiceNumber;
            amount = inv.totalDue;
            currency = inv.currency;
            dueDate = inv.dueDate;
            paymentUrl = inv.stripePaymentLinkUrl || '';
        } else {
            to = body.to;
            clientName = body.clientName;
            invoiceNumber = body.invoiceNumber;
            amount = body.amount;
            currency = body.currency;
            dueDate = body.dueDate;
            paymentUrl = body.paymentUrl || '';
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#f7f8fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#001a70;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.1);padding:8px 16px;border-radius:8px;">
        <span style="color:#cc9f53;font-weight:800;font-size:20px;">AW</span>
      </div>
      <h1 style="color:#ffffff;margin:12px 0 0;font-size:18px;font-weight:700;">Invoice from Admireworks</h1>
    </div>
    <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">Dear ${clientName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">Please find below the details for your invoice:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#6b7280;font-weight:600;">Invoice Number</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#111827;">${invoiceNumber}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-weight:600;">Amount Due</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#111827;font-size:18px;">${amount.toLocaleString()} ${currency}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-weight:600;">Due Date</td><td style="padding:6px 0;text-align:right;color:#111827;">${dueDate}</td></tr>
        </table>
      </div>
      ${paymentUrl ? `<div style="text-align:center;margin:24px 0;"><a href="${paymentUrl}" style="display:inline-block;background:#001a70;color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;">Pay Now</a></div>` : ''}
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">If you have any questions, please reply to this email or contact us at hello@admireworks.com</p>
    </div>
    <div style="padding:20px;text-align:center;font-size:12px;color:#9ca3af;">
      <p style="margin:0;">Admireworks — Admirable Venture Services</p>
      <p style="margin:4px 0 0;">P.O.Box/36846, DXB, UAE · (+971) 4295 8666</p>
    </div>
  </div>
</body>
</html>`;

        const result = await resend.emails.send({
            from: `Admireworks <${fromEmail}>`,
            to: [to],
            subject: `Invoice ${invoiceNumber} — ${amount.toLocaleString()} ${currency} Due`,
            html: emailHtml,
        });

        // Update invoice record
        if (body.invoiceId) {
            await db.collection('invoices').doc(body.invoiceId).update({ emailSent: true, emailSentAt: new Date().toISOString() });
        }

        return NextResponse.json({ success: true, emailId: result.data?.id });
    } catch (err: any) {
        console.error('Send invoice email error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
