'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { leadsService, clientsService, type Lead, type Client } from '@/lib/firestore';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Target, Plus, X, Users, MessageSquare, Send, ChevronDown, ChevronUp, Trash2, Globe, Mail, Phone, Building2 } from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = { A: 'var(--danger)', B: 'var(--aw-gold)', C: 'var(--muted)' };
const ACTIVITY_ICONS: Record<string, string> = { note: '📝', call: '📞', email: '📧', meeting: '🤝' };
const ACTIVITY_COLORS: Record<string, string> = { note: '#6c5ce7', call: '#00b894', email: '#0984e3', meeting: '#e17055' };

interface CampaignLead {
    id: string; lead_id?: string; firstName?: string; lastName?: string;
    email?: string; phone?: string; company?: string; title?: string;
    participants?: string; motivation?: string; sector?: string;
    companySize?: string; yearsExperience?: string; form_type?: string;
    status: string; campaign?: string; client_id?: string;
    submitted_at?: string; created_at?: any;
    utm?: Record<string, string>; meta?: Record<string, string>;
}

interface Activity {
    id: string; type: 'note' | 'call' | 'email' | 'meeting';
    content: string; author?: string; created_at?: any;
}

interface Campaign {
    id: string; name: string; client_id?: string; client_name?: string;
    status?: string;
}

type ViewMode = 'internal' | 'campaign';

export default function LeadsPage() {
    const { hasPermission, isClient, profile } = useAuth();

    // Internal leads state
    const [leads, setLeads] = useState<Lead[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', source: 'inbound' as Lead['source'], priority: 'B' as Lead['priority'], status: 'new' as Lead['status'], notes: '' });

    // Campaign leads state
    const [viewMode, setViewMode] = useState<ViewMode>('internal');
    const [clients, setClients] = useState<Client[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState('');
    const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);
    const [campaignLoading, setCampaignLoading] = useState(false);
    const [expandedLead, setExpandedLead] = useState<string | null>(null);
    const [activities, setActivities] = useState<Record<string, Activity[]>>({});
    const [activityType, setActivityType] = useState<Activity['type']>('note');
    const [activityContent, setActivityContent] = useState('');
    const [savingActivity, setSavingActivity] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    // Subscriptions
    useEffect(() => { return leadsService.subscribe(setLeads); }, []);
    useEffect(() => { return clientsService.subscribe(setClients); }, []);
    useEffect(() => {
        return onSnapshot(collection(db, 'campaigns'), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign));
            setCampaigns(list);
            if (!selectedCampaign && list.length > 0) setSelectedCampaign(list[0].id);
        });
    }, [selectedCampaign]);

    // Load campaign leads
    useEffect(() => {
        if (!selectedCampaign || viewMode !== 'campaign') return;
        setCampaignLoading(true);
        const leadsRef = collection(db, 'campaigns', selectedCampaign, 'leads');
        return onSnapshot(leadsRef, snap => {
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CampaignLead))
                .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''));
            // Client users see only their client's leads
            if (isClient && profile?.linkedClientId) {
                list = list.filter(l => l.client_id === profile.linkedClientId);
            }
            setCampaignLeads(list);
            setCampaignLoading(false);
        });
    }, [selectedCampaign, viewMode, isClient, profile]);

    // Load activities for expanded lead
    useEffect(() => {
        if (!expandedLead || !selectedCampaign) return;
        const actRef = collection(db, 'campaigns', selectedCampaign, 'leads', expandedLead, 'activities');
        const q = query(actRef, orderBy('created_at', 'desc'));
        return onSnapshot(q, snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
            setActivities(prev => ({ ...prev, [expandedLead]: list }));
        });
    }, [expandedLead, selectedCampaign]);

    const addActivity = useCallback(async (leadId: string) => {
        if (!activityContent.trim() || savingActivity) return;
        setSavingActivity(true);
        try {
            const actRef = collection(db, 'campaigns', selectedCampaign, 'leads', leadId, 'activities');
            await addDoc(actRef, {
                type: activityType, content: activityContent.trim(),
                author: profile?.displayName || profile?.email || 'Admin',
                created_at: serverTimestamp(),
            });
            setActivityContent('');
        } catch (err) { console.error('Failed to add activity:', err); }
        finally { setSavingActivity(false); }
    }, [activityContent, activityType, selectedCampaign, profile, savingActivity]);

    // Internal leads helpers
    const statuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted'] as const;
    const grouped = statuses.map(s => ({ status: s, leads: leads.filter(l => l.status === s) }));

    const openForm = (lead?: Lead) => {
        if (lead) {
            setEditingLead(lead);
            setForm({ name: lead.name, email: lead.email || '', company: lead.company || '', phone: lead.phone || '', source: lead.source, priority: lead.priority, status: lead.status, notes: lead.notes || '' });
        } else {
            setEditingLead(null);
            setForm({ name: '', email: '', company: '', phone: '', source: 'inbound', priority: 'B', status: 'new', notes: '' });
        }
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingLead?.id) await leadsService.update(editingLead.id, form);
        else await leadsService.create(form);
        setShowForm(false);
    };

    // Campaign leads helpers
    const updateCampaignLeadStatus = async (leadId: string, status: string) => {
        await updateDoc(doc(db, 'campaigns', selectedCampaign, 'leads', leadId), { status });
    };

    const deleteCampaignLead = async (leadId: string) => {
        if (!confirm('Delete this lead permanently?')) return;
        await deleteDoc(doc(db, 'campaigns', selectedCampaign, 'leads', leadId));
    };

    const fmtDate = (d: string | any) => {
        try {
            const date = d?.toDate ? d.toDate() : new Date(d);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return String(d); }
    };

    const filteredCampaignLeads = statusFilter === 'all' ? campaignLeads : campaignLeads.filter(l => l.status === statusFilter);

    const campaignStatusCounts = useMemo(() => {
        const counts: Record<string, number> = { total: campaignLeads.length };
        campaignLeads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
        return counts;
    }, [campaignLeads]);

    const statusColors: Record<string, { bg: string; color: string }> = {
        new: { bg: '#3498db18', color: '#3498db' },
        contacted: { bg: '#f39c1218', color: '#f39c12' },
        qualified: { bg: '#2ecc7118', color: '#2ecc71' },
        enrolled: { bg: '#27ae6018', color: '#27ae60' },
        rejected: { bg: '#e74c3c18', color: '#e74c3c' },
    };

    // For client users, default to campaign view if they have a linked client
    useEffect(() => {
        if (isClient && profile?.linkedClientId) {
            setViewMode('campaign');
        }
    }, [isClient, profile]);

    return (
        <>
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 className="page-title">Leads</h1>
                        <p className="page-subtitle">
                            {viewMode === 'internal'
                                ? `${leads.length} lead${leads.length !== 1 ? 's' : ''} in pipeline`
                                : `${campaignLeads.length} campaign lead${campaignLeads.length !== 1 ? 's' : ''}`
                            }
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {viewMode === 'internal' && !isClient && (
                            <button className="btn btn-primary" onClick={() => openForm()}><Plus size={16} /> Add Lead</button>
                        )}
                    </div>
                </div>
            </div>

            {/* View Mode Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                {!isClient && (
                    <>
                        <button onClick={() => setViewMode('internal')} style={{
                            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontSize: '0.84rem', fontWeight: viewMode === 'internal' ? 700 : 500,
                            background: viewMode === 'internal' ? 'var(--aw-navy)' : 'var(--muted-bg)',
                            color: viewMode === 'internal' ? '#fff' : 'var(--muted)',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <Target size={14} /> Internal Pipeline
                        </button>
                        <button onClick={() => setViewMode('campaign')} style={{
                            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontSize: '0.84rem', fontWeight: viewMode === 'campaign' ? 700 : 500,
                            background: viewMode === 'campaign' ? 'var(--aw-navy)' : 'var(--muted-bg)',
                            color: viewMode === 'campaign' ? '#fff' : 'var(--muted)',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <Users size={14} /> Campaign Leads
                        </button>
                    </>
                )}
                {viewMode === 'campaign' && campaigns.length > 0 && (
                    <select className="form-input" style={{ width: 'auto', minWidth: 200, marginLeft: !isClient ? 'auto' : 0 }} value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
            </div>

            {/* ===== INTERNAL PIPELINE VIEW ===== */}
            {viewMode === 'internal' && (
                <>
                    {leads.length === 0 ? (
                        <div className="card"><div className="empty-state"><div className="empty-state-icon">🎯</div><div className="empty-state-title">No Leads Yet</div><p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Add leads to build your pipeline.</p></div></div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statuses.length}, minmax(200px, 1fr))`, gap: 12, overflowX: 'auto' }}>
                            {grouped.map(g => (
                                <div key={g.status}>
                                    <div style={{ padding: '8px 12px', marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                                        {g.status.replace('_', ' ')} ({g.leads.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {g.leads.map(l => (
                                            <div key={l.id} className="card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => openForm(l)}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{l.name}</span>
                                                    <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, background: (PRIORITY_COLORS[l.priority] || 'var(--muted)') + '20', color: PRIORITY_COLORS[l.priority] || 'var(--muted)' }}>{l.priority}</span>
                                                </div>
                                                {l.company && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{l.company}</div>}
                                                {l.source && <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4 }}>via {l.source}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ===== CAMPAIGN LEADS VIEW ===== */}
            {viewMode === 'campaign' && (
                <>
                    {/* KPIs */}
                    <div className="kpi-grid" style={{ marginBottom: 16 }}>
                        <div className="kpi-card"><div className="kpi-label"><Users size={14} /> Total</div><div className="kpi-value">{campaignStatusCounts.total || 0}</div></div>
                        <div className="kpi-card"><div className="kpi-label">🆕 New</div><div className="kpi-value" style={{ color: '#3498db' }}>{campaignStatusCounts.new || 0}</div></div>
                        <div className="kpi-card"><div className="kpi-label">📧 Contacted</div><div className="kpi-value" style={{ color: '#f39c12' }}>{campaignStatusCounts.contacted || 0}</div></div>
                        <div className="kpi-card"><div className="kpi-label">✅ Enrolled</div><div className="kpi-value" style={{ color: '#27ae60' }}>{campaignStatusCounts.enrolled || 0}</div></div>
                    </div>

                    {/* Status Filters */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                        {['all', 'new', 'contacted', 'qualified', 'enrolled', 'rejected'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)} style={{
                                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontSize: '0.76rem', fontWeight: statusFilter === s ? 700 : 500,
                                background: statusFilter === s ? 'var(--aw-navy)' : 'var(--muted-bg)',
                                color: statusFilter === s ? '#fff' : 'var(--muted)',
                            }}>
                                {s.charAt(0).toUpperCase() + s.slice(1)} {s !== 'all' && campaignStatusCounts[s] ? `(${campaignStatusCounts[s]})` : s === 'all' ? `(${campaignLeads.length})` : ''}
                            </button>
                        ))}
                    </div>

                    {/* Leads List */}
                    {campaignLoading ? (
                        <div className="card"><div className="empty-state" style={{ padding: 48 }}><div className="loading-spinner" /></div></div>
                    ) : filteredCampaignLeads.length === 0 ? (
                        <div className="card"><div className="empty-state" style={{ padding: 48 }}>
                            <div className="empty-state-icon">📭</div>
                            <div className="empty-state-title">No Leads Yet</div>
                            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Leads will appear here when people submit the application form.</p>
                        </div></div>
                    ) : (
                        <div className="card" style={{ padding: 0 }}>
                            {filteredCampaignLeads.map(lead => {
                                const sc = statusColors[lead.status] || statusColors.new;
                                const isExpanded = expandedLead === lead.id;
                                const leadActivities = activities[lead.id] || [];
                                return (
                                    <div key={lead.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                        {/* Lead Row */}
                                        <div onClick={() => { setExpandedLead(isExpanded ? null : lead.id); setActivityContent(''); }}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer', gap: 12 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{lead.firstName} {lead.lastName}</span>
                                                    <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color, fontWeight: 600, textTransform: 'uppercase' }}>{lead.status}</span>
                                                    {lead.form_type && (
                                                        <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 3, background: lead.form_type === 'application' ? 'rgba(0,26,112,0.08)' : 'rgba(201,168,76,0.12)', color: lead.form_type === 'application' ? 'var(--aw-navy)' : '#b8961f', fontWeight: 600, textTransform: 'uppercase' }}>
                                                            {lead.form_type === 'application' ? '📋 Application' : '💬 Inquiry'}
                                                        </span>
                                                    )}
                                                    {leadActivities.length > 0 && (
                                                        <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 3, background: 'rgba(108,92,231,0.08)', color: '#6c5ce7', fontWeight: 600 }}>
                                                            <MessageSquare size={10} style={{ verticalAlign: 'middle' }} /> {leadActivities.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
                                                    {lead.title && <span>{lead.title}{lead.company ? ` at ${lead.company}` : ''}</span>}
                                                    <span>📧 {lead.email}</span>
                                                    {lead.utm?.utm_source && <span>📡 {lead.utm.utm_source}/{lead.utm.utm_medium}</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{lead.submitted_at ? fmtDate(lead.submitted_at) : ''}</span>
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div style={{ padding: '0 20px 16px', background: 'var(--muted-bg)' }}>
                                                {/* Detail Fields */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14, paddingTop: 12 }}>
                                                    {[
                                                        { l: 'Phone', v: lead.phone },
                                                        { l: 'Company', v: lead.company },
                                                        { l: 'Title', v: lead.title },
                                                        { l: 'Sector', v: lead.sector },
                                                        { l: 'Company Size', v: lead.companySize },
                                                        { l: 'Experience', v: lead.yearsExperience ? `${lead.yearsExperience} yrs` : undefined },
                                                        { l: 'Participants', v: lead.participants },
                                                    ].filter(d => d.v).map(d => (
                                                        <div key={d.l}>
                                                            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{d.l}</span>
                                                            <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{d.v}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {lead.motivation && (
                                                    <div style={{ marginBottom: 12 }}>
                                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Motivation</span>
                                                        <p style={{ fontSize: '0.82rem', lineHeight: 1.6, margin: 0, padding: '8px 12px', background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--card-border)' }}>{lead.motivation}</p>
                                                    </div>
                                                )}

                                                {/* UTM */}
                                                {lead.utm && Object.keys(lead.utm).length > 0 && (
                                                    <div style={{ marginBottom: 12 }}>
                                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>UTM Attribution</span>
                                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                            {Object.entries(lead.utm).filter(([, v]) => v).map(([k, v]) => (
                                                                <span key={k} style={{ fontSize: '0.66rem', padding: '3px 8px', borderRadius: 4, background: 'rgba(0,26,112,0.06)', color: 'var(--aw-navy)', fontFamily: 'monospace' }}>
                                                                    {k}: {v}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Activity Log */}
                                                <div style={{ marginTop: 14, borderTop: '1px solid var(--card-border)', paddingTop: 14 }}>
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Activity Log</span>

                                                    {/* Add Activity */}
                                                    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                                                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                            {(['note', 'call', 'email', 'meeting'] as const).map(t => (
                                                                <button key={t} onClick={() => setActivityType(t)} style={{
                                                                    padding: '4px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                                                                    fontSize: '0.7rem', fontWeight: activityType === t ? 700 : 500,
                                                                    background: activityType === t ? ACTIVITY_COLORS[t] + '20' : 'var(--card-bg)',
                                                                    color: activityType === t ? ACTIVITY_COLORS[t] : 'var(--muted)',
                                                                }}>
                                                                    {ACTIVITY_ICONS[t]} {t[0].toUpperCase() + t.slice(1)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div style={{ display: 'flex', flex: 1, gap: 6, minWidth: 200 }}>
                                                            <input className="form-input" placeholder={`Add ${activityType}...`} value={activityContent}
                                                                onChange={e => setActivityContent(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') addActivity(lead.id); }}
                                                                style={{ fontSize: '0.8rem', padding: '5px 10px', flex: 1 }} />
                                                            <button onClick={() => addActivity(lead.id)} disabled={!activityContent.trim() || savingActivity} style={{
                                                                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                                                background: 'var(--aw-navy)', color: '#fff', fontSize: '0.76rem', fontWeight: 600,
                                                                opacity: !activityContent.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4,
                                                            }}>
                                                                <Send size={11} /> Add
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Timeline */}
                                                    {leadActivities.length > 0 ? (
                                                        <div style={{ borderLeft: '2px solid var(--card-border)', paddingLeft: 14, marginLeft: 6 }}>
                                                            {leadActivities.map(act => (
                                                                <div key={act.id} style={{ marginBottom: 10, position: 'relative' }}>
                                                                    <div style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: ACTIVITY_COLORS[act.type] || '#999', border: '2px solid var(--muted-bg)' }} />
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                                        <span style={{ fontSize: '0.66rem', fontWeight: 700, color: ACTIVITY_COLORS[act.type] || '#999', textTransform: 'uppercase' }}>
                                                                            {ACTIVITY_ICONS[act.type]} {act.type}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>
                                                                            {act.author} · {act.created_at ? fmtDate(act.created_at) : 'just now'}
                                                                        </span>
                                                                    </div>
                                                                    <p style={{ fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>{act.content}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p style={{ fontSize: '0.76rem', color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>No activity yet. Add a note, call, email, or meeting above.</p>
                                                    )}
                                                </div>

                                                {/* Status Actions */}
                                                {hasPermission('campaigns:read') && (
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14, borderTop: '1px solid var(--card-border)', paddingTop: 10 }}>
                                                        {['new', 'contacted', 'qualified', 'enrolled', 'rejected'].map(s => (
                                                            <button key={s} onClick={() => updateCampaignLeadStatus(lead.id, s)} disabled={lead.status === s}
                                                                style={{
                                                                    fontSize: '0.7rem', padding: '4px 10px', borderRadius: 5, cursor: lead.status === s ? 'default' : 'pointer',
                                                                    border: lead.status === s ? '2px solid var(--aw-navy)' : '1px solid var(--card-border)',
                                                                    background: lead.status === s ? 'var(--aw-navy)' : 'var(--card-bg)',
                                                                    color: lead.status === s ? '#fff' : 'var(--foreground)', fontWeight: lead.status === s ? 700 : 500,
                                                                }}>
                                                                {s.charAt(0).toUpperCase() + s.slice(1)}
                                                            </button>
                                                        ))}
                                                        {!isClient && (
                                                            <button onClick={() => deleteCampaignLead(lead.id)} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 5, border: '1px solid var(--danger)', color: 'var(--danger)', background: 'none', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Trash2 size={11} /> Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Internal Lead Form Modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{editingLead ? 'Edit Lead' : 'New Lead'}</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Company</label><input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group"><label className="form-label">Source</label><select className="form-input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value as Lead['source'] })}><option value="apollo">Apollo</option><option value="referral">Referral</option><option value="inbound">Inbound</option><option value="event">Event</option><option value="other">Other</option></select></div>
                                <div className="form-group"><label className="form-label">Priority</label><select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Lead['priority'] })}><option value="A">A — Hot</option><option value="B">B — Warm</option><option value="C">C — Cold</option></select></div>
                                <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Lead['status'] })}><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="proposal_sent">Proposal Sent</option><option value="converted">Converted</option></select></div>
                            </div>
                            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                {editingLead?.id && <button type="button" className="btn" style={{ color: 'var(--danger)', background: 'transparent' }} onClick={async () => { await leadsService.delete(editingLead.id!); setShowForm(false); }}>Delete</button>}
                                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingLead ? 'Update' : 'Create'} Lead</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
