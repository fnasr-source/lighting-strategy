'use client';

import { useEffect, useState } from 'react';
import { clientsService, type Client, type Contact } from '@/lib/firestore';
import { computeInvoiceDueDate, generateClientCode, type BillingCadence, type LegacyServiceCode } from '@/lib/billing';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, X, Globe, Mail, Phone, UserPlus, Trash2, ClipboardList, ExternalLink, History } from 'lucide-react';

const emptyContact = (): Contact => ({ name: '', email: '', phone: '', title: '', role: 'cc' });
const today = () => new Date().toISOString().slice(0, 10);

type ClientFormState = {
    name: string;
    company: string;
    region: string;
    baseCurrency: string;
    status: Client['status'];
    clientCode: string;
    legacyServiceCode: LegacyServiceCode;
    billingCadence: BillingCadence;
    billingStatusLabel: string;
    nextInvoiceSendDate: string;
    nextInvoiceDueDate: string;
    legacyRateModel: string;
    marketRegion: string;
    platformCount: string;
    notes: string;
};

type OnboardingVersionSummary = {
    id: string;
    versionNumber: number;
    reason: 'seeded' | 'draft_saved' | 'submitted' | 'resubmitted';
    savedAt: string;
    changedFieldLabelsAr: string[];
    changedFieldLabelsEn: string[];
    statusAfter: 'draft' | 'submitted';
};

type ClientOnboardingSummary = {
    id: string;
    clientId: string;
    status: 'draft' | 'submitted';
    versionCount: number;
    latestVersionNumber: number;
    lastVersionAt?: string | null;
    lastSavedAt?: string | null;
    submittedAt?: string | null;
    submissionCount: number;
    publicUrl: string;
    recentVersions: OnboardingVersionSummary[];
};

function formatHistoryDate(iso?: string | null) {
    if (!iso) return 'N/A';
    try {
        return new Date(iso).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

function versionReasonLabel(reason: OnboardingVersionSummary['reason']) {
    if (reason === 'seeded') return 'Initial prefill';
    if (reason === 'draft_saved') return 'Client update saved';
    if (reason === 'submitted') return 'Client submitted';
    return 'Client resubmitted';
}

export default function ClientsPage() {
    const { user, isInternal } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [onboardingByClientId, setOnboardingByClientId] = useState<Record<string, ClientOnboardingSummary>>({});
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const buildDefaultForm = (): ClientFormState => {
        const sendDate = today();
        return {
            name: '',
            company: '',
            region: 'AE',
            baseCurrency: 'AED',
            status: 'prospect',
            clientCode: generateClientCode(sendDate, clients.map((client) => client.clientCode || '').filter(Boolean)),
            legacyServiceCode: 'Ad Mgt',
            billingCadence: 'monthly',
            billingStatusLabel: '',
            nextInvoiceSendDate: sendDate,
            nextInvoiceDueDate: computeInvoiceDueDate(sendDate, 3),
            legacyRateModel: '',
            marketRegion: '',
            platformCount: '1',
            notes: '',
        };
    };
    const [form, setForm] = useState<ClientFormState>(buildDefaultForm);
    const [contacts, setContacts] = useState<Contact[]>([{ name: '', email: '', phone: '', title: '', role: 'primary' }]);

    useEffect(() => { return clientsService.subscribe(setClients); }, []);

    useEffect(() => {
        if (!user || !isInternal) {
            setOnboardingByClientId({});
            return;
        }

        let active = true;
        const run = async () => {
            try {
                const token = await user.getIdToken();
                const res = await fetch('/api/admin/onboarding/forms', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load onboarding summaries');
                if (!active) return;

                const nextMap = (data.forms || []).reduce((acc: Record<string, ClientOnboardingSummary>, form: ClientOnboardingSummary) => {
                    acc[form.clientId] = form;
                    return acc;
                }, {});
                setOnboardingByClientId(nextMap);
            } catch (err) {
                console.error('Failed to load onboarding summaries', err);
            }
        };

        run();
        return () => { active = false; };
    }, [user, isInternal]);

    const statusPriority: Record<string, number> = { active: 0, proposal_sent: 1, prospect: 2, lead: 3, churned: 4 };

    const [statusTab, setStatusTab] = useState('all');

    const filtered = clients
        .filter(c =>
            (c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.company?.toLowerCase().includes(search.toLowerCase()) ||
                c.email?.toLowerCase().includes(search.toLowerCase()) ||
                c.contacts?.some(ct => ct.email.toLowerCase().includes(search.toLowerCase()) || ct.name.toLowerCase().includes(search.toLowerCase())))
            && (statusTab === 'all' || (statusTab === 'pipeline' ? ['lead', 'prospect', 'proposal_sent'].includes(c.status) : c.status === statusTab))
        )
        .sort((a, b) => (statusPriority[a.status] ?? 5) - (statusPriority[b.status] ?? 5));

    const activeCount = clients.filter(c => c.status === 'active').length;
    const pipelineCount = clients.filter(c => ['lead', 'prospect', 'proposal_sent'].includes(c.status)).length;
    const churnedCount = clients.filter(c => c.status === 'churned').length;

    const getPrimaryContact = (c: Client): Contact | null => {
        return c.contacts?.find(ct => ct.role === 'primary') || (c.email ? { name: c.name, email: c.email, phone: c.phone || '', role: 'primary' as const } : null);
    };

    const getCcContacts = (c: Client): Contact[] => {
        return c.contacts?.filter(ct => ct.role === 'cc') || [];
    };

    const currentOnboarding = editingClient?.id ? onboardingByClientId[editingClient.id] : null;

    const openForm = (client?: Client) => {
        if (client) {
            setEditingClient(client);
            setForm({
                name: client.name,
                company: client.company || '',
                region: client.region,
                baseCurrency: client.baseCurrency,
                status: client.status,
                clientCode: client.clientCode || '',
                legacyServiceCode: client.legacyServiceCode || 'Ad Mgt',
                billingCadence: client.billingCadence || 'monthly',
                billingStatusLabel: client.billingStatusLabel || '',
                nextInvoiceSendDate: client.nextInvoiceSendDate || '',
                nextInvoiceDueDate: client.nextInvoiceDueDate || '',
                legacyRateModel: client.legacyRateModel || '',
                marketRegion: client.marketRegion || '',
                platformCount: String(client.platformCount || 1),
                notes: client.notes || '',
            });
            if (client.contacts && client.contacts.length > 0) {
                setContacts([...client.contacts]);
            } else {
                setContacts([{ name: '', email: client.email || '', phone: client.phone || '', title: '', role: 'primary' }]);
            }
        } else {
            setEditingClient(null);
            setForm(buildDefaultForm());
            setContacts([{ name: '', email: '', phone: '', title: '', role: 'primary' }]);
        }
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validContacts = contacts.filter(c => c.email.trim());
        const primary = validContacts.find(c => c.role === 'primary');
        const clientData = {
            ...form,
            contacts: validContacts,
            email: primary?.email || '',
            phone: primary?.phone || '',
            platformCount: Number(form.platformCount) || 1,
        };
        if (editingClient?.id) {
            await clientsService.update(editingClient.id, clientData);
        } else {
            await clientsService.create(clientData);
        }
        setShowForm(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this client?')) await clientsService.delete(id);
    };

    const updateContact = (index: number, field: Exclude<keyof Contact, 'role'>, value: string) => {
        setContacts((current) => current.map((contact, contactIndex) => (
            contactIndex === index ? { ...contact, [field]: value } : contact
        )));
    };

    const addContact = () => {
        setContacts([...contacts, emptyContact()]);
    };

    const removeContact = (index: number) => {
        if (contacts.length <= 1) return;
        const updated = contacts.filter((_, i) => i !== index);
        if (!updated.some(c => c.role === 'primary')) updated[0].role = 'primary';
        setContacts(updated);
    };

    const setPrimary = (index: number) => {
        const updated = contacts.map((c, i) => ({ ...c, role: (i === index ? 'primary' : 'cc') as Contact['role'] }));
        setContacts(updated);
    };

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Clients</h1>
                        <p className="page-subtitle">{activeCount} active · {pipelineCount} pipeline · {churnedCount} churned</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => openForm()}>
                        <Plus size={16} /> Add Client
                    </button>
                </div>
            </div>

            {/* Status Tabs + Search */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {[
                    { key: 'all', label: `All (${clients.length})` },
                    { key: 'active', label: `Active (${activeCount})` },
                    { key: 'pipeline', label: `Pipeline (${pipelineCount})` },
                    { key: 'churned', label: `Churned (${churnedCount})` },
                ].map(t => (
                    <button key={t.key} onClick={() => setStatusTab(t.key)} style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: statusTab === t.key ? 700 : 500,
                        background: statusTab === t.key ? 'var(--aw-navy)' : 'var(--muted-bg)',
                        color: statusTab === t.key ? '#fff' : 'var(--muted)',
                    }}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ position: 'relative', maxWidth: 400 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input type="text" className="form-input" placeholder="Search clients..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <div className="empty-state-title">{search ? 'No matching clients' : 'No Clients Yet'}</div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Add your first client to get started.</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {filtered.map(c => {
                        const primary = getPrimaryContact(c);
                        const ccList = getCcContacts(c);
                        const onboarding = c.id ? onboardingByClientId[c.id] : null;
                        return (
                            <div key={c.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openForm(c)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>{c.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{c.company}</div>
                                        {(c.clientCode || c.legacyServiceCode) && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>
                                                {[c.clientCode, c.legacyServiceCode, c.billingCadence].filter(Boolean).join(' · ')}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`status-pill status-${c.status === 'active' ? 'active' : c.status === 'churned' ? 'overdue' : 'pending'}`}>{c.status}</span>
                                </div>

                                {/* Primary Contact */}
                                {primary && (
                                    <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 8 }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                            Primary Contact {primary.title && `· ${primary.title}`}
                                        </div>
                                        {primary.name && <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{primary.name}</div>}
                                        <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2, flexWrap: 'wrap' }}>
                                            {primary.email && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={11} />{primary.email}</span>}
                                            {primary.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={11} />{primary.phone}</span>}
                                        </div>
                                    </div>
                                )}

                                {/* CC Contacts */}
                                {ccList.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                        <span style={{ fontWeight: 600 }}>CC:</span>{' '}
                                        {ccList.map((cc, i) => (
                                            <span key={i}>{cc.name || cc.email}{i < ccList.length - 1 ? ', ' : ''}</span>
                                        ))}
                                    </div>
                                )}

                                {onboarding && (
                                    <div style={{
                                        marginTop: 12,
                                        padding: '12px 14px',
                                        borderRadius: 10,
                                        border: '1px solid rgba(24, 51, 40, 0.1)',
                                        background: 'rgba(24, 51, 40, 0.035)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <ClipboardList size={14} color="#183328" />
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#183328' }}>Onboarding Brief</span>
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            <span>Status: {onboarding.status}</span>
                                            <span>Versions: {onboarding.versionCount}</span>
                                            <span>Submissions: {onboarding.submissionCount}</span>
                                        </div>
                                        {onboarding.lastVersionAt && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 6 }}>
                                                Last activity: {formatHistoryDate(onboarding.lastVersionAt)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--muted)', marginTop: 8 }}>
                                    {c.region && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} />{c.region}</span>}
                                    {c.baseCurrency && <span>{c.baseCurrency}</span>}
                                    {c.nextInvoiceSendDate && <span>Send: {c.nextInvoiceSendDate}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Form Modal ── */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{editingClient ? 'Edit Client' : 'New Client'}</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Client / Company Name *</label>
                                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Company / Brand Names</label>
                                <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="e.g. QYD, RQM & Ceyaj" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Client Code</label>
                                    <input className="form-input" value={form.clientCode} onChange={e => setForm({ ...form, clientCode: e.target.value })} placeholder="YYYY-MM-DD-01" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Legacy Service</label>
                                    <select className="form-input" value={form.legacyServiceCode} onChange={e => setForm({ ...form, legacyServiceCode: e.target.value as LegacyServiceCode })}>
                                        <option value="Ad Mgt">Ad Mgt</option>
                                        <option value="DRM">DRM</option>
                                        <option value="DRM+SM">DRM+SM</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Billing Cadence</label>
                                    <select className="form-input" value={form.billingCadence} onChange={e => setForm({ ...form, billingCadence: e.target.value as BillingCadence })}>
                                        <option value="monthly">Monthly</option>
                                        <option value="2_months">2 Months</option>
                                        <option value="3_months">3 Months</option>
                                        <option value="6_months">6 Months</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annual">Annual</option>
                                        <option value="one_time">One-Time</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Next Invoice Send</label>
                                    <input
                                        className="form-input"
                                        type="date"
                                        value={form.nextInvoiceSendDate}
                                        onChange={e => setForm({
                                            ...form,
                                            nextInvoiceSendDate: e.target.value,
                                            nextInvoiceDueDate: e.target.value ? computeInvoiceDueDate(e.target.value, 3) : '',
                                        })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Next Invoice Due</label>
                                    <input className="form-input" type="date" value={form.nextInvoiceDueDate} onChange={e => setForm({ ...form, nextInvoiceDueDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Billing Status Label</label>
                                    <input className="form-input" value={form.billingStatusLabel} onChange={e => setForm({ ...form, billingStatusLabel: e.target.value })} placeholder="e.g. 45 DAYS REMAINING" />
                                </div>
                            </div>

                            {/* ── Contacts Section ── */}
                            <div style={{ marginTop: 16, marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <label className="form-label" style={{ margin: 0 }}>Contacts</label>
                                    <button type="button" onClick={addContact} style={{
                                        display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
                                        fontSize: '0.75rem', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600,
                                    }}>
                                        <UserPlus size={12} /> Add Contact
                                    </button>
                                </div>

                                {contacts.map((contact, i) => (
                                    <div key={i} style={{
                                        padding: '14px 16px', background: contact.role === 'primary' ? 'rgba(0,26,112,0.03)' : 'var(--bg)',
                                        border: contact.role === 'primary' ? '1.5px solid rgba(0,26,112,0.15)' : '1px solid var(--border)',
                                        borderRadius: 10, marginBottom: 10,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <button type="button" onClick={() => setPrimary(i)} style={{
                                                    padding: '2px 8px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 700,
                                                    border: 'none', cursor: 'pointer', letterSpacing: '0.3px',
                                                    background: contact.role === 'primary' ? '#001a70' : '#e5e7eb',
                                                    color: contact.role === 'primary' ? '#fff' : '#666',
                                                }}>
                                                    {contact.role === 'primary' ? '★ PRIMARY' : 'CC'}
                                                </button>
                                                {contact.role === 'primary' && <span style={{ fontSize: '0.72rem', color: '#666' }}>Receives invoices & receipts</span>}
                                                {contact.role === 'cc' && <span style={{ fontSize: '0.72rem', color: '#999' }}>CC&apos;d on emails</span>}
                                            </div>
                                            {contacts.length > 1 && (
                                                <button type="button" onClick={() => removeContact(i)} style={{
                                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4,
                                                }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                                            <input className="form-input" placeholder="Full name" value={contact.name}
                                                onChange={e => updateContact(i, 'name', e.target.value)}
                                                style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                                            />
                                            <input className="form-input" placeholder="Title (e.g. CEO)" value={contact.title || ''}
                                                onChange={e => updateContact(i, 'title', e.target.value)}
                                                style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            <input className="form-input" type="email" placeholder="Email"
                                                value={contact.email} onChange={e => updateContact(i, 'email', e.target.value)}
                                                style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                                            />
                                            <input className="form-input" placeholder="Phone" value={contact.phone || ''}
                                                onChange={e => updateContact(i, 'phone', e.target.value)}
                                                style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Region</label>
                                    <select className="form-input" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}>
                                        <option value="AE">UAE</option><option value="EG">Egypt</option><option value="SA">Saudi</option><option value="US">US</option><option value="UK">UK</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Currency</label>
                                    <select className="form-input" value={form.baseCurrency} onChange={e => setForm({ ...form, baseCurrency: e.target.value })}>
                                        <option value="AED">AED</option><option value="USD">USD</option><option value="EGP">EGP</option><option value="SAR">SAR</option><option value="GBP">GBP</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Client['status'] })}>
                                        <option value="lead">Lead</option><option value="prospect">Prospect</option><option value="proposal_sent">Proposal Sent</option><option value="active">Active</option><option value="churned">Churned</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Market Region</label>
                                    <input className="form-input" value={form.marketRegion} onChange={e => setForm({ ...form, marketRegion: e.target.value })} placeholder="e.g. Egypt" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Platform Count</label>
                                    <input className="form-input" type="number" min="1" value={form.platformCount} onChange={e => setForm({ ...form, platformCount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Legacy Rate Model</label>
                                    <input className="form-input" value={form.legacyRateModel} onChange={e => setForm({ ...form, legacyRateModel: e.target.value })} placeholder="e.g. eg_old_clients_260usd_equivalent" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>

                            {currentOnboarding && (
                                <div style={{
                                    marginTop: 20,
                                    paddingTop: 18,
                                    borderTop: '1px solid var(--border)',
                                    display: 'grid',
                                    gap: 14,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--primary)' }}>
                                                <ClipboardList size={16} /> Onboarding Brief
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
                                                Status: {currentOnboarding.status} · Versions: {currentOnboarding.versionCount} · Latest: V{currentOnboarding.latestVersionNumber || 0}
                                            </div>
                                        </div>
                                        <a
                                            href={currentOnboarding.publicUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                background: 'var(--bg)',
                                                border: '1px solid var(--border)',
                                                textDecoration: 'none',
                                                color: 'var(--primary)',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <ExternalLink size={14} /> Open Public Form
                                        </a>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>Last Save</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{formatHistoryDate(currentOnboarding.lastSavedAt)}</div>
                                        </div>
                                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>Last Version</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{formatHistoryDate(currentOnboarding.lastVersionAt)}</div>
                                        </div>
                                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>Submissions</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{currentOnboarding.submissionCount}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.88rem' }}>
                                            <History size={15} /> Version History
                                        </div>
                                        {currentOnboarding.recentVersions.length === 0 ? (
                                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>No version history recorded yet.</div>
                                        ) : (
                                            currentOnboarding.recentVersions.map((version) => (
                                                <div key={version.id} style={{
                                                    padding: '12px 14px',
                                                    borderRadius: 10,
                                                    border: '1px solid var(--border)',
                                                    background: '#fff',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                                        <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                                                            V{version.versionNumber} · {versionReasonLabel(version.reason)}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                                            {formatHistoryDate(version.savedAt)}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>
                                                        Status after update: {version.statusAfter}
                                                    </div>
                                                    {(version.changedFieldLabelsEn.length > 0 || version.changedFieldLabelsAr.length > 0) && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                                                            Changed: {(version.changedFieldLabelsEn.length > 0 ? version.changedFieldLabelsEn : version.changedFieldLabelsAr).slice(0, 5).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                                {editingClient && <button type="button" className="btn" style={{ color: 'var(--danger)', background: 'transparent' }} onClick={() => { handleDelete(editingClient.id!); setShowForm(false); }}>Delete</button>}
                                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingClient ? 'Update' : 'Create'} Client</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
