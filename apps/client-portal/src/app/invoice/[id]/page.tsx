'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { loadStripe, type StripeElementsOptions, type Appearance } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

/* ═══════════════════════════════════════════════════
   Stripe Appearance — fully branded, no iframe look
   ═══════════════════════════════════════════════════ */
const appearance: Appearance = {
    theme: 'flat',
    variables: {
        colorPrimary: '#001a70',
        colorBackground: '#ffffff',
        colorText: '#1a1a2e',
        colorDanger: '#d44315',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSizeBase: '15px',
        borderRadius: '8px',
        spacingUnit: '4px',
        spacingGridRow: '16px',
        spacingGridColumn: '16px',
    },
    rules: {
        '.Input': {
            border: '1.5px solid #d4d8e0',
            padding: '12px 14px',
            boxShadow: 'none',
            transition: 'border-color 0.2s ease',
        },
        '.Input:focus': {
            border: '1.5px solid #001a70',
            boxShadow: '0 0 0 3px rgba(0,26,112,0.08)',
        },
        '.Label': {
            fontWeight: '600',
            fontSize: '13px',
            color: '#555',
            letterSpacing: '0.2px',
            marginBottom: '6px',
        },
        '.Tab': {
            border: '1.5px solid #d4d8e0',
            borderRadius: '8px',
        },
        '.Tab--selected': {
            border: '1.5px solid #001a70',
            backgroundColor: '#f0f2fa',
            color: '#001a70',
        },
        '.Error': {
            fontSize: '13px',
        },
    },
};

/* ═══════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════ */
interface LineItem { description: string; qty: number; rate: number; amount: number; }
interface InvoiceData {
    id: string; invoiceNumber: string; clientName: string; lineItems: LineItem[];
    subtotal: number; tax: number; totalDue: number; currency: string; status: string;
    issuedAt?: string; dueDate?: string; paidAt?: string; notes?: string;
}
interface CompanyData { name: string; tagline: string; email: string; phone: string; address: string; }

/* ═══════════════════════════════════════════════════
   Native Payment Form Component
   ═══════════════════════════════════════════════════ */
function PaymentForm({ amount, currency, onSuccess }: { amount: number; currency: string; onSuccess: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setProcessing(true);
        setError('');

        const { error: submitError } = await elements.submit();
        if (submitError) {
            setError(submitError.message || 'Validation error');
            setProcessing(false);
            return;
        }

        const { error: confirmError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.href.split('?')[0] + '?status=complete',
            },
        });

        if (confirmError) {
            setError(confirmError.message || 'Payment failed. Please try again.');
            setProcessing(false);
        }
    };

    const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0 });

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement options={{
                layout: 'tabs',
                business: { name: 'Admireworks' },
            }} />

            {error && (
                <div style={{
                    marginTop: 12, padding: '10px 14px', background: '#fef2f2',
                    border: '1px solid #fecaca', borderRadius: 8, color: '#d44315',
                    fontSize: '0.85rem',
                }}>
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || processing}
                style={{
                    display: 'block', width: '100%', marginTop: 20, padding: '15px 32px',
                    background: processing ? '#6b7280' : 'linear-gradient(135deg, #001a70 0%, #002a9e 100%)',
                    color: '#fff', fontSize: '1rem', fontWeight: 700, borderRadius: 10,
                    border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
                    boxShadow: processing ? 'none' : '0 4px 12px rgba(0,26,112,0.25)',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.3px',
                }}
            >
                {processing ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#fff', borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite', display: 'inline-block',
                        }} />
                        Processing...
                    </span>
                ) : (
                    `Pay ${fmtAmt(amount)} ${currency}`
                )}
            </button>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
    );
}

/* ═══════════════════════════════════════════════════
   Main Invoice Page
   ═══════════════════════════════════════════════════ */
export default function PublicInvoicePage() {
    const { id } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [company, setCompany] = useState<CompanyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentComplete, setPaymentComplete] = useState(false);

    const status = searchParams.get('status');
    useEffect(() => { if (status === 'complete') setPaymentComplete(true); }, [status]);

    // Load invoice
    useEffect(() => {
        fetch(`/api/invoices/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) setError(data.error);
                else { setInvoice(data.invoice); setCompany(data.company); }
            })
            .catch(() => setError('Failed to load invoice'))
            .finally(() => setLoading(false));
    }, [id]);

    // Create payment intent when user clicks Pay
    const initPayment = useCallback(async () => {
        setShowPayment(true);
        const res = await fetch('/api/stripe/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: id }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); setShowPayment(false); return; }
        setClientSecret(data.clientSecret);
    }, [id]);

    /* ── Loading / Error states ── */
    if (loading) return (
        <div style={styles.center}>
            <div style={{ textAlign: 'center' }}>
                <div style={styles.logo}><span style={styles.logoText}>AW</span></div>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>Loading invoice...</p>
            </div>
        </div>
    );

    if (error || !invoice) return (
        <div style={styles.center}>
            <div style={{ textAlign: 'center' }}>
                <div style={styles.logo}><span style={styles.logoText}>AW</span></div>
                <h2 style={{ marginTop: 16, marginBottom: 8, color: '#001a70' }}>Invoice Not Found</h2>
                <p style={{ color: '#666' }}>{error || 'This invoice does not exist.'}</p>
            </div>
        </div>
    );

    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0 });
    const isPaid = invoice.status === 'paid' || paymentComplete;

    const elementsOptions: StripeElementsOptions = clientSecret ? {
        clientSecret,
        appearance,
        fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }],
    } : {};

    return (
        <div style={styles.page}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                {/* ── Invoice Card ── */}
                <div style={styles.card}>
                    {/* Header */}
                    <div style={styles.header}>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#001a70', margin: 0 }}>INVOICE</h1>
                            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 4 }}>{invoice.invoiceNumber}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={styles.logo}><span style={styles.logoText}>AW</span></div>
                            {company && (
                                <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.5 }}>
                                    <p style={{ margin: 0, fontWeight: 600, color: '#333' }}>{company.name}</p>
                                    <p style={{ margin: 0 }}>{company.address}</p>
                                    <p style={{ margin: 0 }}>{company.email}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div style={styles.details}>
                        <div>
                            <p style={styles.label}>Bill To</p>
                            <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>{invoice.clientName}</p>
                        </div>
                        <div>
                            <div style={{ marginBottom: 8 }}>
                                <p style={styles.label}>Invoice Date</p>
                                <p style={{ fontWeight: 500, margin: 0 }}>{fmt(invoice.issuedAt)}</p>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <p style={styles.label}>Due Date</p>
                                <p style={{ fontWeight: 500, margin: 0 }}>{fmt(invoice.dueDate)}</p>
                            </div>
                            <div>
                                <p style={styles.label}>Status</p>
                                <span style={{
                                    display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                    background: isPaid ? '#e6f9e6' : '#fff8e6', color: isPaid ? '#15803d' : '#b8860b',
                                }}>{isPaid ? '✓ Paid' : 'Pending'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #001a70' }}>
                                {['Description', 'Qty', 'Rate', 'Amount'].map((h, i) => (
                                    <th key={h} style={{
                                        textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right',
                                        padding: '10px 0', fontSize: '0.72rem', fontWeight: 700,
                                        color: '#001a70', letterSpacing: '0.5px', textTransform: 'uppercase',
                                        width: i === 1 ? 60 : i > 1 ? 120 : undefined,
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(invoice.lineItems || []).map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '14px 0', fontSize: '0.88rem' }}>{item.description}</td>
                                    <td style={{ padding: '14px 0', textAlign: 'center', fontSize: '0.88rem' }}>{item.qty}</td>
                                    <td style={{ padding: '14px 0', textAlign: 'right', fontSize: '0.88rem' }}>{fmtAmt(item.rate)} {invoice.currency}</td>
                                    <td style={{ padding: '14px 0', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600 }}>{fmtAmt(item.amount)} {invoice.currency}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
                        <div style={{ width: 260 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.88rem' }}>
                                <span style={{ color: '#666' }}>Subtotal</span>
                                <span>{fmtAmt(invoice.subtotal)} {invoice.currency}</span>
                            </div>
                            {invoice.tax > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.88rem' }}>
                                    <span style={{ color: '#666' }}>Tax</span>
                                    <span>{fmtAmt(invoice.tax)} {invoice.currency}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #001a70', fontSize: '1.1rem', fontWeight: 800 }}>
                                <span>Total Due</span>
                                <span style={{ color: '#001a70' }}>{fmtAmt(invoice.totalDue)} {invoice.currency}</span>
                            </div>
                        </div>
                    </div>

                    {/* ═══ Payment Section ═══ */}
                    {isPaid ? (
                        <div style={styles.successBanner}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            <div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>
                                    {paymentComplete && invoice.status !== 'paid' ? 'Payment submitted successfully!' : 'This invoice has been paid'}
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
                                    {invoice.paidAt ? `Paid on ${fmt(invoice.paidAt)}` : 'Thank you for your payment.'}
                                </p>
                            </div>
                        </div>
                    ) : showPayment && clientSecret ? (
                        <div style={{ marginTop: 8 }}>
                            <div style={styles.paymentHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#001a70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                                    </svg>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001a70', margin: 0 }}>Payment Details</h3>
                                </div>
                                <button onClick={() => { setShowPayment(false); setClientSecret(null); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.82rem' }}>
                                    ✕ Cancel
                                </button>
                            </div>
                            <Elements stripe={stripePromise} options={elementsOptions}>
                                <PaymentForm
                                    amount={invoice.totalDue}
                                    currency={invoice.currency}
                                    onSuccess={() => setPaymentComplete(true)}
                                />
                            </Elements>
                        </div>
                    ) : showPayment ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <div style={styles.spinner} />
                            <p style={{ color: '#666', marginTop: 12, fontSize: '0.9rem' }}>Preparing payment...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : (
                        <button onClick={initPayment} style={styles.payButton}>
                            Pay {fmtAmt(invoice.totalDue)} {invoice.currency} →
                        </button>
                    )}

                    {/* Trust */}
                    <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                        <span style={{ fontSize: '0.78rem', color: '#aaa' }}>🔒 Secure payment</span>
                        <span style={{ fontSize: '0.78rem', color: '#aaa' }}>|</span>
                        <span style={{ fontSize: '0.78rem', color: '#aaa' }}>256-bit encryption</span>
                        <span style={{ fontSize: '0.78rem', color: '#aaa' }}>|</span>
                        <span style={{ fontSize: '0.78rem', color: '#aaa' }}>Powered by <strong style={{ color: '#635bff' }}>Stripe</strong></span>
                    </div>

                    {/* Terms */}
                    <div style={styles.terms}>
                        <p><strong style={{ color: '#333' }}>Terms & Conditions:</strong></p>
                        <p>This invoice represents the monthly retainer. Payment is due upon receipt. Upon payment confirmation, services continue uninterrupted for the billing period.</p>
                        {company && <p>For questions, contact us at <a href={`mailto:${company.email}`} style={{ color: '#001a70' }}>{company.email}</a> or {company.phone}.</p>}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 24 }}>
                    <p style={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '2px', color: '#001a70', margin: 0 }}>ADMIREWORKS</p>
                    <p style={{ fontSize: '0.7rem', color: '#999', margin: '4px 0 0' }}>Admirable Venture Services · Dubai, UAE</p>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════ */
const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh', background: 'linear-gradient(135deg, #f0f2f8 0%, #e8eaf0 100%)',
        padding: '40px 16px', fontFamily: "'Inter', -apple-system, sans-serif",
    },
    center: {
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f2f8 0%, #e8eaf0 100%)',
    },
    card: {
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 32, flexWrap: 'wrap' as const, gap: 16,
    },
    logo: {
        width: 44, height: 44, borderRadius: 10, background: '#001a70',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    },
    logoText: { color: '#cc9f53', fontWeight: 800, fontSize: 16 },
    details: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
        marginBottom: 28, padding: '20px 24px', background: '#f8f9fc', borderRadius: 10,
    },
    label: {
        fontSize: '0.7rem', fontWeight: 700, color: '#999',
        letterSpacing: '0.5px', textTransform: 'uppercase' as const, margin: '0 0 6px',
    },
    payButton: {
        display: 'block', width: '100%', maxWidth: 400, margin: '0 auto',
        padding: '16px 32px', background: 'linear-gradient(135deg, #001a70 0%, #002a9e 100%)',
        color: '#fff', fontSize: '1rem', fontWeight: 700, borderRadius: 10, border: 'none',
        cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,26,112,0.25)',
        transition: 'transform 0.15s, box-shadow 0.15s',
    },
    paymentHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #eee',
    },
    successBanner: {
        display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px',
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
        color: '#15803d', maxWidth: 500, margin: '0 auto',
    },
    spinner: {
        width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#001a70',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto',
    },
    terms: {
        marginTop: 28, paddingTop: 20, borderTop: '1px solid #eee',
        fontSize: '0.76rem', color: '#888', lineHeight: 1.6,
    },
};
