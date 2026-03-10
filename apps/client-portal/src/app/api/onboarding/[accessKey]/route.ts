import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import { checkRateLimit } from '@/lib/scheduling/rate-limit';
import {
    einAbayaOnboardingSections,
    sanitizeOnboardingResponsePatch,
    sanitizeOnboardingResponses,
} from '@/lib/onboarding';

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

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ accessKey: string }> }
) {
    try {
        const { accessKey } = await params;
        const formDoc = await getFormByAccessKey(accessKey);

        if (!formDoc) {
            return NextResponse.json({ error: 'Onboarding form not found' }, { status: 404 });
        }

        const data = formDoc.data();

        return NextResponse.json({
            form: {
                id: formDoc.id,
                clientName: data.clientName,
                slug: data.slug,
                language: data.language,
                platform: data.platform,
                status: data.status,
                responses: sanitizeOnboardingResponses(data.responses),
                fieldStates: data.fieldStates || {},
                lastSavedAt: data.lastSavedAt || null,
                submittedAt: data.submittedAt || null,
                submissionCount: data.submissionCount || 0,
            },
            schema: {
                titleAr: 'استبيان الانطلاق لعين عباية',
                titleEn: 'Ein Abaya Kickoff Brief',
                introAr: 'قمنا بتعبئة ما عرفناه من الاجتماعات السابقة. رجاءً راجعوا الحقول، عدّلوا ما يلزم، وأكملوا العناصر الناقصة حتى نبدأ بسرعة.',
                introEn: 'We pre-filled this from earlier meetings. Please review, edit what is needed, and complete the missing items so we can start quickly.',
                sections: einAbayaOnboardingSections,
            },
        });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load onboarding form' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ accessKey: string }> }
) {
    try {
        const { accessKey } = await params;
        const ip = getClientIp(req);
        const rate = await checkRateLimit({
            key: `onboarding:save:${accessKey}:${ip}`,
            maxRequests: 40,
            windowMinutes: 15,
        });

        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Too many save attempts. Please wait and try again.' },
                { status: 429 }
            );
        }

        const formDoc = await getFormByAccessKey(accessKey);
        if (!formDoc) {
            return NextResponse.json({ error: 'Onboarding form not found' }, { status: 404 });
        }

        const body = (await req.json()) as { responses?: Record<string, unknown> };
        const nextResponses = sanitizeOnboardingResponsePatch(body.responses);
        const current = formDoc.data();
        const mergedResponses = sanitizeOnboardingResponses({
            ...sanitizeOnboardingResponses(current.responses),
            ...nextResponses,
        });

        const savedAt = new Date().toISOString();

        await formDoc.ref.update({
            responses: mergedResponses,
            lastSavedAt: savedAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            ok: true,
            lastSavedAt: savedAt,
            status: current.status || 'draft',
        });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to save onboarding form' },
            { status: 500 }
        );
    }
}
