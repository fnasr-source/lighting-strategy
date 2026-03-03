'use client';

import { useState } from 'react';
import { MessageCircle, Heart, Share2, Eye, ThumbsUp, Sparkles } from 'lucide-react';

interface PostEngagement {
    id: string;
    message: string;
    createdTime: string;
    type: string;
    likes: number;
    comments: number;
    shares: number;
    thumbnail?: string;
    commentSamples: { from: string; message: string; createdTime: string }[];
}

interface EngagementData {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgEngagementRate: number;
    topPosts: PostEngagement[];
    recentComments: { from: string; message: string; postMessage: string; createdTime: string }[];
    platforms: string[];
}

interface EngagementAnalysis {
    sentimentSummary: string;
    topThemes: string[];
    recommendations: string[];
    audienceInsights: string;
}

const fmtK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);

export function SocialEngagement({ clientId, clientName }: { clientId: string; clientName: string }) {
    const [data, setData] = useState<EngagementData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<EngagementAnalysis | null>(null);
    const [analysing, setAnalysing] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'comments'>('overview');

    const fetchEngagement = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/meta/engagement?clientId=${clientId}&days=30&limit=25`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setData(json.summary);
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    const analyseWithAI = async () => {
        if (!data) return;
        setAnalysing(true);
        try {
            const payload = {
                clientName,
                engagement: {
                    totalPosts: data.totalPosts,
                    totalLikes: data.totalLikes,
                    totalComments: data.totalComments,
                    totalShares: data.totalShares,
                    platforms: data.platforms,
                    recentComments: data.recentComments.slice(0, 15).map(c => ({
                        from: c.from, message: c.message, postContext: c.postMessage,
                    })),
                    topPostCaptions: data.topPosts.slice(0, 5).map(p => ({
                        message: p.message?.slice(0, 200), likes: p.likes, comments: p.comments, type: p.type,
                    })),
                },
            };

            const res = await fetch('/api/ai/engagement-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'AI analysis failed');
            setAnalysis(json.analysis);
        } catch (err: any) {
            console.error('AI analysis error:', err);
            // Provide a basic fallback analysis
            setAnalysis({
                sentimentSummary: 'Unable to run AI analysis. Review comments manually for sentiment patterns.',
                topThemes: ['Engagement data collected'],
                recommendations: ['Monitor comment sentiment regularly', 'Respond to customer questions promptly'],
                audienceInsights: `${data.totalComments} comments across ${data.totalPosts} posts on ${data.platforms.join(' & ')}.`,
            });
        }
        setAnalysing(false);
    };

    return (
        <div style={{
            marginBottom: 24, borderRadius: 14, background: 'var(--card-bg)',
            border: '1px solid var(--card-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: data ? '1px solid var(--card-border)' : 'none',
                background: data ? 'linear-gradient(135deg, #667eea11, #764ba211)' : undefined,
            }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    💬 Social Media Engagement
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 400 }}>Facebook & Instagram · Last 30 days</span>
                </h3>
                {!data && (
                    <button onClick={fetchEngagement} disabled={loading} style={{
                        padding: '5px 14px', borderRadius: 8, border: '1px solid var(--card-border)',
                        background: loading ? 'var(--muted-bg)' : 'linear-gradient(135deg, #667eea, #764ba2)',
                        cursor: loading ? 'wait' : 'pointer',
                        fontSize: '0.72rem', fontWeight: 600, color: loading ? 'var(--foreground)' : '#fff',
                        display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                        {loading ? '⟳ Loading...' : '📊 Load Engagement'}
                    </button>
                )}
            </div>

            {error && (
                <div style={{ padding: '10px 20px', color: '#e74c3c', fontSize: '0.76rem' }}>⚠️ {error}</div>
            )}

            {data && (
                <>
                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, padding: '12px 20px' }}>
                        <EngMetric icon={<Eye size={14} />} label="Posts" value={String(data.totalPosts)} color="#3498db" />
                        <EngMetric icon={<Heart size={14} />} label="Likes" value={fmtK(data.totalLikes)} color="#e74c3c" />
                        <EngMetric icon={<MessageCircle size={14} />} label="Comments" value={fmtK(data.totalComments)} color="#27ae60" />
                        <EngMetric icon={<Share2 size={14} />} label="Shares" value={fmtK(data.totalShares)} color="#9b59b6" />
                        <EngMetric icon={<ThumbsUp size={14} />} label="Avg Eng/Post" value={Math.round(data.avgEngagementRate).toLocaleString()} color="#e67e22" />
                    </div>

                    {/* Platforms badge */}
                    <div style={{ padding: '0 20px 8px', display: 'flex', gap: 6 }}>
                        {data.platforms.map(p => (
                            <span key={p} style={{
                                fontSize: '0.6rem', padding: '2px 8px', borderRadius: 4,
                                background: p === 'Facebook' ? '#1877f215' : '#E1306C15',
                                color: p === 'Facebook' ? '#1877f2' : '#E1306C',
                                fontWeight: 600,
                            }}>
                                {p === 'Facebook' ? '📘' : '📸'} {p}
                            </span>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', padding: '0 20px' }}>
                        {(['overview', 'posts', 'comments'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                                fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize',
                                color: activeTab === tab ? 'var(--aw-navy)' : 'var(--muted)',
                                borderBottom: activeTab === tab ? '2px solid var(--aw-navy)' : '2px solid transparent',
                            }}>
                                {tab}
                            </button>
                        ))}
                        <div style={{ flex: 1 }} />
                        <button onClick={analyseWithAI} disabled={analysing} style={{
                            padding: '5px 12px', margin: '4px 0', borderRadius: 8,
                            border: '1px solid var(--card-border)', background: analysing ? 'var(--muted-bg)' : 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: analysing ? 'var(--foreground)' : '#fff',
                            cursor: analysing ? 'wait' : 'pointer',
                            fontSize: '0.66rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            <Sparkles size={12} /> {analysing ? 'Analysing...' : 'AI Analysis'}
                        </button>
                    </div>

                    {/* AI Analysis */}
                    {analysis && (
                        <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #667eea08, #764ba208)', borderBottom: '1px solid var(--card-border)' }}>
                            <div style={{ fontSize: '0.76rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Sparkles size={13} style={{ color: '#764ba2' }} /> AI Engagement Insights
                            </div>
                            <p style={{ fontSize: '0.74rem', lineHeight: 1.6, margin: '0 0 8px', color: 'var(--foreground)' }}>
                                {analysis.sentimentSummary}
                            </p>
                            {analysis.topThemes.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                    <span style={{ fontSize: '0.64rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Key themes: </span>
                                    {analysis.topThemes.map((t, i) => (
                                        <span key={i} style={{
                                            fontSize: '0.64rem', padding: '2px 6px', borderRadius: 4, marginRight: 4,
                                            background: '#764ba215', color: '#764ba2', fontWeight: 500,
                                        }}>{t}</span>
                                    ))}
                                </div>
                            )}
                            {analysis.recommendations.length > 0 && (
                                <div>
                                    <span style={{ fontSize: '0.64rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Recommendations:</span>
                                    <ul style={{ fontSize: '0.72rem', margin: '4px 0 0 16px', padding: 0, lineHeight: 1.6 }}>
                                        {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            )}
                            <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 6, marginBottom: 0 }}>
                                {analysis.audienceInsights}
                            </p>
                        </div>
                    )}

                    {/* Tab content */}
                    <div style={{ padding: '12px 20px', maxHeight: 400, overflowY: 'auto' }}>
                        {activeTab === 'overview' && (
                            <div>
                                <p style={{ fontSize: '0.76rem', color: 'var(--muted)', margin: '0 0 12px' }}>
                                    Top performing posts by total engagement
                                </p>
                                {data.topPosts.slice(0, 4).map((post, i) => (
                                    <div key={post.id} style={{
                                        display: 'flex', gap: 12, padding: '10px 0',
                                        borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                                    }}>
                                        {post.thumbnail && (
                                            <img src={post.thumbnail} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.74rem', lineHeight: 1.4, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                                                {post.message || '(No caption)'}
                                            </div>
                                            <div style={{ display: 'flex', gap: 10, fontSize: '0.64rem', color: 'var(--muted)' }}>
                                                <span>❤️ {post.likes}</span>
                                                <span>💬 {post.comments}</span>
                                                {post.shares > 0 && <span>🔁 {post.shares}</span>}
                                                <span style={{ textTransform: 'uppercase', fontSize: '0.56rem', padding: '1px 4px', borderRadius: 3, background: 'var(--muted-bg)' }}>
                                                    {post.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'posts' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                                {data.topPosts.map(post => (
                                    <div key={post.id} style={{ borderRadius: 8, border: '1px solid var(--card-border)', overflow: 'hidden' }}>
                                        {post.thumbnail && (
                                            <img src={post.thumbnail} alt="" style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                                        )}
                                        <div style={{ padding: 8 }}>
                                            <div style={{ fontSize: '0.64rem', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {post.message || '(No caption)'}
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, fontSize: '0.6rem', color: 'var(--muted)' }}>
                                                <span>❤️{post.likes}</span>
                                                <span>💬{post.comments}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'comments' && (
                            <div>
                                {data.recentComments.length === 0 ? (
                                    <p style={{ fontSize: '0.76rem', color: 'var(--muted)', textAlign: 'center' }}>No comments found</p>
                                ) : (
                                    data.recentComments.slice(0, 12).map((c, i) => (
                                        <div key={i} style={{
                                            padding: '8px 0',
                                            borderBottom: i < 11 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{c.from}</span>
                                                <span style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>
                                                    {c.createdTime ? new Date(c.createdTime).toLocaleDateString() : ''}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>{c.message}</div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: 2 }}>
                                                on: "{c.postMessage}..."
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function EngMetric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <div style={{
            padding: '10px 12px', borderRadius: 8, background: 'var(--card-bg)',
            border: '1px solid var(--card-border)', textAlign: 'center',
        }}>
            <div style={{ color, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{value}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
        </div>
    );
}
