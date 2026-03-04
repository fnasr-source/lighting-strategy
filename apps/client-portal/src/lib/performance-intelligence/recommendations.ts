import type {
  AiRecommendation,
  DashboardIntelligenceResponse,
} from '@/lib/performance-intelligence/types';

const pctDelta = (current: number, baseline: number): number => {
  if (!baseline) return current > 0 ? 100 : 0;
  return ((current - baseline) / baseline) * 100;
};

export function buildRecommendations(input: {
  clientId: string;
  kpiSnapshotId?: string;
  intelligence: DashboardIntelligenceResponse;
}): AiRecommendation[] {
  const recs: AiRecommendation[] = [];
  const { intelligence } = input;

  const avgRoas = intelligence.series.length > 0
    ? intelligence.series.reduce((acc, item) => acc + item.roas, 0) / intelligence.series.length
    : 0;

  const latest = intelligence.series[intelligence.series.length - 1];
  const prev = intelligence.series[intelligence.series.length - 2] ?? latest;

  if (avgRoas < 1.8) {
    recs.push({
      clientId: input.clientId,
      kpiSnapshotId: input.kpiSnapshotId,
      title: 'Rebalance budget toward efficient channels',
      action: 'Reduce spend on channels with efficiency below 1.3x and reallocate 15-25% budget to top two channels by efficiency.',
      priority: 1,
      confidence: 0.81,
      expectedImpact: 'Improve blended efficiency and lower wasted spend within 7-14 days.',
      category: 'budget',
      evidence: [
        {
          metric: 'roas',
          current: avgRoas,
          baseline: 2.1,
          deltaPct: pctDelta(avgRoas, 2.1),
          period: `${intelligence.from} to ${intelligence.to}`,
        },
      ],
      guardrails: ['Do not increase total spend by more than 20% in one week.', 'Keep learning campaigns active.'],
      status: 'active',
      createdAt: new Date().toISOString(),
      source: 'rules',
    });
  }

  const latestCvr = latest?.cvr ?? 0;
  const prevCvr = prev?.cvr ?? latestCvr;
  if (latestCvr < 0.015 || latestCvr < prevCvr) {
    recs.push({
      clientId: input.clientId,
      kpiSnapshotId: input.kpiSnapshotId,
      title: 'Improve conversion path quality',
      action: 'Launch landing-page and offer message test for the top-spend campaigns with declining CVR.',
      priority: 2,
      confidence: 0.74,
      expectedImpact: 'Recover conversion efficiency and reduce CPL/CAC drift.',
      category: 'landing_page',
      evidence: [
        {
          metric: 'conversion_rate',
          current: latestCvr,
          baseline: prevCvr,
          deltaPct: pctDelta(latestCvr, prevCvr),
          period: latest?.date ?? intelligence.to,
        },
      ],
      guardrails: ['Keep control variant live.', 'Limit simultaneous page experiments to two.'],
      status: 'active',
      createdAt: new Date().toISOString(),
      source: 'rules',
    });
  }

  if (intelligence.social.unresolved > 8 || intelligence.social.negativeShare > 0.2) {
    recs.push({
      clientId: input.clientId,
      kpiSnapshotId: input.kpiSnapshotId,
      title: 'Clear social-care backlog',
      action: 'Route negative and high-severity social interactions to support queue and enforce a 4-hour first-response SLA.',
      priority: 1,
      confidence: 0.77,
      expectedImpact: 'Reduce churn risk and improve audience trust signals.',
      category: 'social_care',
      evidence: [
        {
          metric: 'unresolved_social_interactions',
          current: intelligence.social.unresolved,
          baseline: 5,
          deltaPct: pctDelta(intelligence.social.unresolved, 5),
          period: `${intelligence.from} to ${intelligence.to}`,
        },
      ],
      guardrails: ['Escalate legal or fraud language immediately.', 'Close loop with visible public replies when relevant.'],
      status: 'active',
      createdAt: new Date().toISOString(),
      source: 'rules',
    });
  }

  if (recs.length === 0) {
    recs.push({
      clientId: input.clientId,
      kpiSnapshotId: input.kpiSnapshotId,
      title: 'Scale winning segments cautiously',
      action: 'Increase budget by 10% on top-performing segment and monitor efficiency daily.',
      priority: 3,
      confidence: 0.62,
      expectedImpact: 'Capture incremental volume while protecting blended efficiency.',
      category: 'budget',
      evidence: [
        {
          metric: 'efficiency_index',
          current: intelligence.executive.efficiencyIndex,
          baseline: 65,
          deltaPct: pctDelta(intelligence.executive.efficiencyIndex, 65),
          period: `${intelligence.from} to ${intelligence.to}`,
        },
      ],
      guardrails: ['Pause scaling if efficiency drops >10% for 3 consecutive days.'],
      status: 'active',
      createdAt: new Date().toISOString(),
      source: 'rules',
    });
  }

  return recs;
}
