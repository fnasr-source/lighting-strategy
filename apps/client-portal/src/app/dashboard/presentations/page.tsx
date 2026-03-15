import ArtifactCollectionPage from '@/components/client-artifacts/ArtifactCollectionPage';

export default function PresentationsPage() {
    return (
        <ArtifactCollectionPage
            artifactType="strategy_presentation"
            title="Presentations"
            subtitle="Client-facing presentations hosted under ops.admireworks.com and tracked from the internal OS."
            emptyTitle="No presentations published yet"
            emptyDescription="Presentations stay in the internal workspace until an approved deck is published to ops.admireworks.com."
            pageHint="Use the qafza-derived presentation engine inside the internal client workspace. Publish the approved deck URL here after review."
            defaultLocale="ar"
        />
    );
}
