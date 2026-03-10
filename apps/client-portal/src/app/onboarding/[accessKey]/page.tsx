'use client';

import {
    startTransition,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type CSSProperties,
} from 'react';
import { useParams } from 'next/navigation';
import {
    countSectionCompletion,
    getMultiValueItems,
    joinMultiValueItems,
    onboardingStateLabels,
    type ClientOnboardingResponses,
    type OnboardingField,
    type OnboardingFieldState,
    type OnboardingSection,
} from '@/lib/onboarding';

type ApiPayload = {
    form: {
        clientId: string;
        clientName: string;
        slug: string;
        language: 'ar-en';
        platform: 'zid';
        status: 'draft' | 'submitted';
        responses: ClientOnboardingResponses;
        fieldStates: Record<string, OnboardingFieldState>;
        versionCount?: number;
        latestVersionNumber?: number;
        lastVersionAt?: string | null;
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

function buttonStyle(mode: 'solid' | 'outline'): CSSProperties {
    if (mode === 'solid') {
        return {
            width: '100%',
            border: 'none',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #183328, #2a5140)',
            color: '#f6efe2',
            padding: '14px 18px',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
        };
    }

    return {
        width: '100%',
        borderRadius: 16,
        border: '1px solid rgba(24, 51, 40, 0.15)',
        background: '#fffdfa',
        color: '#183328',
        padding: '14px 18px',
        fontWeight: 800,
        fontSize: 14,
        cursor: 'pointer',
    };
}

function MultiUrlInput(props: {
    field: OnboardingField;
    value: string;
    onChange: (value: string) => void;
}) {
    const links = useMemo(() => {
        const items = getMultiValueItems(props.value);
        return items.length > 0 ? items : [''];
    }, [props.value]);

    const sync = (nextLinks: string[]) => {
        props.onChange(joinMultiValueItems(nextLinks));
    };

    const updateItem = (index: number, nextValue: string) => {
        const nextLinks = links.map((link, itemIndex) => (itemIndex === index ? nextValue : link));
        sync(nextLinks);
    };

    const addItem = () => sync([...links, '']);
    const removeItem = (index: number) => {
        const nextLinks = links.filter((_, itemIndex) => itemIndex !== index);
        sync(nextLinks.length > 0 ? nextLinks : ['']);
    };

    return (
        <div style={{ display: 'grid', gap: 10 }}>
            {links.map((link, index) => (
                <div key={`${props.field.id}-${index}`} className="onboarding-multi-row">
                    <input
                        type="url"
                        value={link}
                        dir="ltr"
                        onChange={(event) => updateItem(index, event.target.value)}
                        placeholder={index === 0 ? 'https://drive.google.com/...' : 'https://...'}
                        style={{
                            width: '100%',
                            borderRadius: 14,
                            border: '1px solid rgba(24, 51, 40, 0.14)',
                            background: '#fffcf8',
                            color: '#173428',
                            padding: '15px 18px',
                            fontSize: 15,
                            lineHeight: 1.55,
                            outline: 'none',
                        }}
                    />
                    <div className="onboarding-multi-actions">
                        {links.length > 1 && (
                            <button type="button" className="onboarding-mini-btn" onClick={() => removeItem(index)}>
                                حذف الرابط
                            </button>
                        )}
                        {index === links.length - 1 && (
                            <button type="button" className="onboarding-mini-btn onboarding-mini-btn-solid" onClick={addItem}>
                                إضافة رابط آخر
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
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
        textAlign: field.type === 'url' || field.type === 'email' ? 'left' : 'right',
    };

    const inputProps = {
        value,
        onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
        placeholder: field.placeholderAr || field.labelAr,
        dir: field.type === 'url' || field.type === 'email' ? 'ltr' as const : 'rtl' as const,
        style: commonStyle,
    };

    return (
        <div className="onboarding-field">
            <div className="onboarding-field-head">
                <div style={{ flex: '1 1 340px' }}>
                    <label className="onboarding-field-label">{field.labelAr}</label>
                    <p className="onboarding-field-subtitle" dir="ltr">{field.labelEn}</p>
                    {(field.helperAr || field.helperEn) && (
                        <p className="onboarding-field-helper">
                            {field.helperAr}
                            {field.helperAr && field.helperEn ? ' · ' : ''}
                            <span dir="ltr">{field.helperEn}</span>
                        </p>
                    )}
                </div>
                <span
                    className="onboarding-badge"
                    style={{
                        border: `1px solid ${pill.borderColor}`,
                        background: pill.background,
                        color: pill.color,
                    }}
                >
                    {label.ar}
                </span>
            </div>

            <div style={{ marginTop: 14 }}>
                {field.type === 'textarea' ? (
                    <textarea {...inputProps} rows={6} />
                ) : field.type === 'url' && field.multiple ? (
                    <MultiUrlInput field={field} value={value} onChange={onChange} />
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
    const [versionCount, setVersionCount] = useState(0);
    const [latestVersionNumber, setLatestVersionNumber] = useState(0);
    const [lastVersionAt, setLastVersionAt] = useState<string | null>(null);
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
                setVersionCount(data.form.versionCount || 0);
                setLatestVersionNumber(data.form.latestVersionNumber || 0);
                setLastVersionAt(data.form.lastVersionAt || null);
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
                setVersionCount(data.versionCount || versionCount);
                setLatestVersionNumber(data.latestVersionNumber || latestVersionNumber);
                setLastVersionAt(data.lastSavedAt || null);
                setSuccess('تم حفظ التحديثات بنجاح. Your changes are saved.');
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
                setVersionCount(data.versionCount || versionCount);
                setLatestVersionNumber(data.latestVersionNumber || latestVersionNumber);
                setLastVersionAt(data.submittedAt || null);
                setSuccess('تم إرسال النموذج بنجاح. يمكنكم العودة لاحقاً وتحديثه عند الحاجة.');
            });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to submit form');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <main className="onboarding-shell onboarding-shell-loading" dir="rtl" lang="ar">
                <div className="onboarding-loading-card">
                    <div className="onboarding-logo">AW</div>
                    <p>جاري تحميل استبيان الانطلاق...</p>
                </div>
            </main>
        );
    }

    if (!payload) {
        return (
            <main className="onboarding-shell onboarding-shell-loading" dir="rtl" lang="ar">
                <div className="onboarding-error-card">
                    <h1>تعذر تحميل النموذج</h1>
                    <p>{error || 'This onboarding page is unavailable.'}</p>
                </div>
            </main>
        );
    }

    return (
        <main className="onboarding-shell" dir="rtl" lang="ar">
            <div className="onboarding-wrap">
                <section className="onboarding-hero">
                    <div className="onboarding-hero-copy">
                        <p className="onboarding-kicker" dir="ltr">EIN ABAYA × ADMIREWORKS</p>
                        <h1>{payload.schema.titleAr}</h1>
                        <p className="onboarding-intro">{payload.schema.introAr}</p>
                        <p className="onboarding-intro-en" dir="ltr">{payload.schema.introEn}</p>
                    </div>
                    <div className="onboarding-status-card">
                        <p className="onboarding-status-label" dir="ltr">CURRENT STATUS</p>
                        <p className="onboarding-status-value">{status === 'submitted' ? 'تم الإرسال' : 'قيد المراجعة'}</p>
                        <p className="onboarding-status-meta">المنصة: <span dir="ltr">{payload.form.platform.toUpperCase()}</span></p>
                        <p className="onboarding-status-meta">عدد الإصدارات: {versionCount}</p>
                        {latestVersionNumber > 0 && <p className="onboarding-status-meta">آخر إصدار: V{latestVersionNumber}</p>}
                        {lastSavedAt && <p className="onboarding-status-meta">آخر حفظ: <span dir="ltr">{formatDate(lastSavedAt)}</span></p>}
                        {lastVersionAt && <p className="onboarding-status-meta">آخر تحديث موثق: <span dir="ltr">{formatDate(lastVersionAt)}</span></p>}
                        {submittedAt && <p className="onboarding-status-meta">تم الإرسال: <span dir="ltr">{formatDate(submittedAt)}</span></p>}
                    </div>
                </section>

                <section className="onboarding-layout">
                    <aside className="onboarding-sidebar">
                        <div className="onboarding-panel">
                            <p className="onboarding-panel-title">تقدم الأقسام</p>
                            <div className="onboarding-progress-list">
                                {sections.map((section) => {
                                    const progress = sectionProgress.find((item) => item.sectionId === section.id);
                                    const percent = progress ? Math.round((progress.answered / progress.total) * 100) : 0;
                                    return (
                                        <a key={section.id} href={`#${section.id}`} className="onboarding-progress-item">
                                            <p className="onboarding-progress-title">{section.titleAr}</p>
                                            <p className="onboarding-progress-subtitle" dir="ltr">{section.titleEn}</p>
                                            <div className="onboarding-progress-track">
                                                <div className="onboarding-progress-bar" style={{ width: `${percent}%` }} />
                                            </div>
                                            <p className="onboarding-progress-meta">{progress?.answered || 0} / {progress?.total || 0} حقل تمت تعبئته</p>
                                        </a>
                                    );
                                })}
                            </div>

                            <div className="onboarding-actions">
                                <button onClick={saveDraft} disabled={saving} style={buttonStyle('outline')}>
                                    {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                                </button>
                                <button onClick={submitForm} disabled={submitting} style={buttonStyle('solid')}>
                                    {submitting ? 'جارٍ الإرسال...' : status === 'submitted' ? 'إرسال تحديث جديد' : 'إرسال النموذج'}
                                </button>
                                <p className="onboarding-actions-note">
                                    يمكنكم تعديل البيانات لاحقاً حتى بعد الإرسال، وسيتم حفظ كل تحديث كإصدار جديد.
                                </p>
                            </div>
                        </div>
                    </aside>

                    <div className="onboarding-main">
                        {(error || success || missingFields.length > 0 || invalidFields.length > 0) && (
                            <div className={`onboarding-panel onboarding-feedback ${error ? 'onboarding-feedback-error' : ''}`}>
                                {error && <p className="onboarding-feedback-error-text">{error}</p>}
                                {success && <p className="onboarding-feedback-success-text">{success}</p>}
                                {missingFields.length > 0 && (
                                    <div className="onboarding-feedback-list">
                                        <p>حقول مطلوبة ما زالت ناقصة</p>
                                        <ul>
                                            {missingFields.map((field) => (
                                                <li key={field.id}>{field.labelAr} · <span dir="ltr">{field.labelEn}</span></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {invalidFields.length > 0 && (
                                    <div className="onboarding-feedback-list">
                                        <p>حقول تحتاج تنسيق صحيح</p>
                                        <ul>
                                            {invalidFields.map((field) => (
                                                <li key={field.id}>{field.labelAr} · <span dir="ltr">{field.labelEn}</span></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {sections.map((section) => (
                            <section key={section.id} id={section.id} className="onboarding-section-card">
                                <div className="onboarding-section-head">
                                    <p className="onboarding-section-kicker" dir="ltr">{section.titleEn.toUpperCase()}</p>
                                    <h2>{section.titleAr}</h2>
                                    <p className="onboarding-section-description">{section.descriptionAr}</p>
                                    <p className="onboarding-section-description-en" dir="ltr">{section.descriptionEn}</p>
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

            <style jsx>{`
                .onboarding-shell {
                    min-height: 100vh;
                    background:
                        radial-gradient(circle at top right, rgba(214, 177, 108, 0.18), transparent 28%),
                        radial-gradient(circle at bottom left, rgba(24, 51, 40, 0.12), transparent 32%),
                        linear-gradient(180deg, #f7f0e4 0%, #efe8dc 45%, #ebe1d2 100%);
                    padding: 28px 16px 64px;
                    color: #183328;
                }

                .onboarding-shell-loading {
                    display: grid;
                    place-items: center;
                }

                .onboarding-wrap {
                    max-width: 1320px;
                    margin: 0 auto;
                    display: grid;
                    gap: 20px;
                }

                .onboarding-hero {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
                    gap: 20px;
                    background: linear-gradient(135deg, #183328 0%, #27493a 60%, #4d5f54 100%);
                    color: #f6efe2;
                    border-radius: 30px;
                    padding: 30px;
                    box-shadow: 0 24px 80px rgba(24, 51, 40, 0.18);
                    align-items: start;
                }

                .onboarding-kicker,
                .onboarding-section-kicker,
                .onboarding-status-label {
                    margin: 0;
                    color: #d6b16c;
                    letter-spacing: 1.6px;
                    font-size: 12px;
                    font-weight: 800;
                }

                .onboarding-hero-copy h1 {
                    margin: 10px 0 10px;
                    font-size: clamp(30px, 5vw, 40px);
                    line-height: 1.05;
                }

                .onboarding-intro {
                    margin: 0;
                    font-size: 17px;
                    color: rgba(246, 239, 226, 0.9);
                    max-width: 740px;
                    line-height: 1.8;
                }

                .onboarding-intro-en {
                    margin: 10px 0 0;
                    font-size: 13px;
                    color: rgba(246, 239, 226, 0.72);
                    line-height: 1.7;
                }

                .onboarding-status-card,
                .onboarding-panel,
                .onboarding-section-card,
                .onboarding-error-card,
                .onboarding-loading-card {
                    background: #fffdfa;
                    border: 1px solid #e6dccb;
                    border-radius: 26px;
                    box-shadow: 0 18px 50px rgba(24, 51, 40, 0.06);
                }

                .onboarding-status-card {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.14);
                    color: #f6efe2;
                    padding: 20px;
                    backdrop-filter: blur(12px);
                }

                .onboarding-status-value {
                    margin: 10px 0 8px;
                    font-size: 28px;
                    font-weight: 800;
                }

                .onboarding-status-meta {
                    margin: 6px 0 0;
                    font-size: 13px;
                    color: rgba(246, 239, 226, 0.8);
                }

                .onboarding-layout {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
                    gap: 20px;
                    align-items: start;
                }

                .onboarding-sidebar {
                    grid-column: 2;
                    position: sticky;
                    top: 20px;
                    width: 100%;
                    max-width: 320px;
                    justify-self: start;
                }

                .onboarding-panel,
                .onboarding-section-card {
                    padding: 24px;
                }

                .onboarding-main {
                    grid-column: 1;
                    min-width: 0;
                }

                .onboarding-panel-title {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 800;
                }

                .onboarding-progress-list,
                .onboarding-main {
                    display: grid;
                    gap: 18px;
                }

                .onboarding-progress-list {
                    margin-top: 16px;
                }

                .onboarding-progress-item {
                    display: block;
                    padding: 14px;
                    border-radius: 18px;
                    background: #f6f0e6;
                    border: 1px solid #ece1cf;
                    text-decoration: none;
                    color: inherit;
                }

                .onboarding-progress-title,
                .onboarding-section-head h2 {
                    margin: 0;
                    font-weight: 800;
                }

                .onboarding-progress-subtitle,
                .onboarding-progress-meta,
                .onboarding-section-description,
                .onboarding-section-description-en,
                .onboarding-actions-note,
                .onboarding-field-subtitle,
                .onboarding-field-helper {
                    margin: 4px 0 0;
                    color: #64706a;
                    font-size: 13px;
                    line-height: 1.7;
                }

                .onboarding-progress-track {
                    height: 8px;
                    border-radius: 999px;
                    background: #e3d8c6;
                    overflow: hidden;
                    margin-top: 10px;
                }

                .onboarding-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #183328, #b9904d);
                }

                .onboarding-actions {
                    margin-top: 18px;
                    padding-top: 18px;
                    border-top: 1px solid #ece1cf;
                    display: grid;
                    gap: 10px;
                }

                .onboarding-feedback {
                    padding: 22px 24px;
                }

                .onboarding-feedback-error {
                    border-color: #ef4444;
                }

                .onboarding-feedback-error-text {
                    margin: 0;
                    color: #b42318;
                    font-weight: 700;
                }

                .onboarding-feedback-success-text {
                    margin: 0;
                    color: #255e43;
                    font-weight: 700;
                }

                .onboarding-feedback-list {
                    margin-top: 14px;
                }

                .onboarding-feedback-list p {
                    margin: 0;
                    font-weight: 700;
                }

                .onboarding-feedback-list ul {
                    margin: 8px 0 0;
                    padding-right: 18px;
                    padding-left: 0;
                    color: #5b6470;
                }

                .onboarding-section-card {
                    scroll-margin-top: 24px;
                }

                .onboarding-section-head h2 {
                    margin: 8px 0 4px;
                    font-size: clamp(26px, 4vw, 32px);
                }

                .onboarding-field {
                    padding: 22px 0;
                    border-top: 1px solid rgba(24, 51, 40, 0.08);
                }

                .onboarding-field-head {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    align-items: flex-start;
                    flex-wrap: wrap;
                }

                .onboarding-field-label {
                    display: block;
                    margin-bottom: 4px;
                    color: #183328;
                    font-weight: 700;
                    font-size: 16px;
                }

                .onboarding-badge {
                    display: inline-flex;
                    align-items: center;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 700;
                    padding: 8px 12px;
                    white-space: nowrap;
                }

                .onboarding-multi-row {
                    display: grid;
                    gap: 8px;
                }

                .onboarding-multi-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    justify-content: flex-start;
                }

                .onboarding-mini-btn {
                    border-radius: 999px;
                    border: 1px solid rgba(24, 51, 40, 0.16);
                    background: #fffdfa;
                    color: #183328;
                    padding: 8px 12px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .onboarding-mini-btn-solid {
                    background: rgba(24, 51, 40, 0.08);
                }

                .onboarding-loading-card,
                .onboarding-error-card {
                    max-width: 540px;
                    padding: 28px;
                    text-align: center;
                }

                .onboarding-logo {
                    width: 72px;
                    height: 72px;
                    margin: 0 auto 16px;
                    border-radius: 20px;
                    background: #183328;
                    color: #d6b16c;
                    display: grid;
                    place-items: center;
                    font-weight: 800;
                }

                @media (max-width: 980px) {
                    .onboarding-hero,
                    .onboarding-layout {
                        grid-template-columns: 1fr;
                    }

                    .onboarding-sidebar {
                        grid-column: auto;
                        position: static;
                        max-width: none;
                        justify-self: stretch;
                    }

                    .onboarding-main {
                        grid-column: auto;
                    }
                }

                @media (max-width: 720px) {
                    .onboarding-shell {
                        padding: 16px 12px 48px;
                    }

                    .onboarding-hero,
                    .onboarding-panel,
                    .onboarding-section-card {
                        border-radius: 22px;
                        padding: 18px;
                    }

                    .onboarding-field-head,
                    .onboarding-status-card {
                        gap: 14px;
                    }

                    .onboarding-status-value {
                        font-size: 24px;
                    }
                }
            `}</style>
        </main>
    );
}
