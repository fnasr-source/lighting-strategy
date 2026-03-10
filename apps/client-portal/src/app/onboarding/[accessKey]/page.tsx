'use client';

import { startTransition, useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import {
    countSectionCompletion,
    type ClientOnboardingResponses,
    type OnboardingField,
    type OnboardingFieldState,
    type OnboardingSection,
    onboardingStateLabels,
} from '@/lib/onboarding';

type ApiPayload = {
    form: {
        clientName: string;
        slug: string;
        language: 'ar-en';
        platform: 'zid';
        status: 'draft' | 'submitted';
        responses: ClientOnboardingResponses;
        fieldStates: Record<string, OnboardingFieldState>;
        lastSavedAt?: string | null;
        submittedAt?: string | null;
        submissionCount?: number;
    };
    schema: {
        titleAr: string;
        titleEn: string;
        introAr: string;
        introEn: string;
        sections: OnboardingSection[];
    };
};

type ValidationIssue = {
    id: string;
    labelAr: string;
    labelEn: string;
    reason?: string;
};

function formatDate(iso?: string | null) {
    if (!iso) return '';
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

function badgeStyle(tone: 'green' | 'amber' | 'navy' | 'slate') {
    if (tone === 'green') return { background: 'rgba(37, 99, 67, 0.12)', color: '#255e43', borderColor: 'rgba(37, 99, 67, 0.18)' };
    if (tone === 'amber') return { background: 'rgba(191, 134, 42, 0.12)', color: '#8c651f', borderColor: 'rgba(191, 134, 42, 0.18)' };
    if (tone === 'navy') return { background: 'rgba(24, 51, 40, 0.08)', color: '#183328', borderColor: 'rgba(24, 51, 40, 0.18)' };
    return { background: 'rgba(100, 116, 139, 0.12)', color: '#475569', borderColor: 'rgba(100, 116, 139, 0.18)' };
}

function FieldInput(props: {
    field: OnboardingField;
    value: string;
    state: OnboardingFieldState;
    onChange: (value: string) => void;
}) {
    const { field, value, state, onChange } = props;
    const label = onboardingStateLabels[state];
    const pill = badgeStyle(label.tone);
    const commonStyle: CSSProperties = {
        width: '100%',
        borderRadius: 14,
        border: '1px solid rgba(24, 51, 40, 0.14)',
        background: '#fffcf8',
        color: '#173428',
        padding: field.type === 'textarea' ? '16px 18px' : '15px 18px',
        fontSize: 15,
        lineHeight: 1.55,
        outline: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
    };

    const inputProps = {
        value,
        onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
        placeholder: field.placeholderAr || field.labelAr,
        dir: 'rtl' as const,
        style: commonStyle,
    };

    return (
        <div style={{ padding: '22px 0', borderTop: '1px solid rgba(24, 51, 40, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 340px' }}>
                    <label style={{ display: 'block', marginBottom: 4, color: '#183328', fontWeight: 700, fontSize: 16 }}>
                        {field.labelAr}
                    </label>
                    <p style={{ margin: 0, color: '#6c736c', fontSize: 13 }}>{field.labelEn}</p>
                    {(field.helperAr || field.helperEn) && (
                        <p style={{ margin: '8px 0 0', color: '#687076', fontSize: 13 }}>
                            {field.helperAr}
                            {field.helperAr && field.helperEn ? ' · ' : ''}
                            {field.helperEn}
                        </p>
                    )}
                </div>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: 999,
                    border: `1px solid ${pill.borderColor}`,
                    background: pill.background,
                    color: pill.color,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '8px 12px',
                    whiteSpace: 'nowrap',
                }}>
                    {label.ar}
                </span>
            </div>

            <div style={{ marginTop: 14 }}>
                {field.type === 'textarea' ? (
                    <textarea
                        {...inputProps}
                        rows={6}
                    />
                ) : (
                    <input
                        {...inputProps}
                        type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
                    />
                )}
            </div>
        </div>
    );
}

export default function EinAbayaOnboardingPage() {
    const params = useParams<{ accessKey: string }>();
    const accessKey = String(params?.accessKey || '');

    const [payload, setPayload] = useState<ApiPayload | null>(null);
    const [responses, setResponses] = useState<ClientOnboardingResponses>({});
    const [status, setStatus] = useState<'draft' | 'submitted'>('draft');
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [submittedAt, setSubmittedAt] = useState<string | null>(null);
    const [submissionCount, setSubmissionCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [missingFields, setMissingFields] = useState<ValidationIssue[]>([]);
    const [invalidFields, setInvalidFields] = useState<ValidationIssue[]>([]);

    useEffect(() => {
        if (!accessKey) return;

        const run = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`/api/onboarding/${accessKey}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load onboarding form');

                setPayload(data);
                setResponses(data.form.responses || {});
                setStatus(data.form.status || 'draft');
                setLastSavedAt(data.form.lastSavedAt || null);
                setSubmittedAt(data.form.submittedAt || null);
                setSubmissionCount(data.form.submissionCount || 0);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load onboarding form');
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [accessKey]);

    const sections = useMemo(() => payload?.schema.sections || [], [payload]);
    const fieldStates = payload?.form.fieldStates || {};
    const sectionProgress = useMemo(
        () => sections.map((section) => ({ sectionId: section.id, ...countSectionCompletion(section, responses) })),
        [sections, responses]
    );

    const handleChange = (fieldId: string, value: string) => {
        setResponses((current) => ({ ...current, [fieldId]: value }));
        setSuccess('');
        setError('');
    };

    const saveDraft = async () => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch(`/api/onboarding/${accessKey}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responses }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save draft');

            startTransition(() => {
                setLastSavedAt(data.lastSavedAt || null);
                setSuccess('تم حفظ المسودة بنجاح. Draft saved successfully.');
            });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save draft');
        } finally {
            setSaving(false);
        }
    };

    const submitForm = async () => {
        setSubmitting(true);
        setError('');
        setSuccess('');
        setMissingFields([]);
        setInvalidFields([]);
        try {
            const res = await fetch(`/api/onboarding/${accessKey}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responses }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMissingFields(data.missingFields || []);
                setInvalidFields(data.invalidFields || []);
                throw new Error(data.error || 'Failed to submit form');
            }

            startTransition(() => {
                setStatus('submitted');
                setSubmittedAt(data.submittedAt || null);
                setSubmissionCount(data.submissionCount || submissionCount);
                setLastSavedAt(data.submittedAt || null);
                setSuccess('تم إرسال النموذج بنجاح. You can still return later and update it if needed.');
            });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to submit form');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <main style={{ minHeight: '100vh', background: '#efe8dc', display: 'grid', placeItems: 'center', padding: 24 }}>
                <div style={{ textAlign: 'center', color: '#183328' }}>
                    <div style={{ width: 72, height: 72, margin: '0 auto 16px', borderRadius: 20, background: '#183328', color: '#d6b16c', display: 'grid', placeItems: 'center', fontWeight: 800 }}>AW</div>
                    <p>Loading onboarding form...</p>
                </div>
            </main>
        );
    }

    if (!payload) {
        return (
            <main style={{ minHeight: '100vh', background: '#efe8dc', display: 'grid', placeItems: 'center', padding: 24 }}>
                <div style={{ maxWidth: 520, background: '#fffdfa', border: '1px solid #e5dccf', borderRadius: 24, padding: 28, color: '#183328', textAlign: 'center' }}>
                    <h1 style={{ marginBottom: 12, fontSize: 28 }}>تعذر تحميل النموذج</h1>
                    <p style={{ color: '#5f6c62' }}>{error || 'This onboarding page is unavailable.'}</p>
                </div>
            </main>
        );
    }

    return (
        <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #f7f0e4 0%, #efe8dc 45%, #ebe1d2 100%)', padding: '28px 16px 64px' }}>
            <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gap: 20 }}>
                <section style={{
                    background: 'linear-gradient(135deg, #183328 0%, #27493a 60%, #4d5f54 100%)',
                    color: '#f6efe2',
                    borderRadius: 28,
                    padding: '28px 28px 22px',
                    boxShadow: '0 24px 80px rgba(24, 51, 40, 0.18)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div style={{ maxWidth: 760 }}>
                            <p style={{ margin: 0, color: '#d6b16c', letterSpacing: 1.8, fontSize: 12, fontWeight: 800 }}>EIN ABAYA × ADMIREWORKS</p>
                            <h1 style={{ margin: '10px 0 10px', fontSize: 38, lineHeight: 1.05 }}>استبيان الانطلاق المعبأ مسبقاً</h1>
                            <p style={{ margin: 0, fontSize: 17, color: 'rgba(246,239,226,0.88)', maxWidth: 680 }}>{payload.schema.introAr}</p>
                            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'rgba(246,239,226,0.72)' }}>{payload.schema.introEn}</p>
                        </div>
                        <div style={{
                            minWidth: 260,
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 20,
                            padding: 18,
                            backdropFilter: 'blur(10px)',
                        }}>
                            <p style={{ margin: 0, fontSize: 12, color: '#d6b16c', fontWeight: 700 }}>CURRENT STATUS</p>
                            <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 800 }}>{status === 'submitted' ? 'Submitted' : 'Draft in progress'}</p>
                            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(246,239,226,0.72)' }}>Platform: {payload.form.platform.toUpperCase()}</p>
                            {lastSavedAt && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(246,239,226,0.72)' }}>Last saved: {formatDate(lastSavedAt)}</p>}
                            {submittedAt && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(246,239,226,0.72)' }}>Submitted: {formatDate(submittedAt)}</p>}
                        </div>
                    </div>
                </section>

                <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 300px) minmax(0, 1fr)', gap: 20 }}>
                    <aside style={{ alignSelf: 'start', position: 'sticky', top: 20 }}>
                        <div style={{ background: '#fffdfa', border: '1px solid #e6dccb', borderRadius: 24, padding: 22, boxShadow: '0 12px 40px rgba(24, 51, 40, 0.06)' }}>
                            <p style={{ margin: 0, color: '#183328', fontWeight: 800, fontSize: 14 }}>Section Progress</p>
                            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                                {sections.map((section) => {
                                    const progress = sectionProgress.find((item) => item.sectionId === section.id);
                                    const percent = progress ? Math.round((progress.answered / progress.total) * 100) : 0;
                                    return (
                                        <a key={section.id} href={`#${section.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <div style={{ padding: 14, borderRadius: 16, background: '#f6f0e6', border: '1px solid #ece1cf' }}>
                                                <p style={{ margin: 0, color: '#183328', fontWeight: 700, fontSize: 14 }}>{section.titleAr}</p>
                                                <p style={{ margin: '3px 0 10px', color: '#6f766f', fontSize: 12 }}>{section.titleEn}</p>
                                                <div style={{ height: 8, borderRadius: 999, background: '#e3d8c6', overflow: 'hidden' }}>
                                                    <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #183328, #b9904d)' }} />
                                                </div>
                                                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#5f665e' }}>{progress?.answered || 0} / {progress?.total || 0} answered</p>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #ece1cf' }}>
                                <button onClick={saveDraft} disabled={saving} style={buttonStyle('outline')}>
                                    {saving ? 'Saving...' : 'حفظ المسودة'}
                                </button>
                                <button onClick={submitForm} disabled={submitting} style={{ ...buttonStyle('solid'), marginTop: 10 }}>
                                    {submitting ? 'Submitting...' : status === 'submitted' ? 'إرسال التحديث' : 'إرسال النموذج'}
                                </button>
                                <p style={{ margin: '12px 0 0', fontSize: 12, color: '#6f766f' }}>
                                    يمكنكم الرجوع لاحقاً وتعديل البيانات حتى بعد الإرسال.
                                </p>
                            </div>
                        </div>
                    </aside>

                    <div style={{ display: 'grid', gap: 20 }}>
                        {(error || success || missingFields.length > 0 || invalidFields.length > 0) && (
                            <div style={{
                                background: '#fffdfa',
                                border: `1px solid ${error ? '#ef4444' : '#d7c9b3'}`,
                                borderRadius: 22,
                                padding: 22,
                            }}>
                                {error && <p style={{ margin: 0, color: '#b42318', fontWeight: 700 }}>{error}</p>}
                                {success && <p style={{ margin: error ? '10px 0 0' : 0, color: '#255e43', fontWeight: 700 }}>{success}</p>}
                                {missingFields.length > 0 && (
                                    <div style={{ marginTop: 14 }}>
                                        <p style={{ margin: 0, color: '#183328', fontWeight: 700 }}>حقول مطلوبة ما زالت ناقصة</p>
                                        <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#5b6470' }}>
                                            {missingFields.map((field) => (
                                                <li key={field.id}>{field.labelAr} · {field.labelEn}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {invalidFields.length > 0 && (
                                    <div style={{ marginTop: 14 }}>
                                        <p style={{ margin: 0, color: '#183328', fontWeight: 700 }}>حقول تحتاج تنسيق صحيح</p>
                                        <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#5b6470' }}>
                                            {invalidFields.map((field) => (
                                                <li key={field.id}>{field.labelAr} · {field.labelEn}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {sections.map((section) => (
                            <section
                                key={section.id}
                                id={section.id}
                                style={{
                                    background: '#fffdfa',
                                    border: '1px solid #e6dccb',
                                    borderRadius: 28,
                                    padding: 28,
                                    boxShadow: '0 18px 50px rgba(24, 51, 40, 0.06)',
                                }}
                            >
                                <div style={{ paddingBottom: 8 }}>
                                    <p style={{ margin: 0, color: '#b9904d', fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>{section.titleEn.toUpperCase()}</p>
                                    <h2 style={{ margin: '8px 0 4px', color: '#183328', fontSize: 30 }}>{section.titleAr}</h2>
                                    <p style={{ margin: 0, color: '#5f665e', fontSize: 15 }}>{section.descriptionAr}</p>
                                    <p style={{ margin: '6px 0 0', color: '#7b8079', fontSize: 13 }}>{section.descriptionEn}</p>
                                </div>

                                {section.fields.map((field) => (
                                    <FieldInput
                                        key={field.id}
                                        field={field}
                                        value={responses[field.id] || ''}
                                        state={fieldStates[field.id] || 'missing'}
                                        onChange={(value) => handleChange(field.id, value)}
                                    />
                                ))}
                            </section>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}

function buttonStyle(mode: 'solid' | 'outline'): CSSProperties {
    if (mode === 'solid') {
        return {
            width: '100%',
            border: 'none',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #183328, #2a5140)',
            color: '#f6efe2',
            padding: '13px 16px',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
        };
    }

    return {
        width: '100%',
        borderRadius: 14,
        border: '1px solid rgba(24, 51, 40, 0.15)',
        background: '#fffdfa',
        color: '#183328',
        padding: '13px 16px',
        fontWeight: 800,
        fontSize: 14,
        cursor: 'pointer',
    };
}
