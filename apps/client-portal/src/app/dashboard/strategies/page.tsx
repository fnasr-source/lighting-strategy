import ArtifactCollectionPage from '@/components/client-artifacts/ArtifactCollectionPage';

export default function StrategiesPage() {
    return (
        <ArtifactCollectionPage
            artifactType="strategy_doc"
            title="Strategies"
            subtitle="Canonical written strategy documents published out of admireworks-internal-os."
            emptyTitle="No strategy documents yet"
            emptyDescription="Write and refine strategy inside the internal workspace, then publish the approved version here."
            pageHint="Client repos should consume execution-safe handoff specs only. Full strategy thinking stays in the internal client workspace."
            defaultLocale="ar"
        />
    );
}
