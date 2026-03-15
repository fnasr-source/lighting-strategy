import ArtifactCollectionPage from '@/components/client-artifacts/ArtifactCollectionPage';

export default function CampaignFlowsPage() {
    return (
        <ArtifactCollectionPage
            artifactType="campaign_flow"
            title="Campaign Flows"
            subtitle="Approved funnel, nurture, and execution flows shared with the client."
            emptyTitle="No campaign flows yet"
            emptyDescription="Campaign flows show up here after the approved client-safe version is published from the internal workspace."
            pageHint="This page is for client-facing flow snapshots. Keep the full research, strategy, and working drafts inside admireworks-internal-os."
            defaultLocale="ar"
        />
    );
}
