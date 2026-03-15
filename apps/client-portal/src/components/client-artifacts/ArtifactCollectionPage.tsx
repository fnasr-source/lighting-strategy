'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Eye, FileText, Globe, Lock, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { clientsService, type Client } from '@/lib/firestore';
import {
    clientArtifactsService,
    getArtifactTypeLabel,
    slugify,
    type ClientArtifact,
    type ClientArtifactStatus,
    type ClientArtifactType,
    type ClientArtifactVisibility,
} from '@/lib/client-artifacts';

type ArtifactCollectionPageProps = {
    artifactType: ClientArtifactType;
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptyDescription: string;
    pageHint?: string;
    defaultLocale?: string;
};

type FormState = {
    clientId: string;
    title: string;
    slug: string;
    status: ClientArtifactStatus;
    visibility: ClientArtifactVisibility;
    summary: string;
    sourcePath: string;
    storageUrl: string;
    opsUrl: string;
    locale: string;
    version: string;
};

type TimestampLike = {
    toDate?: () => Date;
    toMillis?: () => number;
    seconds?: number;
} | string | number | Date | null | undefined;

function formatDate(value: TimestampLike): string {
    if (!value) return 'Not published yet';

    if (typeof value === 'object' && value !== null && typeof value.toDate === 'function') {
        return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(value.toDate());
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not published yet';
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

function buildEmptyForm(defaultLocale: string, clientId = ''): FormState {
    return {
        clientId,
        title: '',
        slug: '',
        status: 'draft',
        visibility: 'client',
        summary: '',
        sourcePath: '',
        storageUrl: '',
        opsUrl: '',
        locale: defaultLocale,
        version: 'v1',
    };
}

export default function ArtifactCollectionPage({
    artifactType,
    title,
    subtitle,
    emptyTitle,
    emptyDescription,
    pageHint,
    defaultLocale = 'en',
}: ArtifactCollectionPageProps) {
    const { accessibleClientIds, hasPermission, isAdmin, isClient, profile } = useAuth();
    const [artifacts, setArtifacts] = useState<ClientArtifact[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormState>(() => buildEmptyForm(defaultLocale));

    const canRead = hasPermission('artifacts:read');
    const canWrite = hasPermission('artifacts:write');
    const scopedClientIds = isAdmin ? undefined : accessibleClientIds;
    const defaultClientId = isClient ? (accessibleClientIds[0] || '') : '';

    useEffect(() => {
        if (!canRead) return;

        return clientArtifactsService.subscribe(
            {
                artifactTypes: [artifactType],
                clientIds: scopedClientIds,
                visibilities: isClient ? ['client'] : undefined,
            },
            setArtifacts,
        );
    }, [artifactType, canRead, isClient, scopedClientIds]);

    useEffect(() => {
        if (!canRead) return;

        return scopedClientIds
            ? clientsService.subscribeByIds(scopedClientIds, setClients)
            : clientsService.subscribe(setClients);
    }, [canRead, scopedClientIds]);

    if (!canRead) {
        return (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-state-icon">LOCK</div>
                    <div className="empty-state-title">Access Denied</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        This workspace requires `artifacts:read`.
                    </p>
                </div>
            </div>
        );
    }

    const clientNameById = new Map(clients.map((client) => [client.id || '', client.name]));

    const openForm = () => {
        const initialClientId = defaultClientId || (clients.length === 1 ? (clients[0]?.id || '') : '');
        setForm(buildEmptyForm(defaultLocale, initialClientId));
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setForm(buildEmptyForm(defaultLocale));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canWrite) return;

        const clientId = form.clientId || defaultClientId;
        const clientName = clientNameById.get(clientId);
        if (!clientId || !clientName || !form.title.trim()) return;

        await clientArtifactsService.create({
            clientId,
            clientName,
            artifactType,
            title: form.title.trim(),
            slug: slugify(form.slug || form.title),
            status: form.status,
            visibility: form.visibility,
            sourcePath: form.sourcePath.trim() || undefined,
            summary: form.summary.trim() || undefined,
            locale: form.locale.trim() || undefined,
            version: form.version.trim() || undefined,
            storageUrl: form.storageUrl.trim() || undefined,
            opsUrl: form.opsUrl.trim() || undefined,
            publishedBy: profile?.displayName || profile?.email || undefined,
        });

        resetForm();
    };

    const handleDelete = async (artifactId: string) => {
        if (!canWrite) return;
        if (!confirm('Delete this artifact record?')) return;
        await clientArtifactsService.delete(artifactId);
    };

    const typeLabel = getArtifactTypeLabel(artifactType);
    const countLabel = artifacts.length > 0
        ? `${subtitle} - ${artifacts.length} ${artifacts.length === 1 ? 'item' : 'items'}`
        : subtitle;

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <h1 className="page-title">{title}</h1>
                        <p className="page-subtitle">{countLabel}</p>
                    </div>
                    {canWrite && (
                        <button className="btn btn-primary" onClick={openForm}>
                            <Plus size={16} /> Add {typeLabel}
                        </button>
                    )}
                </div>
                {pageHint && (
                    <div className="card" style={{ marginTop: 16, padding: '14px 18px', borderStyle: 'dashed' }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{pageHint}</div>
                    </div>
                )}
            </div>

            {artifacts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">ART</div>
                        <div className="empty-state-title">{emptyTitle}</div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{emptyDescription}</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {artifacts.map((artifact) => (
                        <div key={artifact.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                <div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--aw-navy)' }}>
                                            {typeLabel}
                                        </span>
                                        <span className={`status-pill status-${artifact.status === 'published' ? 'paid' : artifact.status === 'archived' ? 'overdue' : 'pending'}`}>
                                            {artifact.status.replace('_', ' ')}
                                        </span>
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: '4px 8px',
                                                borderRadius: 999,
                                                fontSize: '0.66rem',
                                                background: artifact.visibility === 'client' ? 'rgba(204,159,83,0.15)' : 'rgba(0,26,112,0.08)',
                                                color: artifact.visibility === 'client' ? '#8e6620' : 'var(--aw-navy)',
                                            }}
                                        >
                                            {artifact.visibility === 'client' ? <Eye size={11} /> : <Lock size={11} />}
                                            {artifact.visibility}
                                        </span>
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '0.98rem', marginBottom: 4 }}>{artifact.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{artifact.clientName}</div>
                                </div>
                                {canWrite && artifact.id && (
                                    <button
                                        onClick={() => handleDelete(artifact.id!)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            {artifact.summary && (
                                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                                    {artifact.summary}
                                </p>
                            )}

                            <div style={{ display: 'grid', gap: 8, fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <span>Locale</span>
                                    <strong style={{ color: 'var(--foreground)' }}>{artifact.locale || 'n/a'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <span>Version</span>
                                    <strong style={{ color: 'var(--foreground)' }}>{artifact.version || 'n/a'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <span>Published</span>
                                    <strong style={{ color: 'var(--foreground)' }}>{formatDate(artifact.publishedAt)}</strong>
                                </div>
                                <div style={{ display: 'grid', gap: 4 }}>
                                    <span>Internal Source</span>
                                    <code style={{ fontSize: '0.7rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--foreground)' }}>
                                        {artifact.sourcePath || 'Managed inside admireworks-internal-os'}
                                    </code>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {artifact.opsUrl && (
                                    <a href={artifact.opsUrl} target="_blank" rel="noopener" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                        <Globe size={12} /> Open Ops URL
                                    </a>
                                )}
                                {artifact.storageUrl && (
                                    <a href={artifact.storageUrl} target="_blank" rel="noopener" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                        <ExternalLink size={12} /> Open File
                                    </a>
                                )}
                                {!artifact.opsUrl && !artifact.storageUrl && (
                                    <span className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: 0.7 }}>
                                        <FileText size={12} /> Pending publish
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                    onClick={resetForm}
                >
                    <div className="card" style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto' }} onClick={(event) => event.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add {typeLabel}</h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>
                                    Create a client-safe artifact record. Raw drafts stay inside the internal workspace folders.
                                </p>
                            </div>
                            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {!isClient && (
                                <div className="form-group">
                                    <label className="form-label">Client *</label>
                                    <select className="form-input" required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}>
                                        <option value="">Select a client...</option>
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>
                                                {client.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input
                                    className="form-input"
                                    required
                                    value={form.title}
                                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                                    placeholder={`Approved ${typeLabel.toLowerCase()} title`}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Slug</label>
                                    <input
                                        className="form-input"
                                        value={form.slug}
                                        onChange={(event) => setForm({ ...form, slug: event.target.value })}
                                        placeholder="auto-generated-if-empty"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Version</label>
                                    <input
                                        className="form-input"
                                        value={form.version}
                                        onChange={(event) => setForm({ ...form, version: event.target.value })}
                                        placeholder="v1"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ClientArtifactStatus })}>
                                        <option value="draft">Draft</option>
                                        <option value="in_review">In Review</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Visibility</label>
                                    <select className="form-input" value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ClientArtifactVisibility })}>
                                        <option value="client">Client Visible</option>
                                        <option value="internal">Internal Only</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Locale</label>
                                    <input className="form-input" value={form.locale} onChange={(event) => setForm({ ...form, locale: event.target.value })} placeholder="ar / en" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Summary</label>
                                <textarea className="form-input" rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Internal Source Path</label>
                                <input className="form-input" value={form.sourcePath} onChange={(event) => setForm({ ...form, sourcePath: event.target.value })} placeholder="clients/Client-Slug/strategy/..." />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Storage URL</label>
                                    <input className="form-input" value={form.storageUrl} onChange={(event) => setForm({ ...form, storageUrl: event.target.value })} placeholder="https://storage..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ops URL</label>
                                    <input className="form-input" value={form.opsUrl} onChange={(event) => setForm({ ...form, opsUrl: event.target.value })} placeholder="https://ops.admireworks.com/..." />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={resetForm}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Artifact
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
