'use client';

import { useState } from 'react';
import { Sparkles, Image as ImageIcon, Film, Layers, Award } from 'lucide-react';

// ── Types ──
interface Creative {
    id: string;
    name: string;
    adType: 'image' | 'video' | 'carousel' | 'unknown';
    thumbnail?: string;
    spend: number;
    revenue: number;
    roas: number;
    impressions: number;
    clicks: number;
    purchases: number;
}

interface AdCopy {
    id: string;
    headline: string;
    primaryText: string;
    spend: number;
    revenue: number;
    roas: number;
    impressions: number;
    clicks: number;
    purchases: number;
}

const fmtK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);
const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const AD_TYPE_ICONS: Record<string, React.ReactNode> = {
    image: <ImageIcon size={11} />,
    video: <Film size={11} />,
    carousel: <Layers size={11} />,
    unknown: <ImageIcon size={11} />,
};
const AD_TYPE_COLORS: Record<string, string> = {
    image: '#3498db', video: '#e74c3c', carousel: '#9b59b6', unknown: '#95a5a6',
};

/**
 * Top Creatives section — shows top-performing ad creatives ranked by ROAS
 */
export function TopCreatives({ clientId, currency }: { clientId: string; currency: string }) {
    const [creatives, setCreatives] = useState<Creative[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    const fetchCreatives = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/meta/creatives?clientId=${clientId}&days=30`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCreatives(data.creatives || []);
            setLoaded(true);
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div style={{
            marginBottom: 24, borderRadius: 14, background: 'var(--card-bg)',
            border: '1px solid var(--card-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
        }}>
            <div style={{
                padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: loaded ? '1px solid var(--card-border)' : 'none',
            }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    🎨 Top Creatives
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 400 }}>Last 30 days · Ranked by ROAS</span>
                </h3>
                {!loaded && (
                    <button onClick={fetchCreatives} disabled={loading} style={{
                        padding: '5px 14px', borderRadius: 8, border: '1px solid var(--card-border)',
                        background: loading ? 'var(--muted-bg)' : 'var(--card-bg)',
                        cursor: loading ? 'wait' : 'pointer',
                        fontSize: '0.72rem', fontWeight: 600, color: 'var(--aw-navy)',
                        display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                        {loading ? '⟳ Loading...' : '📸 Load Creatives'}
                    </button>
                )}
            </div>

            {error && (
                <div style={{ padding: '10px 20px', color: '#e74c3c', fontSize: '0.76rem' }}>⚠️ {error}</div>
            )}

            {loaded && creatives.length === 0 && (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>
                    No creative data available for this period
                </div>
            )}

            {loaded && creatives.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, padding: '16px 20px' }}>
                    {creatives.map((c, i) => (
                        <div key={c.id} style={{
                            borderRadius: 10, border: '1px solid var(--card-border)',
                            overflow: 'hidden', background: 'var(--card-bg)', position: 'relative',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            {/* Rank badge */}
                            <div style={{
                                position: 'absolute', top: 6, left: 6, zIndex: 2,
                                background: i < 3 ? 'linear-gradient(135deg, #d4af37, #b8860b)' : 'rgba(0,0,0,0.6)',
                                color: '#fff', borderRadius: 6, padding: '2px 8px',
                                fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3,
                            }}>
                                <Award size={10} /> #{i + 1}
                            </div>
                            {/* Ad type badge */}
                            <div style={{
                                position: 'absolute', top: 6, right: 6, zIndex: 2,
                                background: AD_TYPE_COLORS[c.adType] || '#95a5a6',
                                color: '#fff', borderRadius: 6, padding: '2px 8px',
                                fontSize: '0.55rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
                                textTransform: 'uppercase',
                            }}>
                                {AD_TYPE_ICONS[c.adType]} {c.adType}
                            </div>
                            {/* Thumbnail */}
                            <div style={{
                                height: 110, background: c.thumbnail ? `url(${c.thumbnail}) center/cover no-repeat` : 'linear-gradient(135deg, var(--muted-bg), var(--card-border))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {!c.thumbnail && <ImageIcon size={24} style={{ color: 'var(--muted)', opacity: 0.4 }} />}
                            </div>
                            {/* Metrics */}
                            <div style={{ padding: '10px 10px 12px' }}>
                                <div style={{ fontSize: '0.66rem', color: 'var(--muted)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {c.name}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                    <MiniStat label="ROAS" value={`${c.roas.toFixed(1)}x`} highlight={c.roas >= 5} />
                                    <MiniStat label="Revenue" value={fmtK(c.revenue)} />
                                    <MiniStat label="Spend" value={fmtAmt(Math.round(c.spend))} />
                                    <MiniStat label="Purchases" value={String(c.purchases)} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Top Ad Copies section — shows top-performing ad text ranked by ROAS
 */
export function TopAdCopies({ clientId, currency }: { clientId: string; currency: string }) {
    const [adCopies, setAdCopies] = useState<AdCopy[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    const fetchCopies = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/meta/creatives?clientId=${clientId}&days=30`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAdCopies(data.adCopies || []);
            setLoaded(true);
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div style={{
            marginBottom: 24, borderRadius: 14, background: 'var(--card-bg)',
            border: '1px solid var(--card-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
            <div style={{
                padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: loaded ? '1px solid var(--card-border)' : 'none',
            }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    ✍️ Top Ad Copies
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 400 }}>Last 30 days · Ranked by ROAS</span>
                </h3>
                {!loaded && (
                    <button onClick={fetchCopies} disabled={loading} style={{
                        padding: '5px 14px', borderRadius: 8, border: '1px solid var(--card-border)',
                        background: loading ? 'var(--muted-bg)' : 'var(--card-bg)',
                        cursor: loading ? 'wait' : 'pointer',
                        fontSize: '0.72rem', fontWeight: 600, color: 'var(--aw-navy)',
                        display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                        {loading ? '⟳ Loading...' : '📝 Load Ad Copies'}
                    </button>
                )}
            </div>

            {error && (
                <div style={{ padding: '10px 20px', color: '#e74c3c', fontSize: '0.76rem' }}>⚠️ {error}</div>
            )}

            {loaded && adCopies.length === 0 && (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>
                    No ad copy data available for this period
                </div>
            )}

            {loaded && adCopies.length > 0 && (
                <div style={{ padding: '12px 20px' }}>
                    {adCopies.map((copy, i) => (
                        <div key={copy.id} style={{
                            padding: '14px 0',
                            borderBottom: i < adCopies.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                {/* Rank */}
                                <div style={{
                                    minWidth: 28, height: 28, borderRadius: 8,
                                    background: i < 3 ? 'linear-gradient(135deg, #d4af37, #b8860b)' : 'var(--muted-bg)',
                                    color: i < 3 ? '#fff' : 'var(--muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                                }}>
                                    #{i + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Headline */}
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
                                        {copy.headline}
                                    </div>
                                    {/* Primary text */}
                                    {copy.primaryText && (
                                        <div style={{
                                            fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5,
                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                                        }}>
                                            {copy.primaryText}
                                        </div>
                                    )}
                                    {/* Metrics row */}
                                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                                        <CopyMetric label="ROAS" value={`${copy.roas.toFixed(1)}x`} highlight={copy.roas >= 5} />
                                        <CopyMetric label="Revenue" value={fmtK(copy.revenue)} />
                                        <CopyMetric label="Spend" value={fmtAmt(Math.round(copy.spend))} />
                                        <CopyMetric label="Clicks" value={fmtK(copy.clicks)} />
                                        <CopyMetric label="Purchases" value={String(copy.purchases)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Helper Components ──

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div>
            <div style={{ fontSize: '0.55rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: highlight ? '#27ae60' : 'var(--foreground)' }}>{value}</div>
        </div>
    );
}

function CopyMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div>
            <span style={{ fontSize: '0.58rem', color: 'var(--muted)', marginRight: 3 }}>{label}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: highlight ? '#27ae60' : 'var(--foreground)' }}>{value}</span>
        </div>
    );
}
