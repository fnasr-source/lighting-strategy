import { NextRequest, NextResponse } from 'next/server';
import { isSchedulingManager, verifyApiUser } from '@/lib/api-auth';
import { adminDb } from '@/lib/firebase-admin';
import { sanitizeOnboardingResponses, type ClientOnboardingAdminSummary } from '@/lib/onboarding';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyApiUser(req.headers.get('authorization'));
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!isSchedulingManager(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const clientId = req.nextUrl.searchParams.get('clientId');
        const snap = await adminDb.collection('clientOnboardingForms').orderBy('updatedAt', 'desc').get();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://my.admireworks.com';

        const forms = await Promise.all(
            snap.docs
                .filter((doc) => !clientId || doc.data().clientId === clientId)
                .map(async (doc) => {
                const data = doc.data();
                const versionsSnap = await doc.ref
                    .collection('versions')
                    .orderBy('versionNumber', 'desc')
                    .limit(8)
                    .get();

                const summary: ClientOnboardingAdminSummary = {
                    id: doc.id,
                    clientId: data.clientId,
                    clientName: data.clientName,
                    slug: data.slug,
                    accessKey: data.accessKey,
                    language: data.language,
                    platform: data.platform,
                    status: data.status || 'draft',
                    versionCount: Number(data.versionCount || 0),
                    latestVersionNumber: Number(data.latestVersionNumber || 0),
                    lastVersionAt: data.lastVersionAt || null,
                    lastSavedAt: data.lastSavedAt || null,
                    submittedAt: data.submittedAt || null,
                    submissionCount: Number(data.submissionCount || 0),
                    publicUrl: `${baseUrl}/onboarding/${data.accessKey}`,
                    responses: sanitizeOnboardingResponses(data.responses),
                    fieldStates: data.fieldStates || {},
                    recentVersions: versionsSnap.docs.map((versionDoc) => ({
                        id: versionDoc.id,
                        ...(versionDoc.data() as Omit<ClientOnboardingAdminSummary['recentVersions'][number], 'id'>),
                    })),
                };

                return summary;
                })
        );

        return NextResponse.json({ forms });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load onboarding admin summaries' },
            { status: 500 }
        );
    }
}
