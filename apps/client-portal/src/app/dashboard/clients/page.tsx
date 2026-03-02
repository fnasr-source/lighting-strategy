'use client';

import { useEffect, useState } from 'react';
import { clientsService, type Client, type Contact } from '@/lib/firestore';
import { Plus, Search, X, Globe, Mail, Phone, UserPlus, Trash2 } from 'lucide-react';

const emptyContact = (): Contact => ({ name: '', email: '', phone: '', title: '', role: 'cc' });

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [form, setForm] = useState({ name: '', company: '', region: 'AE', baseCurrency: 'AED', status: 'prospect' as Client['status'], notes: '' });
    const [contacts, setContacts] = useState<Contact[]>([{ name: '', email: '', phone: '', title: '', role: 'primary' }]);

    useEffect(() => { return clientsService.subscribe(setClients); }, []);

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.contacts?.some(ct => ct.email.toLowerCase().includes(search.toLowerCase()) || ct.name.toLowerCase().includes(search.toLowerCase()))
    );

    const getPrimaryContact = (c: Client): Contact | null => {
        return c.contacts?.find(ct => ct.role === 'primary') || (c.email ? { name: c.name, email: c.email, phone: c.phone || '', role: 'primary' as const } : null);
    };

    const getCcContacts = (c: Client): Contact[] => {
        return c.contacts?.filter(ct => ct.role === 'cc') || [];
    };

    const openForm = (client?: Client) => {
        if (client) {
            setEditingClient(client);
            setForm({ name: client.name, company: client.company || '', region: client.region, baseCurrency: client.baseCurrency, status: client.status, notes: client.notes || '' });
            // Load contacts from client, or create one from legacy email/phone
            if (client.contacts && client.contacts.length > 0) {
                setContacts([...client.contacts]);
            } else {
                setContacts([{ name: '', email: client.email || '', phone: client.phone || '', title: '', role: 'primary' }]);
            }
        } else {
            setEditingClient(null);
            setForm({ name: '', company: '', region: 'AE', baseCurrency: 'AED', status: 'prospect', notes: '' });
            setContacts([{ name: '', email: '', phone: '', title: '', role: 'primary' }]);
        }
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Filter out contacts with no email
        const validContacts = contacts.filter(c => c.email.trim());
        const primary = validContacts.find(c => c.role === 'primary');

        const clientData = {
            ...form,
            contacts: validContacts,
            // Keep legacy fields synced with primary contact for backward compat
            email: primary?.email || '',
            phone: primary?.phone || '',
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

    const updateContact = (index: number, field: keyof Contact, value: string) => {
        const updated = [...contacts];
        (updated[index] as any)[field] = value;
        setContacts(updated);
    };

    const addContact = () => {
        setContacts([...contacts, emptyContact()]);
    };

    const removeContact = (index: number) => {
        if (contacts.length <= 1) return;
        const updated = contacts.filter((_, i) => i !== index);
        // Ensure at least one primary
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {filtered.map(c => {
                        const primary = getPrimaryContact(c);
                        const ccList = getCcContacts(c);
                        return (
                            <div key={c.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openForm(c)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>{c.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{c.company}</div>
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

                                <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--muted)', marginTop: 8 }}>
                                    {c.region && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} />{c.region}</span>}
                                    {c.baseCurrency && <span>{c.baseCurrency}</span>}
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
                                                {contact.role === 'cc' && <span style={{ fontSize: '0.72rem', color: '#999' }}>CC'd on emails</span>}
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
                                            <input className="form-input" type="email" placeholder="Email *" required={contact.role === 'primary'}
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
