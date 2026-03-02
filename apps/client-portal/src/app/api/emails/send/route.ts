import { NextRequest, NextResponse } from 'next/server';

/**
 * General email sending API — for notifications, confirmations, etc.
 * POST /api/emails/send
 * Body: { to, subject, html, type? }
 */
export async function POST(req: NextRequest) {
    try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@admireworks.com';

        const { to, subject, html, text } = await req.json();
        if (!to || !subject) return NextResponse.json({ error: 'Missing to or subject' }, { status: 400 });

        const result = await resend.emails.send({
            from: `Admireworks <${fromEmail}>`,
            to: Array.isArray(to) ? to : [to],
            subject,
            html: html || `<p>${text || ''}</p>`,
        });

        return NextResponse.json({ success: true, emailId: result.data?.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
