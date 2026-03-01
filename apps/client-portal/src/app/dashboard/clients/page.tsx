'use client';

import { useEffect, useState } from 'react';
import { clientsService, type Client } from '@/lib/firestore';
import { Users, Plus, Search, X, Building, Globe, Mail, Phone } from 'lucide-react';

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', region: 'AE', baseCurrency: 'USD', status: 'prospect' as Client['status'], notes: '' });

    useEffect(() => { return clientsService.subscribe(setClients); }, []);

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    const openForm = (client?: Client) => {
        if (client) {
            setEditingClient(client);
            setForm({ name: client.name, company: client.company || '', email: client.email || '', phone: client.phone || '', region: client.region, baseCurrency: client.baseCurrency, status: client.status, notes: client.notes || '' });
        } else {
            setEditingClient(null);
            setForm({ name: '', company: '', email: '', phone: '', region: 'AE', baseCurrency: 'USD', status: 'prospect', notes: '' });
        }
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingClient?.id) {
            await clientsService.update(editingClient.id, form);
        } else {
            await clientsService.create(form);
        }
        setShowForm(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this client?')) await clientsService.delete(id);
    };

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Clients</h1>
                        <p className="page-subtitle">{clients.length} client{clients.length !== 1 ? 's' : ''} managed</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => openForm()}>
                        <Plus size={16} /> Add Client
                    </button>
                </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {filtered.map(c => (
                        <div key={c.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openForm(c)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>{c.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{c.company}</div>
                                </div>
                                <span className={`status-pill status-${c.status === 'active' ? 'active' : c.status === 'churned' ? 'overdue' : 'pending'}`}>{c.status}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--muted)' }}>
                                {c.region && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} />{c.region}</span>}
                                {c.baseCurrency && <span>{c.baseCurrency}</span>}
                                {c.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} />{c.email}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{editingClient ? 'Edit Client' : 'New Client'}</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Client Name *</label>
                                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Company</label>
                                <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
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
                                        <option value="USD">USD</option><option value="AED">AED</option><option value="EGP">EGP</option><option value="SAR">SAR</option><option value="GBP">GBP</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Client['status'] })}>
                                        <option value="lead">Lead</option><option value="prospect">Prospect</option><option value="proposal_sent">Proposal Sent</option><option value="active">Active</option><option value="churned">Churned</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>
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
