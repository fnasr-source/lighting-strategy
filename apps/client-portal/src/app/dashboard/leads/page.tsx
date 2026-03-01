'use client';

import { useEffect, useState } from 'react';
import { leadsService, type Lead } from '@/lib/firestore';
import { Target, Plus, X } from 'lucide-react';

const PRIORITY_COLORS = { A: 'var(--danger)', B: 'var(--aw-gold)', C: 'var(--muted)' };

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', source: 'inbound' as Lead['source'], priority: 'B' as Lead['priority'], status: 'new' as Lead['status'], notes: '' });

    useEffect(() => { return leadsService.subscribe(setLeads); }, []);

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

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Leads</h1>
                        <p className="page-subtitle">{leads.length} lead{leads.length !== 1 ? 's' : ''} in pipeline</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => openForm()}><Plus size={16} /> Add Lead</button>
                </div>
            </div>

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
                                            <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, background: PRIORITY_COLORS[l.priority] + '20', color: PRIORITY_COLORS[l.priority] }}>{l.priority}</span>
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
