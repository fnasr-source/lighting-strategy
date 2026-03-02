'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { clientsService, type Client } from '@/lib/firestore';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Users, Mail, Building2, Globe, Calendar, Tag, ExternalLink, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface CampaignLead {
    id: string;
    lead_id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    participants?: string;
    motivation?: string;
    status: string;
    campaign?: string;
    client_id?: string;
    submitted_at?: string;
    created_at?: any;
    utm?: { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_term?: string; utm_content?: string; gclid?: string; fbclid?: string };
    meta?: { landing_url?: string; referrer?: string; first_visit?: string; user_agent?: string };
}

interface Campaign {
    id: string;
    name: string;
    client_id?: string;
    client_name?: string;
    status?: string;
    program_date?: string;
    landing_url?: string;
}

export default function CampaignLeadsPage() {
    const { hasPermission, isClient, profile } = useAuth();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState('lup-2026');
    const [leads, setLeads] = useState<CampaignLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLead, setExpandedLead] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');

    // Load campaigns
    useEffect(() => {
        return onSnapshot(collection(db, 'campaigns'), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign));
            setCampaigns(list);
        });
    }, []);

    // Load leads for selected campaign
    useEffect(() => {
        if (!selectedCampaign) { setLeads([]); setLoading(false); return; }
        setLoading(true);
        const leadsRef = collection(db, 'campaigns', selectedCampaign, 'leads');
        return onSnapshot(leadsRef, snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CampaignLead))
                .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''));
            setLeads(list);
            setLoading(false);
        });
    }, [selectedCampaign]);

    if (!hasPermission('campaigns:read')) {
        return <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Access Denied</div></div>;
    }

    const filtered = statusFilter === 'all' ? leads : leads.filter(l => l.status === statusFilter);
    const activeCampaign = campaigns.find(c => c.id === selectedCampaign);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { total: leads.length };
        leads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
        return counts;
    }, [leads]);

    // UTM source breakdown
    const sourceBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        leads.forEach(l => {
            const src = l.utm?.utm_source || 'direct';
            map[src] = (map[src] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [leads]);

    const updateLeadStatus = async (leadId: string, status: string) => {
        await updateDoc(doc(db, 'campaigns', selectedCampaign, 'leads', leadId), { status });
    };

    const deleteLead = async (leadId: string) => {
        if (!confirm('Delete this lead permanently?')) return;
        await deleteDoc(doc(db, 'campaigns', selectedCampaign, 'leads', leadId));
    };

    const fmtDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return d; }
    };

    const statusColors: Record<string, { bg: string; color: string }> = {
        new: { bg: '#3498db18', color: '#3498db' },
        contacted: { bg: '#f39c1218', color: '#f39c12' },
        qualified: { bg: '#2ecc7118', color: '#2ecc71' },
        enrolled: { bg: '#27ae6018', color: '#27ae60' },
        rejected: { bg: '#e74c3c18', color: '#e74c3c' },
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Campaign Leads</h1>
                    <p className="page-subtitle">Track applications from campaign landing pages</p>
                </div>
                <select className="form-input" style={{ width: 'auto', minWidth: 200 }} value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Campaign Info */}
            {activeCampaign && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--muted)' }}>
                    {activeCampaign.client_name && <span>👤 {activeCampaign.client_name}</span>}
                    {activeCampaign.program_date && <span>📅 {activeCampaign.program_date}</span>}
                    <span className={`status-pill status-${activeCampaign.status === 'active' ? 'paid' : 'draft'}`}>{activeCampaign.status}</span>
                    {activeCampaign.landing_url && (
                        <a href={activeCampaign.landing_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--aw-navy)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ExternalLink size={12} /> Landing Page
                        </a>
                    )}
                </div>
            )}

            {/* KPIs */}
            <div className="kpi-grid">
                <div className="kpi-card"><div className="kpi-label"><Users size={14} /> Total Leads</div><div className="kpi-value">{statusCounts.total || 0}</div></div>
                <div className="kpi-card"><div className="kpi-label"><Tag size={14} /> New</div><div className="kpi-value" style={{ color: '#3498db' }}>{statusCounts.new || 0}</div></div>
                <div className="kpi-card"><div className="kpi-label"><Mail size={14} /> Contacted</div><div className="kpi-value" style={{ color: '#f39c12' }}>{statusCounts.contacted || 0}</div></div>
                <div className="kpi-card"><div className="kpi-label"><Building2 size={14} /> Enrolled</div><div className="kpi-value" style={{ color: '#27ae60' }}>{statusCounts.enrolled || 0}</div></div>
            </div>

            {/* Source Attribution */}
            {sourceBreakdown.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12 }}>Lead Sources</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {sourceBreakdown.map(([src, count]) => (
                            <span key={src} style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: 6, background: 'var(--muted-bg)', color: 'var(--foreground)', fontWeight: 500 }}>
                                <Globe size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                {src}: <strong>{count}</strong>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['all', 'new', 'contacted', 'qualified', 'enrolled', 'rejected'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: statusFilter === s ? 700 : 500,
                        background: statusFilter === s ? 'var(--aw-navy)' : 'var(--muted-bg)',
                        color: statusFilter === s ? '#fff' : 'var(--muted)',
                    }}>
                        {s.charAt(0).toUpperCase() + s.slice(1)} {s !== 'all' && statusCounts[s] ? `(${statusCounts[s]})` : s === 'all' ? `(${leads.length})` : ''}
                    </button>
                ))}
            </div>

            {/* Leads Table */}
            {loading ? (
                <div className="card"><div className="empty-state" style={{ padding: 48 }}><div className="loading-spinner" /></div></div>
            ) : filtered.length === 0 ? (
                <div className="card"><div className="empty-state" style={{ padding: 48 }}>
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-title">No Leads Yet</div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Leads will appear here when people submit the application form on the landing page.</p>
                </div></div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    {filtered.map(lead => {
                        const sc = statusColors[lead.status] || statusColors.new;
                        const isExpanded = expandedLead === lead.id;
                        return (
                            <div key={lead.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                <div onClick={() => setExpandedLead(isExpanded ? null : lead.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{lead.firstName} {lead.lastName}</span>
                                            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color, fontWeight: 600, textTransform: 'uppercase' }}>{lead.status}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
                                            <span>{lead.title} at {lead.company}</span>
                                            <span>📧 {lead.email}</span>
                                            {lead.utm?.utm_source && <span>📡 {lead.utm.utm_source}/{lead.utm.utm_medium}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{lead.submitted_at ? fmtDate(lead.submitted_at) : ''}</span>
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div style={{ padding: '0 20px 16px', background: 'var(--muted-bg)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16, paddingTop: 12 }}>
                                            <Detail label="Lead ID" value={lead.lead_id} />
                                            <Detail label="Phone" value={lead.phone} />
                                            <Detail label="Company" value={lead.company} />
                                            <Detail label="Title" value={lead.title} />
                                            <Detail label="Participants" value={lead.participants} />
                                            <Detail label="Submitted" value={lead.submitted_at ? fmtDate(lead.submitted_at) : '—'} />
                                        </div>

                                        {lead.motivation && (
                                            <div style={{ marginBottom: 12 }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Motivation</span>
                                                <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--foreground)', margin: 0, padding: '8px 12px', background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--card-border)' }}>{lead.motivation}</p>
                                            </div>
                                        )}

                                        {/* UTM Data */}
                                        {lead.utm && Object.keys(lead.utm).length > 0 && (
                                            <div style={{ marginBottom: 12 }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>UTM Attribution</span>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    {Object.entries(lead.utm).filter(([, v]) => v).map(([k, v]) => (
                                                        <span key={k} style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4, background: 'rgba(0,26,112,0.06)', color: 'var(--aw-navy)', fontFamily: 'monospace' }}>
                                                            {k}: {v}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Meta / Landing Data */}
                                        {lead.meta && (
                                            <div style={{ marginBottom: 12 }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Landing Data</span>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    {lead.meta.referrer && <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'monospace' }}>Ref: {lead.meta.referrer}</span>}
                                                    {lead.meta.first_visit && <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'monospace' }}>First: {fmtDate(lead.meta.first_visit)}</span>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                                            {['new', 'contacted', 'qualified', 'enrolled', 'rejected'].map(s => (
                                                <button key={s} onClick={() => updateLeadStatus(lead.id, s)} disabled={lead.status === s}
                                                    style={{
                                                        fontSize: '0.72rem', padding: '5px 12px', borderRadius: 6, cursor: lead.status === s ? 'default' : 'pointer',
                                                        border: lead.status === s ? '2px solid var(--aw-navy)' : '1px solid var(--card-border)',
                                                        background: lead.status === s ? 'var(--aw-navy)' : 'var(--card-bg)',
                                                        color: lead.status === s ? '#fff' : 'var(--foreground)', fontWeight: lead.status === s ? 700 : 500,
                                                    }}>
                                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                                </button>
                                            ))}
                                            <button onClick={() => deleteLead(lead.id)} style={{ fontSize: '0.72rem', padding: '5px 12px', borderRadius: 6, border: '1px solid var(--danger)', color: 'var(--danger)', background: 'none', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Detail({ label, value }: { label: string; value?: string }) {
    return (
        <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</span>
            <div style={{ fontSize: '0.84rem', fontWeight: 500 }}>{value || '—'}</div>
        </div>
    );
}
