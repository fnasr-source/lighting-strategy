import ArtifactCollectionPage from '@/components/client-artifacts/ArtifactCollectionPage';

export default function ReportsPage() {
    return (
        <ArtifactCollectionPage
            artifactType="report"
            title="Reports"
            subtitle="Approved performance and review snapshots published from the internal OS."
            emptyTitle="No reports yet"
            emptyDescription="Reports appear here only after they are published from the internal workspace."
            pageHint="Use the internal client workspace as the source of truth. Publish only client-safe report snapshots into the portal."
            defaultLocale="en"
        />
    );
}
