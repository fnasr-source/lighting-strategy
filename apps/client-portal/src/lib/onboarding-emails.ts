import { getSecret } from '@/lib/secrets';
import { Resend } from 'resend';
import type { ClientOnboardingResponses, OnboardingSection } from '@/lib/onboarding';

function getFromEmail() {
    return process.env.RESEND_FROM_EMAIL || 'hello@admireworks.com';
}

function formatDate(iso?: string) {
    if (!iso) return 'N/A';
    try {
        return new Date(iso).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

function emailShell(content: string) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 16px;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;">
        <tr>
          <td style="background:#183328;padding:22px 28px;border-radius:18px 18px 0 0;">
            <table width="100%"><tr>
              <td>
                <span style="display:inline-block;width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.08);text-align:center;line-height:38px;color:#d6b16c;font-weight:800;">AW</span>
                <span style="color:#f6efe2;font-weight:700;font-size:15px;margin-left:10px;vertical-align:middle;">ADMIREWORKS</span>
              </td>
              <td style="text-align:right;color:rgba(246,239,226,0.7);font-size:12px;">Ein Abaya Onboarding</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background:#fffdfa;padding:28px;border-radius:0 0 18px 18px;border:1px solid #e7dfd3;border-top:none;">
            ${content}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildSectionSummary(sections: OnboardingSection[], responses: ClientOnboardingResponses) {
    return sections.map((section) => {
        const answered = section.fields
            .filter((field) => (responses[field.id] || '').trim())
            .slice(0, 4)
            .map((field) => {
                const value = responses[field.id].trim().replace(/\n+/g, ' ');
                const preview = value.length > 120 ? `${value.slice(0, 120)}...` : value;
                return `<li style="margin-bottom:8px;"><strong>${field.labelEn}:</strong> ${preview}</li>`;
            })
            .join('');

        return `<div style="margin:18px 0 0;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#183328;">${section.titleEn}</p>
            <p style="margin:0 0 10px;color:#6b7280;font-size:12px;">${section.titleAr}</p>
            <ul style="margin:0;padding-left:18px;color:#334155;font-size:13px;">
              ${answered || '<li>No preview available in this section.</li>'}
            </ul>
          </div>`;
    }).join('');
}

export async function sendOnboardingSubmittedEmail(args: {
    clientName: string;
    recipients: string[];
    sections: OnboardingSection[];
    responses: ClientOnboardingResponses;
    status: 'draft' | 'submitted';
    submittedAt?: string;
    accessUrl: string;
    submissionCount?: number;
}) {
    const apiKey = await getSecret('RESEND_API_KEY');
    if (!apiKey) {
        console.log('No RESEND_API_KEY — skipping onboarding notification');
        return;
    }

    const to = Array.from(new Set(args.recipients.filter(Boolean)));
    if (to.length === 0) return;

    const resend = new Resend(apiKey);
    const html = emailShell(`
      <h2 style="margin:0 0 12px;color:#183328;">Ein Abaya onboarding ${args.status === 'submitted' ? 'submitted' : 'updated'}</h2>
      <p style="margin:0 0 10px;color:#475569;">The public onboarding form for <strong>${args.clientName}</strong> has been ${args.status === 'submitted' ? 'submitted' : 'saved'}.</p>
      <p style="margin:0 0 8px;color:#475569;"><strong>When:</strong> ${formatDate(args.submittedAt)}</p>
      <p style="margin:0 0 8px;color:#475569;"><strong>Submission count:</strong> ${args.submissionCount || 1}</p>
      <p style="margin:0 0 16px;color:#475569;"><a href="${args.accessUrl}" style="color:#183328;font-weight:700;">Open onboarding form</a></p>
      <div style="padding:16px 18px;border-radius:14px;background:#f7f2e8;border:1px solid #eadfcd;">
        <p style="margin:0 0 10px;font-weight:700;color:#183328;">Quick preview</p>
        ${buildSectionSummary(args.sections, args.responses)}
      </div>
    `);

    await resend.emails.send({
        from: `Admireworks <${getFromEmail()}>`,
        to,
        subject: `Ein Abaya onboarding ${args.status === 'submitted' ? 'submitted' : 'updated'}`,
        html,
    });
}
