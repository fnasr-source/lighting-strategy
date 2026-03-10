import admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import {
    getOnboardingFieldById,
    sanitizeOnboardingResponses,
    type ClientOnboardingForm,
    type ClientOnboardingResponses,
} from '@/lib/onboarding';

type VersionReason = 'seeded' | 'draft_saved' | 'submitted' | 'resubmitted';
type ActorType = 'system_seed' | 'client_public' | 'internal_admin';

function diffChangedFieldIds(
    before: ClientOnboardingResponses,
    after: ClientOnboardingResponses
) {
    return Object.keys(after).filter((fieldId) => (before[fieldId] || '') !== (after[fieldId] || ''));
}

export async function writeOnboardingVersion(args: {
    formRef: FirebaseFirestore.DocumentReference;
    responses: ClientOnboardingResponses;
    reason: VersionReason;
    actorType: ActorType;
    status?: 'draft' | 'submitted';
    savedAt: string;
    submittedAt?: string;
    lastNotifiedAt?: string;
    forceVersion?: boolean;
    submissionIncrement?: number;
}) {
    return adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(args.formRef);
        if (!snap.exists) {
            throw new Error('Onboarding form not found');
        }

        const current = snap.data() as ClientOnboardingForm;
        const previousResponses = sanitizeOnboardingResponses(current.responses);
        const nextResponses = sanitizeOnboardingResponses(args.responses);
        const changedFieldIds = diffChangedFieldIds(previousResponses, nextResponses);
        const previousStatus = current.status || 'draft';
        const nextStatus = args.status || previousStatus;
        const previousSubmissionCount = Number(current.submissionCount || 0);
        const nextSubmissionCount = previousSubmissionCount + Number(args.submissionIncrement || 0);
        const shouldVersion = Boolean(
            args.forceVersion ||
            changedFieldIds.length > 0 ||
            previousStatus !== nextStatus ||
            previousSubmissionCount !== nextSubmissionCount
        );

        const baseUpdate: Record<string, unknown> = {
            responses: nextResponses,
            status: nextStatus,
            lastSavedAt: args.savedAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (typeof args.submittedAt === 'string') {
            baseUpdate.submittedAt = args.submittedAt;
        }
        if (typeof args.lastNotifiedAt === 'string') {
            baseUpdate.lastNotifiedAt = args.lastNotifiedAt;
        }
        if (args.submissionIncrement) {
            baseUpdate.submissionCount = nextSubmissionCount;
        }

        if (!shouldVersion) {
            tx.update(args.formRef, baseUpdate);
            return {
                versionNumber: Number(current.latestVersionNumber || 0),
                versionCount: Number(current.versionCount || 0),
                changedFieldIds,
                responses: nextResponses,
                current,
            };
        }

        const nextVersionNumber = Number(current.latestVersionNumber || current.versionCount || 0) + 1;
        const versionRef = args.formRef.collection('versions').doc(`v${String(nextVersionNumber).padStart(4, '0')}`);
        const changedFields = changedFieldIds
            .map((fieldId) => ({ fieldId, field: getOnboardingFieldById(fieldId) }))
            .filter((item) => item.field);

        tx.update(args.formRef, {
            ...baseUpdate,
            latestVersionNumber: nextVersionNumber,
            versionCount: nextVersionNumber,
            lastVersionAt: args.savedAt,
        });

        tx.set(versionRef, {
            versionNumber: nextVersionNumber,
            reason: args.reason,
            actorType: args.actorType,
            savedAt: args.savedAt,
            changedFieldIds,
            changedFieldLabelsAr: changedFields.map((item) => item.field!.labelAr),
            changedFieldLabelsEn: changedFields.map((item) => item.field!.labelEn),
            statusBefore: previousStatus,
            statusAfter: nextStatus,
            submissionCountBefore: previousSubmissionCount,
            submissionCountAfter: nextSubmissionCount,
            responses: nextResponses,
            clientId: current.clientId,
            clientName: current.clientName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
            versionNumber: nextVersionNumber,
            versionCount: nextVersionNumber,
            changedFieldIds,
            responses: nextResponses,
            current,
        };
    });
}
