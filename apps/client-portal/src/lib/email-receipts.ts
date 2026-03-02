import { getSecret } from '@/lib/secrets';
import { Resend } from 'resend';

interface ReceiptData {
    clientName: string;
    clientEmail: string;
    ccEmails?: string[];     // additional contacts to CC
    invoiceNumber: string;
    amount: number;
    currency: string;
    paidAt: string;
    lineItems: { description: string; qty: number; amount: number }[];
    companyName?: string;
    companyEmail?: string;
    companyPhone?: string;
}

export async function sendPaymentReceipt(data: ReceiptData) {
    try {
        const apiKey = await getSecret('RESEND_API_KEY');
        if (!apiKey) { console.log('No RESEND_API_KEY — skipping email'); return; }
        const resend = new Resend(apiKey);

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@admireworks.com';
        const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0 });
        const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        const lineItemsHtml = data.lineItems.map(item =>
            `<tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;">${item.description}</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;font-size:14px;">${item.qty}</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600;">${fmtAmt(item.amount)} ${data.currency}</td>
            </tr>`
        ).join('');

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f8;padding:32px 16px;">
        <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
                <!-- Brand Header -->
                <tr><td style="background:#001a70;padding:20px 28px;border-radius:12px 12px 0 0;">
                    <table width="100%"><tr>
                        <td>
                            <div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.15);display:inline-block;text-align:center;line-height:36px;">
                                <span style="color:#cc9f53;font-weight:800;font-size:14px;">AW</span>
                            </div>
                            <span style="color:white;font-weight:700;font-size:15px;margin-left:10px;vertical-align:middle;letter-spacing:0.5px;">ADMIREWORKS</span>
                        </td>
                        <td style="text-align:right;color:rgba(255,255,255,0.7);font-size:12px;">Payment Receipt</td>
                    </tr></table>
                </td></tr>

                <!-- Success Banner -->
                <tr><td style="background:white;padding:28px 28px 0;">
                    <table width="100%"><tr>
                        <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;">
                            <table><tr>
                                <td style="vertical-align:middle;padding-right:12px;">
                                    <div style="width:32px;height:32px;border-radius:50%;background:#e6f9e6;text-align:center;line-height:32px;">✓</div>
                                </td>
                                <td>
                                    <p style="margin:0;font-weight:700;font-size:15px;color:#15803d;">Payment Successful</p>
                                    <p style="margin:2px 0 0;font-size:13px;color:#166534;">Your payment of <strong>${fmtAmt(data.amount)} ${data.currency}</strong> has been received.</p>
                                </td>
                            </tr></table>
                        </td>
                    </tr></table>
                </td></tr>

                <!-- Invoice Details -->
                <tr><td style="background:white;padding:24px 28px;">
                    <table width="100%" style="border-collapse:collapse;">
                        <tr>
                            <td style="padding:8px 0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Invoice</td>
                            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px;">${data.invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Client</td>
                            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px;">${data.clientName}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Payment Date</td>
                            <td style="padding:8px 0;text-align:right;font-weight:500;font-size:14px;">${fmtDate(data.paidAt)}</td>
                        </tr>
                    </table>
                </td></tr>

                <!-- Line Items -->
                <tr><td style="background:white;padding:0 28px;">
                    <table width="100%" style="border-collapse:collapse;">
                        <tr style="border-bottom:2px solid #001a70;">
                            <th style="text-align:left;padding:10px 0;font-size:11px;color:#001a70;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Description</th>
                            <th style="text-align:center;padding:10px 0;font-size:11px;color:#001a70;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;width:60px;">Qty</th>
                            <th style="text-align:right;padding:10px 0;font-size:11px;color:#001a70;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;width:120px;">Amount</th>
                        </tr>
                        ${lineItemsHtml}
                    </table>
                </td></tr>

                <!-- Total -->
                <tr><td style="background:white;padding:16px 28px 28px;">
                    <table width="100%"><tr>
                        <td style="border-top:2px solid #001a70;padding:12px 0;">
                            <table width="100%"><tr>
                                <td style="font-size:16px;font-weight:800;">Total Paid</td>
                                <td style="text-align:right;font-size:18px;font-weight:800;color:#001a70;">${fmtAmt(data.amount)} ${data.currency}</td>
                            </tr></table>
                        </td>
                    </tr></table>
                </td></tr>

                <!-- Footer -->
                <tr><td style="background:white;padding:0 28px 24px;border-radius:0 0 12px 12px;">
                    <table width="100%"><tr><td style="border-top:1px solid #eee;padding:16px 0;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#999;">This receipt confirms your payment has been processed.</p>
                        <p style="margin:4px 0 0;font-size:12px;color:#999;">For questions, contact <a href="mailto:${data.companyEmail || fromEmail}" style="color:#001a70;">${data.companyEmail || fromEmail}</a>${data.companyPhone ? ` or ${data.companyPhone}` : ''}</p>
                    </td></tr></table>
                </td></tr>

                <!-- Brand Footer -->
                <tr><td style="padding:16px;text-align:center;">
                    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:2px;color:#001a70;">ADMIREWORKS</p>
                    <p style="margin:2px 0 0;font-size:10px;color:#999;">Admirable Venture Services · Dubai, UAE</p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`;

        const ccList = (data.ccEmails || []).filter(e => e && e !== data.clientEmail);

        await resend.emails.send({
            from: `Admireworks <${fromEmail}>`,
            to: data.clientEmail,
            ...(ccList.length > 0 ? { cc: ccList } : {}),
            subject: `Payment Receipt — ${data.invoiceNumber} | Admireworks`,
            html,
        });

        // Also send copy to admin
        await resend.emails.send({
            from: `Admireworks <${fromEmail}>`,
            to: fromEmail,
            subject: `💰 Payment Received — ${data.invoiceNumber} from ${data.clientName}`,
            html,
        });

        console.log(`✅ Receipt sent to ${data.clientEmail}${ccList.length > 0 ? ` (CC: ${ccList.join(', ')})` : ''} and admin`);
    } catch (err: any) {
        console.error('Failed to send receipt email:', err.message);
    }
}
