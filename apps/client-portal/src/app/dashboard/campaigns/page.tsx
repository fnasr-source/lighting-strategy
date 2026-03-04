'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  clientsService,
  ingestionJobsService,
  platformConnectionsService,
  type Client,
  type PlatformConnection,
} from '@/lib/firestore';
import type {
  AiRecommendation,
  DashboardIntelligenceResponse,
} from '@/lib/performance-intelligence/types';
import {
  ChannelContributionChart,
  ForecastChart,
  FunnelChart,
  SocialBacklogChart,
  SpendOutcomeChart,
  TimeSeriesChart,
  TopicHeatmap,
  formatMoney,
  formatPercent,
  type ChartConfig,
} from './IntelligenceCharts';
import LegacyCampaignsPage from './LegacyCampaignsPage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Activity,
  AlertTriangle,
  Brain,
  CircleDollarSign,
  Gauge,
  Globe,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Signal,
  SlidersHorizontal,
} from 'lucide-react';

type ClientExtended = Client & {
  dashboardFallbackLegacy?: boolean;
  timezone?: string;
  isDemo?: boolean;
  performanceDashboardVersion?: 'legacy' | 'intelligence';
};

type DatePreset = '7d' | '30d' | '90d';

type MediaFeedItem = {
  id: string;
  type: 'creative' | 'social';
  platform: string;
  title: string;
  text: string;
  mediaUrl: string;
  occurredAt: string;
  engagementScore: number;
};

const TIME_PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

function getRangeFromPreset(preset: DatePreset): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  from.setDate(to.getDate() - days);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const SERIES_CONFIG: ChartConfig[] = [
  { id: 'series-spend', title: 'Spend', dataKey: 'spend', color: '#ef4444' },
  { id: 'series-value', title: 'Value', dataKey: 'value', color: '#16a34a' },
  { id: 'series-conversions', title: 'Conversions', dataKey: 'conversions', color: '#2563eb' },
];

export default function CampaignsPage() {
  const { hasPermission, isClient, isAdmin, profile } = useAuth();

  const [clients, setClients] = useState<ClientExtended[]>([]);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingSocial, setSyncingSocial] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [intelligence, setIntelligence] = useState<DashboardIntelligenceResponse | null>(null);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [mediaFeed, setMediaFeed] = useState<MediaFeedItem[]>([]);
  const [ingestionJobs, setIngestionJobs] = useState<Array<{
    id?: string;
    platform: string;
    status: string;
    rowsRead: number;
    rowsWritten: number;
    startedAt: string;
    finishedAt?: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      clientsService.subscribe((items) => setClients(items as ClientExtended[])),
      platformConnectionsService.subscribe(setConnections),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  const availableClients = useMemo(() => {
    const filtered = clients.filter((client) => {
      if (isClient && client.id !== profile?.linkedClientId) return false;
      if (isClient && client.isDemo) return false;
      return client.status === 'active' || client.isDemo;
    });

    return filtered;
  }, [clients, isClient, profile?.linkedClientId]);

  useEffect(() => {
    if (selectedClient) return;
    if (isClient && profile?.linkedClientId) {
      setSelectedClient(profile.linkedClientId);
      return;
    }

    const preferred = availableClients.find((client) => !client.isDemo) || availableClients[0];
    if (preferred?.id) setSelectedClient(preferred.id);
  }, [selectedClient, isClient, profile?.linkedClientId, availableClients]);

  const selectedClientObj = useMemo(
    () => availableClients.find((client) => client.id === selectedClient),
    [availableClients, selectedClient],
  );

  const useLegacy = Boolean(
    selectedClientObj?.dashboardFallbackLegacy || selectedClientObj?.performanceDashboardVersion === 'legacy',
  );

  const selectedConnections = useMemo(
    () => connections.filter((connection) => connection.clientId === selectedClient),
    [connections, selectedClient],
  );

  const range = useMemo(() => getRangeFromPreset(preset), [preset]);

  const loadIntelligence = async () => {
    if (!selectedClient) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        clientId: selectedClient,
        from: range.from,
        to: range.to,
        granularity: 'daily',
        view: 'executive',
      });

      const [intelligenceResp, mediaResp] = await Promise.all([
        fetch(`/api/dashboard/intelligence?${params.toString()}`),
        fetch(`/api/dashboard/media-feed?clientId=${selectedClient}&limit=12`),
      ]);

      const intelligenceJson = await intelligenceResp.json();
      const mediaJson = await mediaResp.json();

      if (!intelligenceResp.ok || !intelligenceJson.success) {
        throw new Error(intelligenceJson.error || 'Failed to load intelligence data');
      }

      setIntelligence(intelligenceJson as DashboardIntelligenceResponse);
      setMediaFeed(mediaJson.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard intelligence';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClient || useLegacy) return;
    void loadIntelligence();
  }, [selectedClient, preset, useLegacy]);

  useEffect(() => {
    if (!selectedClient || useLegacy) return undefined;
    return ingestionJobsService.subscribeByClient(selectedClient, (items) => {
      setIngestionJobs(items.slice(0, 8));
    });
  }, [selectedClient, useLegacy]);

  const runPlatformSync = async () => {
    if (!selectedClient || syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const resp = await fetch(`/api/sync/platforms?clientId=${selectedClient}&mode=hourly`, { method: 'POST' });
      const json = await resp.json();
      if (!resp.ok || !json.success) {
        throw new Error(json.error || 'Platform sync failed');
      }
      await loadIntelligence();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Platform sync failed';
      setError(message);
    } finally {
      setSyncing(false);
    }
  };

  const runSocialSync = async () => {
    if (!selectedClient || syncingSocial) return;
    setSyncingSocial(true);
    setError(null);
    try {
      const resp = await fetch(`/api/sync/social-listening?clientId=${selectedClient}&days=30&limit=40`, {
        method: 'POST',
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) {
        throw new Error(json.error || 'Social listening sync failed');
      }
      await loadIntelligence();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Social listening sync failed';
      setError(message);
    } finally {
      setSyncingSocial(false);
    }
  };

  const runRecommendations = async () => {
    if (!selectedClient || aiLoading) return;
    setAiLoading(true);
    setError(null);

    try {
      const resp = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          from: range.from,
          to: range.to,
          granularity: 'daily',
        }),
      });

      const json = await resp.json();
      if (!resp.ok || !json.success) {
        throw new Error(json.error || 'AI recommendations failed');
      }

      setRecommendations(json.recommendations || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI recommendations failed';
      setError(message);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleFallback = async () => {
    if (!selectedClientObj?.id || !isAdmin) return;
    try {
      await updateDoc(doc(db, 'clients', selectedClientObj.id), {
        dashboardFallbackLegacy: !useLegacy,
        performanceDashboardVersion: useLegacy ? 'intelligence' : 'legacy',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle fallback';
      setError(message);
    }
  };

  if (!hasPermission('campaigns:read')) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔒</div>
        <div className="empty-state-title">Access Denied</div>
      </div>
    );
  }

  if (useLegacy) {
    return (
      <div>
        {isAdmin && (
          <div
            style={{
              marginBottom: 14,
              borderRadius: 10,
              border: '1px solid rgba(245, 158, 11, 0.35)',
              background: 'rgba(245, 158, 11, 0.08)',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} />
              Legacy fallback is active for {selectedClientObj?.name}. Toggle back when ready.
            </div>
            <button className="btn-primary" style={{ padding: '6px 10px', fontSize: '0.74rem' }} onClick={toggleFallback}>
              Switch To Intelligence Dashboard
            </button>
          </div>
        )}
        <LegacyCampaignsPage />
      </div>
    );
  }

  const funnelData = intelligence
    ? [
        { label: 'Impressions', value: intelligence.funnel.impressions },
        { label: 'Clicks', value: intelligence.funnel.clicks },
        { label: 'Sessions', value: intelligence.funnel.sessions },
        { label: 'Leads', value: intelligence.funnel.leads },
        { label: 'Orders', value: intelligence.funnel.orders },
      ]
    : [];

  const forecastData = intelligence
    ? (() => {
        const base = intelligence.series;
        if (base.length === 0) return [];

        const avgDailyValue = base.reduce((acc, point) => acc + point.value, 0) / base.length;
        const lastDate = new Date(`${base[base.length - 1].date}T00:00:00.000Z`);
        const projected: Array<{ date: string; actual: number; forecast: number }> = base.map((point) => ({
          date: point.date,
          actual: point.value,
          forecast: point.value,
        }));

        for (let i = 1; i <= 7; i += 1) {
          const next = new Date(lastDate);
          next.setUTCDate(lastDate.getUTCDate() + i);
          projected.push({
            date: next.toISOString().slice(5, 10),
            actual: 0,
            forecast: avgDailyValue * (1 + (i * 0.01)),
          });
        }

        return projected;
      })()
    : [];

  return (
    <div>
      <div
        style={{
          background: 'linear-gradient(135deg, #0f4c81 0%, #111827 60%, #1f2937 100%)',
          borderRadius: 16,
          padding: '22px 22px 16px',
          marginBottom: 16,
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Performance Intelligence System
            </h1>
            <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: '0.82rem' }}>
              Unified paid, analytics, commerce, and social listening intelligence
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={runPlatformSync}
              disabled={syncing}
              style={{
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '7px 12px',
                display: 'inline-flex',
                gap: 6,
                alignItems: 'center',
                cursor: syncing ? 'wait' : 'pointer',
              }}
            >
              <RefreshCw size={13} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} />
              {syncing ? 'Syncing Data...' : 'Sync Platforms'}
            </button>
            <button
              onClick={runSocialSync}
              disabled={syncingSocial}
              style={{
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '7px 12px',
                display: 'inline-flex',
                gap: 6,
                alignItems: 'center',
                cursor: syncingSocial ? 'wait' : 'pointer',
              }}
            >
              <Signal size={13} />
              {syncingSocial ? 'Syncing Social...' : 'Sync Social Listening'}
            </button>
            <button
              onClick={runRecommendations}
              disabled={aiLoading}
              style={{
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '7px 12px',
                display: 'inline-flex',
                gap: 6,
                alignItems: 'center',
                cursor: aiLoading ? 'wait' : 'pointer',
              }}
            >
              <Brain size={13} />
              {aiLoading ? 'Generating...' : 'AI Recommendations'}
            </button>
            {isAdmin && (
              <button
                onClick={toggleFallback}
                style={{
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fff',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '7px 12px',
                  display: 'inline-flex',
                  gap: 6,
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <ShieldAlert size={13} />
                Enable Legacy Fallback
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {availableClients.map((client) => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client.id || '')}
              style={{
                borderRadius: 8,
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: selectedClient === client.id ? 700 : 500,
                padding: '7px 12px',
                cursor: 'pointer',
                background: selectedClient === client.id ? 'var(--aw-navy)' : 'var(--muted-bg)',
                color: selectedClient === client.id ? '#fff' : 'var(--foreground)',
              }}
            >
              {client.name}
              {client.isDemo ? ' (Demo)' : ''}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {TIME_PRESETS.map((item) => (
            <button
              key={item.key}
              onClick={() => setPreset(item.key)}
              style={{
                borderRadius: 8,
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: preset === item.key ? 700 : 500,
                padding: '6px 10px',
                cursor: 'pointer',
                background: preset === item.key ? 'var(--aw-gold)' : 'var(--muted-bg)',
                color: preset === item.key ? '#fff' : 'var(--foreground)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {selectedConnections.map((connection) => (
          <span
            key={connection.id}
            style={{
              fontSize: '0.68rem',
              borderRadius: 8,
              padding: '4px 8px',
              background: connection.syncStatus === 'ok' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: connection.syncStatus === 'ok' ? '#15803d' : '#b91c1c',
              border: '1px solid rgba(0,0,0,0.06)',
              fontWeight: 600,
            }}
          >
            <Globe size={11} style={{ verticalAlign: 'middle' }} /> {connection.platform} {connection.syncStatus || 'unknown'}
          </span>
        ))}
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(239,68,68,0.25)',
            background: 'rgba(239,68,68,0.08)',
            color: '#b91c1c',
            fontSize: '0.78rem',
          }}
        >
          {error}
        </div>
      )}

      {loading || !intelligence ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="loading-spinner" />
            <p style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--muted)' }}>Loading intelligence data...</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 16 }}>
            <KpiCard icon={<Gauge size={14} />} label="Health Score" value={String(intelligence.executive.healthScore)} subtitle="0-100" />
            <KpiCard icon={<CircleDollarSign size={14} />} label="Spend" value={formatMoney(intelligence.executive.spend)} subtitle={intelligence.currency} />
            <KpiCard icon={<Activity size={14} />} label="Value" value={formatMoney(intelligence.executive.value)} subtitle={intelligence.currency} />
            <KpiCard icon={<SlidersHorizontal size={14} />} label="Efficiency" value={formatPercent(intelligence.executive.efficiencyIndex / 100)} subtitle="Index" />
            <KpiCard icon={<Signal size={14} />} label="Conversion Efficiency" value={formatPercent(intelligence.executive.conversionEfficiency / 100)} subtitle="Trend" />
            <KpiCard icon={<Sparkles size={14} />} label="Pacing" value={formatPercent(intelligence.executive.pacing / 100)} subtitle="vs target" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginBottom: 14 }}>
            <TimeSeriesChart data={intelligence.series} config={SERIES_CONFIG} />
            <SpendOutcomeChart data={intelligence.series} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginBottom: 14 }}>
            <FunnelChart data={funnelData} />
            <ChannelContributionChart data={intelligence.channels} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginBottom: 14 }}>
            <TopicHeatmap topics={intelligence.social.topTopics} />
            <SocialBacklogChart
              unresolved={intelligence.social.unresolved}
              breaches={intelligence.social.slaBreaches}
              points={intelligence.series}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <ForecastChart data={forecastData} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginBottom: 14 }}>
            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: '0.92rem', fontWeight: 700 }}>AI Advisory Recommendations</h3>
              {recommendations.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Click "AI Recommendations" to generate prioritized actions with confidence and evidence.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recommendations.map((rec, index) => (
                    <div key={`${rec.title}-${index}`} style={{ border: '1px solid var(--card-border)', borderRadius: 10, padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{rec.title}</span>
                        <span style={{ fontSize: '0.66rem', borderRadius: 6, padding: '2px 6px', background: 'rgba(15,76,129,0.1)', color: 'var(--aw-navy)', fontWeight: 700 }}>
                          P{rec.priority} · {(rec.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p style={{ margin: '4px 0', fontSize: '0.76rem', lineHeight: 1.5 }}>{rec.action}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)' }}>{rec.expectedImpact}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: '0.92rem', fontWeight: 700 }}>Creative & Social Media Feed</h3>
              {mediaFeed.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No media available for this timeframe yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
                  {mediaFeed.slice(0, 10).map((item) => (
                    <div key={item.id} style={{ border: '1px solid var(--card-border)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ height: 88, background: item.mediaUrl ? `url(${item.mediaUrl}) center/cover no-repeat` : 'var(--muted-bg)' }} />
                      <div style={{ padding: 8 }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                          {item.type} · {item.platform}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, lineHeight: 1.3, marginTop: 4 }}>{item.title}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--muted)', marginTop: 2 }}>
                          Score {item.engagementScore.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0, fontSize: '0.92rem', fontWeight: 700 }}>Ingestion Health Monitor</h3>
            {ingestionJobs.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No ingestion jobs recorded yet for this client.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Rows Read</th>
                      <th style={{ textAlign: 'right' }}>Rows Written</th>
                      <th>Started</th>
                      <th>Finished</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingestionJobs.map((job, idx) => (
                      <tr key={`${job.id || job.startedAt}_${idx}`}>
                        <td>{job.platform}</td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 8px',
                              borderRadius: 8,
                              background:
                                job.status === 'success' || job.status === 'ok'
                                  ? 'rgba(34,197,94,0.12)'
                                  : job.status === 'partial'
                                  ? 'rgba(245,158,11,0.15)'
                                  : 'rgba(239,68,68,0.12)',
                              color:
                                job.status === 'success' || job.status === 'ok'
                                  ? '#15803d'
                                  : job.status === 'partial'
                                  ? '#b45309'
                                  : '#b91c1c',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{job.rowsRead.toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>{job.rowsWritten.toLocaleString()}</td>
                        <td>{new Date(job.startedAt).toLocaleString()}</td>
                        <td>{job.finishedAt ? new Date(job.finishedAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <RiskPanel title="Top Risks" icon={<AlertTriangle size={14} />} items={intelligence.executive.topRisks} tone="danger" />
            <RiskPanel title="Top Opportunities" icon={<Sparkles size={14} />} items={intelligence.executive.topOpportunities} tone="success" />
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--muted)', fontWeight: 700 }}>
          {label}
        </span>
        <span style={{ color: 'var(--aw-gold)' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{subtitle}</div>}
    </div>
  );
}

function RiskPanel({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  tone: 'danger' | 'success';
}) {
  const color = tone === 'danger' ? '#b91c1c' : '#15803d';
  const background = tone === 'danger' ? 'rgba(239,68,68,0.07)' : 'rgba(22,163,74,0.08)';

  return (
    <div className="card" style={{ background }}>
      <h3 style={{ marginTop: 0, fontSize: '0.9rem', fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        {title}
      </h3>
      {items.length === 0 ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 0 }}>No major items identified in this window.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 6 }}>
          {items.map((item, index) => (
            <li key={`${title}-${index}`} style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
