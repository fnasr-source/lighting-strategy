export type BusinessType = 'ecommerce' | 'lead_gen' | 'hybrid' | 'saas';

export type SupportedPlatform =
  | 'meta_ads'
  | 'google_ads'
  | 'tiktok_ads'
  | 'ga4'
  | 'shopify'
  | 'woocommerce'
  | 'meta_social';

export type PlatformType = 'ad' | 'analytics' | 'ecommerce' | 'social';

export type IntelligenceView = 'executive' | 'channel' | 'social' | 'funnel';

export type IntelligenceGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface IntegrationCredentialRef {
  provider: 'firestore';
  key: string;
  version: number;
  maskedFields?: string[];
  updatedAt?: string;
}

export interface IngestionJob {
  id?: string;
  clientId: string;
  platform: SupportedPlatform;
  scope: 'platform_sync' | 'social_listening' | 'reconciliation';
  mode: 'hourly' | 'backfill' | 'manual';
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'success' | 'partial' | 'error';
  rowsRead: number;
  rowsWritten: number;
  errorCount: number;
  errors?: string[];
  cursor?: string;
  request?: {
    from?: string;
    to?: string;
    granularity?: IntelligenceGranularity;
  };
  metadata?: Record<string, string | number | boolean>;
}

export interface CanonicalMetricRow {
  id?: string;
  clientId: string;
  platform: SupportedPlatform;
  platformType: PlatformType;
  date: string;
  hour?: number;
  timezone: string;
  granularity: 'hourly' | 'daily';
  attributionModel: 'canonical_last_click_7d' | 'platform_native';
  nativeCurrency: string;
  normalizedCurrency: string;
  fxRate: number;
  spendNative: number;
  spendNormalized: number;
  revenueNative: number;
  revenueNormalized: number;
  impressions: number;
  clicks: number;
  sessions: number;
  leads: number;
  orders: number;
  conversions: number;
  qualifiedLeads: number;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SocialInteraction {
  id?: string;
  clientId: string;
  platform: SupportedPlatform;
  platformType: 'social';
  channel: 'facebook' | 'instagram' | 'messenger' | 'other';
  interactionType: 'comment' | 'dm' | 'mention';
  conversationId?: string;
  externalId: string;
  authorHandle?: string;
  authorName?: string;
  message: string;
  language: string;
  sentimentScore: number;
  sentimentLabel: 'positive' | 'neutral' | 'negative';
  topics: string[];
  severity: 'low' | 'medium' | 'high';
  isResolved: boolean;
  occurredAt: string;
  mediaUrl?: string;
  permalink?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SocialConversation {
  id?: string;
  clientId: string;
  platform: SupportedPlatform;
  channel: 'facebook' | 'instagram' | 'messenger' | 'other';
  conversationId: string;
  participantKey: string;
  latestMessage: string;
  latestMessageAt: string;
  interactionCount: number;
  unresolvedCount: number;
  sentimentScore: number;
  sentimentLabel: 'positive' | 'neutral' | 'negative';
  dominantTopics: string[];
  firstResponseAt?: string;
  responseSlaMinutes?: number;
  status: 'open' | 'closed' | 'escalated';
  updatedAt?: string;
}

export interface KpiSnapshot {
  id?: string;
  clientId: string;
  businessType: BusinessType;
  timeframe: string;
  granularity: IntelligenceGranularity;
  attributionModel: 'canonical_last_click_7d';
  currency: string;
  kpis: {
    spend: number;
    value: number;
    efficiencyIndex: number;
    conversionEfficiency: number;
    pacing: number;
    healthScore: number;
    alertCount: number;
    roas?: number;
    merProxy?: number;
    cacProxy?: number;
    aov?: number;
    cvr?: number;
    leads?: number;
    cpl?: number;
    cpc?: number;
    costPerQualifiedLeadProxy?: number;
  };
  trends: Array<{
    date: string;
    spend: number;
    value: number;
    conversions: number;
    roas: number;
    cvr: number;
  }>;
  channels: Array<{
    platform: SupportedPlatform;
    spend: number;
    value: number;
    conversions: number;
    share: number;
    efficiency: number;
  }>;
  funnel: {
    impressions: number;
    clicks: number;
    sessions: number;
    leads: number;
    orders: number;
    qualifiedLeads: number;
  };
  generatedAt: string;
  source: 'computed';
}

export interface ClientHealthScore {
  id?: string;
  clientId: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  components: {
    efficiency: number;
    conversion: number;
    pacing: number;
    socialSentiment: number;
    dataFreshness: number;
  };
  topRisks: string[];
  topOpportunities: string[];
  generatedAt: string;
}

export interface AiRecommendation {
  id?: string;
  clientId: string;
  kpiSnapshotId?: string;
  title: string;
  action: string;
  priority: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  expectedImpact: string;
  category: 'budget' | 'creative' | 'targeting' | 'landing_page' | 'social_care' | 'data_quality';
  evidence: Array<{
    metric: string;
    current: number;
    baseline: number;
    deltaPct: number;
    period: string;
  }>;
  guardrails: string[];
  status: 'active' | 'dismissed' | 'applied';
  createdAt: string;
  source: 'rules' | 'gemini';
}

export interface DashboardIntelligenceResponse {
  success: boolean;
  clientId: string;
  from: string;
  to: string;
  granularity: IntelligenceGranularity;
  view: IntelligenceView;
  currency: string;
  attributionModel: 'canonical_last_click_7d';
  executive: {
    healthScore: number;
    spend: number;
    value: number;
    efficiencyIndex: number;
    conversionEfficiency: number;
    pacing: number;
    topRisks: string[];
    topOpportunities: string[];
  };
  channels: Array<{
    platform: SupportedPlatform;
    spend: number;
    value: number;
    conversions: number;
    share: number;
    efficiency: number;
  }>;
  funnel: {
    impressions: number;
    clicks: number;
    sessions: number;
    leads: number;
    orders: number;
    qualifiedLeads: number;
    clickThroughRate: number;
    conversionRate: number;
  };
  social: {
    interactions: number;
    unresolved: number;
    negativeShare: number;
    sentimentScore: number;
    topTopics: Array<{ topic: string; count: number }>;
    slaBreaches: number;
  };
  series: Array<{
    date: string;
    spend: number;
    value: number;
    conversions: number;
    roas: number;
    cvr: number;
  }>;
  generatedAt: string;
}
