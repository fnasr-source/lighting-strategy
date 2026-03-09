import { NextRequest, NextResponse } from 'next/server';
import { syncFinanceAlerts } from '@/lib/finance-admin';
import { getSecret } from '@/lib/secrets';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'admireworks-cron-2026';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncFinanceAlerts();

  const resendKey = await getSecret('RESEND_API_KEY');
  if (resendKey && result.settings.digestRecipients.length > 0 && result.alerts.length > 0) {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@admireworks.com';
    const summary = result.alerts
      .map((alert) => `<li><strong>${alert.title}</strong><br>${alert.description}</li>`)
      .join('');

    await resend.emails.send({
      from: `Admireworks <${fromEmail}>`,
      to: result.settings.digestRecipients,
      subject: `Finance Alerts Digest — ${new Date().toISOString().slice(0, 10)}`,
      html: `<div style="font-family:Arial,sans-serif"><h2>Finance Alerts</h2><ul>${summary}</ul></div>`,
    });
  }

  return NextResponse.json({ success: true, alerts: result.alerts.length });
}
