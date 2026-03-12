#!/usr/bin/env node
/**
 * Admireworks Invoice Email System
 * 
 * Sends invoice emails and payment reminders via Resend.
 * 
 * Usage:
 *   node scripts/send-invoice-email.js --invoice AWI-202603-001 --to client@email.com
 *   node scripts/send-invoice-email.js --invoice AWI-202603-001 --to client@email.com --reminder
 *   node scripts/send-invoice-email.js --test --to fnasr@admireworks.com
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'hello@admireworks.com';

// Parse arguments
const args = process.argv.slice(2);
function getArg(name) {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}
const isReminder = args.includes('--reminder');
const isTest = args.includes('--test');
const invoiceNumber = getArg('invoice');
const toEmail = getArg('to');


// ── Brand constants ──────────────────────────────
const BRAND = {
    navy: '#001a70',
    gold: '#cc9f53',
    bg: '#f8f7f4',
    white: '#ffffff',
    muted: '#5d6475',
    border: '#e3e0d8',
    name: 'Admireworks',
    tagline: 'Admirable Venture Services',
    address: 'P.O.Box/36846, DXB, UAE',
    phone: '(+971) 4295 8666',
    email: 'hello@admireworks.com',
    website: 'admireworks.com',
};


// ── Email Templates ──────────────────────────────

function invoiceEmailHTML({ clientName, invoiceNumber, invoiceDate, amount, currency, service, invoiceUrl, paymentUrl }) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${BRAND.white};border-radius:12px;border:1px solid ${BRAND.border};overflow:hidden;">
        
        <!-- Header -->
        <tr>
          <td style="background:${BRAND.navy};padding:28px 32px;text-align:center;">
            <p style="color:${BRAND.gold};font-size:12px;letter-spacing:2px;margin:0 0 4px;text-transform:uppercase;">${BRAND.name}</p>
            <h1 style="color:white;font-size:22px;margin:0;font-weight:600;">Invoice</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:${BRAND.muted};font-size:15px;margin:0 0 20px;line-height:1.6;">
              Dear <strong style="color:#1d2436;">${clientName}</strong>,
            </p>
            <p style="color:${BRAND.muted};font-size:15px;margin:0 0 24px;line-height:1.6;">
              Please find your invoice for the current billing period. Details below:
            </p>

            <!-- Invoice Details Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:10px;border:1px solid ${BRAND.border};margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:13px;">Invoice Number</td>
                      <td style="padding:4px 0;text-align:right;font-weight:600;color:#1d2436;font-size:13px;">${invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:13px;">Invoice Date</td>
                      <td style="padding:4px 0;text-align:right;color:#1d2436;font-size:13px;">${invoiceDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:13px;">Service</td>
                      <td style="padding:4px 0;text-align:right;color:#1d2436;font-size:13px;">${service}</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding:12px 0 0;border-top:2px solid ${BRAND.gold};"></td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.navy};font-weight:700;font-size:15px;">Total Due</td>
                      <td style="padding:4px 0;text-align:right;color:${BRAND.navy};font-weight:700;font-size:18px;">${amount} ${currency}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Buttons -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="${paymentUrl || '#'}" style="display:inline-block;background:${BRAND.navy};color:white;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:15px;">
                    Pay ${amount} ${currency} →
                  </a>
                </td>
              </tr>
              ${invoiceUrl ? `<tr>
                <td align="center">
                  <a href="${invoiceUrl}" style="color:${BRAND.navy};font-size:13px;text-decoration:underline;">View Full Invoice</a>
                </td>
              </tr>` : ''}
            </table>

            <p style="color:${BRAND.muted};font-size:13px;margin:24px 0 0;line-height:1.5;text-align:center;">
              🔒 Payments are processed securely via Stripe
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f8f5;padding:20px 32px;border-top:1px solid ${BRAND.border};text-align:center;">
            <p style="color:${BRAND.navy};font-weight:700;font-size:12px;letter-spacing:1px;margin:0 0 4px;">${BRAND.name}</p>
            <p style="color:${BRAND.muted};font-size:11px;margin:0;">${BRAND.tagline} · ${BRAND.address}</p>
            <p style="color:${BRAND.muted};font-size:11px;margin:4px 0 0;">${BRAND.email} · ${BRAND.phone}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}


function reminderEmailHTML({ clientName, invoiceNumber, invoiceDate, amount, currency, service, invoiceUrl, paymentUrl, daysSince }) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${BRAND.white};border-radius:12px;border:1px solid ${BRAND.border};overflow:hidden;">
        
        <!-- Header -->
        <tr>
          <td style="background:${BRAND.gold};padding:28px 32px;text-align:center;">
            <p style="color:white;font-size:12px;letter-spacing:2px;margin:0 0 4px;text-transform:uppercase;">${BRAND.name}</p>
            <h1 style="color:white;font-size:22px;margin:0;font-weight:600;">Payment Reminder</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:${BRAND.muted};font-size:15px;margin:0 0 20px;line-height:1.6;">
              Dear <strong style="color:#1d2436;">${clientName}</strong>,
            </p>
            <p style="color:${BRAND.muted};font-size:15px;margin:0 0 24px;line-height:1.6;">
              This is a friendly reminder that your invoice <strong style="color:#1d2436;">${invoiceNumber}</strong> from ${invoiceDate} remains outstanding${daysSince ? ` (${daysSince} days)` : ''}. We would appreciate your prompt attention to this matter.
            </p>

            <!-- Invoice Summary -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:10px;border:1px solid ${BRAND.border};margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:13px;">Invoice</td>
                      <td style="padding:4px 0;text-align:right;font-weight:600;color:#1d2436;font-size:13px;">${invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:13px;">Service</td>
                      <td style="padding:4px 0;text-align:right;color:#1d2436;font-size:13px;">${service}</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding:12px 0 0;border-top:2px solid ${BRAND.gold};"></td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.navy};font-weight:700;font-size:15px;">Amount Due</td>
                      <td style="padding:4px 0;text-align:right;color:${BRAND.navy};font-weight:700;font-size:18px;">${amount} ${currency}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${paymentUrl || '#'}" style="display:inline-block;background:${BRAND.gold};color:white;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:15px;">
                    Pay Now — ${amount} ${currency} →
                  </a>
                </td>
              </tr>
            </table>

            <p style="color:${BRAND.muted};font-size:13px;margin:24px 0 0;line-height:1.5;">
              If you have already made this payment, please disregard this reminder. For any questions, contact us at <a href="mailto:${BRAND.email}" style="color:${BRAND.navy};">${BRAND.email}</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f8f5;padding:20px 32px;border-top:1px solid ${BRAND.border};text-align:center;">
            <p style="color:${BRAND.navy};font-weight:700;font-size:12px;letter-spacing:1px;margin:0 0 4px;">${BRAND.name}</p>
            <p style="color:${BRAND.muted};font-size:11px;margin:0;">${BRAND.tagline} · ${BRAND.address}</p>
            <p style="color:${BRAND.muted};font-size:11px;margin:4px 0 0;">${BRAND.email} · ${BRAND.phone}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}


// ── Main Send Function ───────────────────────────

async function main() {
    if (!toEmail) {
        console.error('Error: --to <email> is required');
        process.exit(1);
    }

    if (isTest) {
        // Send both test emails
        console.log('📧 Sending test invoice email...');
        const invoiceResult = await resend.emails.send({
            from: `Admireworks <${FROM_EMAIL}>`,
            to: [toEmail],
            subject: 'Admireworks — Invoice [TEST]',
            html: invoiceEmailHTML({
                clientName: 'Test Client',
                invoiceNumber: 'AWI-202603-TEST',
                invoiceDate: 'March 1, 2026',
                amount: '5,500',
                currency: 'AED',
                service: 'Full Marketing Retainer',
                invoiceUrl: 'https://ops.admireworks.com/Proposals/_Proposal-System/payments/invoices/AWI-202603-001/invoice.html',
                paymentUrl: '#',
            }),
        });
        console.log('  ✅ Invoice email sent:', invoiceResult.data?.id || invoiceResult);

        console.log('📧 Sending test reminder email...');
        const reminderResult = await resend.emails.send({
            from: `Admireworks <${FROM_EMAIL}>`,
            to: [toEmail],
            subject: 'Admireworks — Payment Reminder [TEST]',
            html: reminderEmailHTML({
                clientName: 'Test Client',
                invoiceNumber: 'AWI-202603-TEST',
                invoiceDate: 'March 1, 2026',
                amount: '5,500',
                currency: 'AED',
                service: 'Full Marketing Retainer',
                invoiceUrl: 'https://ops.admireworks.com/Proposals/_Proposal-System/payments/invoices/AWI-202603-001/invoice.html',
                paymentUrl: '#',
                daysSince: 7,
            }),
        });
        console.log('  ✅ Reminder email sent:', reminderResult.data?.id || reminderResult);
        return;
    }

    if (!invoiceNumber) {
        console.error('Error: --invoice <AWI-XXXXXX-XXX> is required');
        process.exit(1);
    }

    // Load invoice data from registry
    const registryPath = path.join(__dirname, '..', 'invoice-registry.csv');
    const registry = fs.readFileSync(registryPath, 'utf-8');
    const lines = registry.trim().split('\n');
    const headers = lines[0].split(',');
    const invoiceRow = lines.slice(1).find(line => line.startsWith(invoiceNumber));

    if (!invoiceRow) {
        console.error(`Error: Invoice ${invoiceNumber} not found in registry`);
        process.exit(1);
    }

    const fields = invoiceRow.split(',');
    const data = {};
    headers.forEach((h, i) => data[h] = fields[i] || '');

    // Load client data
    const clientPath = path.join(__dirname, '..', 'client-directory.csv');
    const clientCSV = fs.readFileSync(clientPath, 'utf-8');
    const clientLines = clientCSV.trim().split('\n');
    const clientHeaders = clientLines[0].split(',');
    const clientRow = clientLines.slice(1).find(line => line.includes(data.client_id));

    const client = {};
    if (clientRow) {
        // Handle CSV with quoted fields
        const clientFields = clientRow.match(/(".*?"|[^,]+)/g) || [];
        clientHeaders.forEach((h, i) => client[h] = (clientFields[i] || '').replace(/^"|"$/g, ''));
    }

    const emailTo = toEmail || client.contact_email;
    if (!emailTo) {
        console.error('Error: No email address found. Use --to <email>');
        process.exit(1);
    }

    const baseUrl = 'https://ops.admireworks.com';
    const invoiceUrl = `${baseUrl}${data.invoice_url}`;

    const emailData = {
        clientName: data.client_name || client.client_name,
        invoiceNumber: data.invoice_number,
        invoiceDate: data.invoice_date,
        amount: Number(data.amount).toLocaleString(),
        currency: data.currency,
        service: data.service,
        invoiceUrl,
        paymentUrl: data.stripe_link || '#',
    };

    const templateFn = isReminder ? reminderEmailHTML : invoiceEmailHTML;
    const subject = isReminder
        ? `Admireworks — Payment Reminder: ${data.invoice_number}`
        : `Admireworks — Invoice: ${data.invoice_number}`;

    if (isReminder) {
        const invoiceDate = new Date(data.invoice_date);
        emailData.daysSince = Math.floor((Date.now() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    console.log(`📧 Sending ${isReminder ? 'reminder' : 'invoice'} email to ${emailTo}...`);
    const result = await resend.emails.send({
        from: `Admireworks <${FROM_EMAIL}>`,
        to: [emailTo],
        subject,
        html: templateFn(emailData),
    });

    console.log('  ✅ Email sent:', result.data?.id || JSON.stringify(result));
}

main().catch(err => {
    console.error('❌ Error:', err.message || err);
    process.exit(1);
});
