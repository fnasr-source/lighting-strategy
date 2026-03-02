/**
 * Send Ein Abaya invoice email using existing branded template
 * Usage: node send-ein-abaya-email.mjs
 */
import { Resend } from 'resend';

const resend = new Resend('re_8S9k9i6y_6VJCNF9UpnwhXcwQBHVjQYpV');
const FROM_EMAIL = 'hello@admireworks.com';

const BRAND = {
    navy: '#001a70',
    gold: '#cc9f53',
    bg: '#f8f7f4',
    white: '#ffffff',
    muted: '#5d6475',
    border: '#e3e0d8',
};

const INVOICE_URL = 'https://my.admireworks.com/invoice/AWI-202603-002';

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${BRAND.white};border-radius:12px;border:1px solid ${BRAND.border};overflow:hidden;">
        
        <!-- Header -->
        <tr>
          <td style="background:${BRAND.navy};padding:28px 32px;text-align:center;">
            <p style="color:${BRAND.gold};font-size:12px;letter-spacing:2px;margin:0 0 4px;text-transform:uppercase;">ADMIREWORKS</p>
            <h1 style="color:white;font-size:22px;margin:0;font-weight:600;">Growth Partnership — Invoice</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:${BRAND.muted};font-size:15px;margin:0 0 20px;line-height:1.6;">
              Dear <strong style="color:#1d2436;">Awatef</strong>,
            </p>
            <p style="color:${BRAND.muted};font-size:15px;margin:0 0 8px;line-height:1.6;">
              Greetings. We hope you are doing well.
            </p>
            <p style="color:${BRAND.muted};font-size:15px;margin:0 0 24px;line-height:1.6;">
              Following our discussion, please find below your invoice for the <strong style="color:#1d2436;">Ein Abaya Growth Partnership</strong> — Ramadan Special Package.
            </p>

            <!-- Invoice Details Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:10px;border:1px solid ${BRAND.border};margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:13px;">Invoice Number</td>
                      <td style="padding:4px 0;text-align:right;font-weight:600;color:#1d2436;font-size:13px;">AWI-202603-002</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:13px;">Invoice Date</td>
                      <td style="padding:4px 0;text-align:right;color:#1d2436;font-size:13px;">2 March 2026</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:13px;">Package</td>
                      <td style="padding:4px 0;text-align:right;color:#1d2436;font-size:13px;">Growth Partnership — Ramadan Special</td>
                    </tr>
                    <tr><td colspan="2" style="padding:8px 0 0;"></td></tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:12px;">Full Custom Website Rebuild</td>
                      <td style="padding:4px 0;text-align:right;font-size:12px;font-weight:500;">24,000 SAR</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:12px;">90-Day Marketing Strategy & Roadmap</td>
                      <td style="padding:4px 0;text-align:right;font-size:12px;color:#059669;font-weight:600;">FREE</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:12px;">Month 1: Full Paid Ads Management</td>
                      <td style="padding:4px 0;text-align:right;font-size:12px;color:#059669;font-weight:600;">FREE</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:12px;">Precision Tracking A-Z (Pixel, CAPI, GA4, GTM)</td>
                      <td style="padding:4px 0;text-align:right;font-size:12px;color:#059669;font-weight:600;">FREE</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:12px;">SEO Foundation & Data Migration</td>
                      <td style="padding:4px 0;text-align:right;font-size:12px;color:#059669;font-weight:600;">Included</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding:12px 0 0;border-top:1px solid ${BRAND.border};"></td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.muted};font-size:13px;">Market Value</td>
                      <td style="padding:4px 0;text-align:right;color:#999;font-size:13px;text-decoration:line-through;">42,000 SAR</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:#059669;font-size:13px;font-weight:600;">Ramadan Discount</td>
                      <td style="padding:4px 0;text-align:right;color:#059669;font-size:13px;font-weight:600;">-4,000 SAR</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding:12px 0 0;border-top:2px solid ${BRAND.gold};"></td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:${BRAND.navy};font-weight:700;font-size:15px;">Total Due</td>
                      <td style="padding:4px 0;text-align:right;color:${BRAND.navy};font-weight:700;font-size:18px;">20,000 SAR</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Payment Options -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border-radius:10px;border:1px solid #d0d8f0;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 6px;font-weight:700;font-size:13px;color:${BRAND.navy};">💳 Payment Options</p>
                  <p style="margin:0 0 3px;font-size:12px;color:${BRAND.muted};">A: Full Payment — 20,000 SAR</p>
                  <p style="margin:0;font-size:12px;color:${BRAND.muted};">B: 50% Upfront (10,000 SAR) + 50% on Delivery</p>
                </td>
              </tr>
            </table>

            <!-- CTA Buttons -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="${INVOICE_URL}" style="display:inline-block;background:${BRAND.navy};color:white;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:15px;">
                    View Invoice & Pay →
                  </a>
                </td>
              </tr>
            </table>

            <p style="color:${BRAND.muted};font-size:13px;margin:24px 0 0;line-height:1.5;text-align:center;">
              🔒 Payments are processed securely via Stripe
            </p>

            <p style="color:${BRAND.muted};font-size:13px;margin:16px 0 0;line-height:1.5;">
              Once payment is completed, please share confirmation and we will schedule kickoff immediately.
            </p>
            <p style="color:${BRAND.muted};font-size:13px;margin:8px 0 0;line-height:1.5;">
              If you have any questions or need any clarification, please let us know.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f8f5;padding:20px 32px;border-top:1px solid ${BRAND.border};text-align:center;">
            <p style="color:${BRAND.navy};font-weight:700;font-size:12px;letter-spacing:1px;margin:0 0 4px;">ADMIREWORKS</p>
            <p style="color:${BRAND.muted};font-size:11px;margin:0;">Admirable Venture Services · P.O.Box/36846, DXB, UAE</p>
            <p style="color:${BRAND.muted};font-size:11px;margin:4px 0 0;">hello@admireworks.com · (+971) 4295 8666</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// Preview mode — save as HTML first so user can review before sending
import { writeFileSync } from 'fs';
writeFileSync('/tmp/ein-abaya-invoice-email.html', html);
console.log('✅ Email HTML preview saved to: /tmp/ein-abaya-invoice-email.html');
console.log('');
console.log('Subject: Admireworks × Ein Abaya — Growth Partnership Invoice');
console.log('To: ceo@einabayaa.com');
console.log('From: Admireworks <hello@admireworks.com>');
console.log('');
console.log('To send, uncomment the send block below and run again.');

/*
// UNCOMMENT TO SEND:
const result = await resend.emails.send({
    from: `Admireworks <${FROM_EMAIL}>`,
    to: 'ceo@einabayaa.com',
    subject: 'Admireworks × Ein Abaya — Growth Partnership Invoice',
    html,
});
console.log('✅ Email sent:', JSON.stringify(result.data));
*/

process.exit(0);
