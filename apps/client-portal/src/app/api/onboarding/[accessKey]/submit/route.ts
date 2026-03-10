import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import { checkRateLimit } from '@/lib/scheduling/rate-limit';
import {
    einAbayaOnboardingSections,
    sanitizeOnboardingResponsePatch,
    sanitizeOnboardingResponses,
    validateOnboardingResponses,
} from '@/lib/onboarding';
import { sendOnboardingSubmittedEmail } from '@/lib/onboarding-emails';

function getClientIp(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    );
}

async function getFormByAccessKey(accessKey: string) {
    const snap = await adminDb
        .collection('clientOnboardingForms')
        .where('accessKey', '==', accessKey)
        .limit(1)
        .get();

    if (snap.empty) return null;
    return snap.docs[0] || null;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ accessKey: string }> }
) {
    try {
        const { accessKey } = await params;
        const ip = getClientIp(req);
        const rate = await checkRateLimit({
            key: `onboarding:submit:${accessKey}:${ip}`,
            maxRequests: 8,
            windowMinutes: 60,
        });

        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Too many submission attempts. Please try again later.' },
                { status: 429 }
            );
        }

        const formDoc = await getFormByAccessKey(accessKey);
        if (!formDoc) {
            return NextResponse.json({ error: 'Onboarding form not found' }, { status: 404 });
        }

        const body = (await req.json()) as { responses?: Record<string, unknown> };
        const current = formDoc.data();
        const mergedResponses = sanitizeOnboardingResponses({
            ...sanitizeOnboardingResponses(current.responses),
            ...sanitizeOnboardingResponsePatch(body.responses),
        });

        const validation = validateOnboardingResponses(mergedResponses);
        if (!validation.valid) {
            return NextResponse.json(
                {
                    error: 'Please complete the required fields before submitting.',
                    missingFields: validation.missingFields,
                    invalidFields: validation.invalidFields,
                },
                { status: 400 }
            );
        }

        const submittedAt = new Date().toISOString();
        const nextSubmissionCount = Number(current.submissionCount || 0) + 1;

        await formDoc.ref.update({
            responses: mergedResponses,
            status: 'submitted',
            submissionCount: nextSubmissionCount,
            lastSavedAt: submittedAt,
            submittedAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://my.admireworks.com';
        try {
            await sendOnboardingSubmittedEmail({
                clientName: current.clientName || 'Ein Abaya',
                recipients: Array.isArray(current.notificationEmails)
                    ? current.notificationEmails
                    : [process.env.RESEND_FROM_EMAIL || 'hello@admireworks.com'],
                sections: einAbayaOnboardingSections,
                responses: mergedResponses,
                status: 'submitted',
                submittedAt,
                accessUrl: `${baseUrl}/onboarding/${accessKey}`,
                submissionCount: nextSubmissionCount,
            });

            await formDoc.ref.update({
                lastNotifiedAt: submittedAt,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (emailErr) {
            console.error('Onboarding notification failed:', emailErr);
        }

        return NextResponse.json({
            ok: true,
            status: 'submitted',
            submittedAt,
            submissionCount: nextSubmissionCount,
        });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to submit onboarding form' },
            { status: 500 }
        );
    }
}
