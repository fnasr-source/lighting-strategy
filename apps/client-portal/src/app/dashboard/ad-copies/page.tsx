import ArtifactCollectionPage from '@/components/client-artifacts/ArtifactCollectionPage';

export default function AdCopiesPage() {
    return (
        <ArtifactCollectionPage
            artifactType="ad_copy"
            title="Ad Copies"
            subtitle="Approved ad-copy bundles and creative messaging snapshots for client review."
            emptyTitle="No ad-copy bundles yet"
            emptyDescription="Keep copy drafts in the internal workspace and publish only the client-safe bundle here."
            pageHint="Ad copies, email sequences, and WhatsApp scripts should be authored in `clients/{slug}/messaging/` and published here only after review."
            defaultLocale="ar"
        />
    );
}
