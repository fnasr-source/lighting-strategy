'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { loadStripe, type StripeElementsOptions, type Appearance } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

/* ─── Stripe Appearance — branded, native look ─── */
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
        '.Input': { border: '1.5px solid #d4d8e0', padding: '12px 14px', boxShadow: 'none', transition: 'border-color 0.2s ease' },
        '.Input:focus': { border: '1.5px solid #001a70', boxShadow: '0 0 0 3px rgba(0,26,112,0.08)' },
        '.Label': { fontWeight: '600', fontSize: '13px', color: '#555', letterSpacing: '0.2px', marginBottom: '6px' },
        '.Tab': { border: '1.5px solid #d4d8e0', borderRadius: '8px' },
        '.Tab--selected': { border: '1.5px solid #001a70', backgroundColor: '#f0f2fa', color: '#001a70' },
        '.Error': { fontSize: '13px' },
    },
};

/* ─── Types ─── */
interface LineItem { description: string; qty: number; rate: number; amount: number; }
interface InvoiceData {
    id: string; invoiceNumber: string; clientName: string; lineItems: LineItem[];
    subtotal: number; tax: number; totalDue: number; currency: string; status: string;
    issuedAt?: string; dueDate?: string; paidAt?: string; notes?: string;
}
interface CompanyData { name: string; tagline: string; email: string; phone: string; address: string; }

/* ─── Payment Form (renders natively inside the page) ─── */
function PaymentForm({ amount, currency }: { amount: number; currency: string }) {
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
        if (submitError) { setError(submitError.message || 'Validation error'); setProcessing(false); return; }

        const { error: confirmError } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.href.split('?')[0] + '?status=complete' },
        });

        if (confirmError) { setError(confirmError.message || 'Payment failed. Please try again.'); setProcessing(false); }
    };

    const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0 });

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement options={{ layout: 'tabs', business: { name: 'Admireworks' } }} />
            {error && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#d44315', fontSize: '0.85rem' }}>
                    {error}
                </div>
            )}
            <button type="submit" disabled={!stripe || processing} style={{
                display: 'block', width: '100%', marginTop: 20, padding: '15px 32px',
                background: processing ? '#6b7280' : 'linear-gradient(135deg, #001a70 0%, #002a9e 100%)',
                color: '#fff', fontSize: '1rem', fontWeight: 700, borderRadius: 10, border: 'none',
                cursor: processing ? 'not-allowed' : 'pointer',
                boxShadow: processing ? 'none' : '0 4px 12px rgba(0,26,112,0.25)',
                transition: 'all 0.2s ease', letterSpacing: '0.3px',
            }}>
                {processing ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                        Processing...
                    </span>
                ) : `Pay ${fmtAmt(amount)} ${currency}`}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE — systeme.io style layout
   Invoice summary on left, payment form on right
   Payment form loads IMMEDIATELY (no click needed)
   ═══════════════════════════════════════════════════ */
export default function PublicInvoicePage() {
    const { id } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [company, setCompany] = useState<CompanyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentComplete, setPaymentComplete] = useState(false);

    const status = searchParams.get('status');
    useEffect(() => { if (status === 'complete') setPaymentComplete(true); }, [status]);

    // Load invoice + create payment intent immediately
    useEffect(() => {
        fetch(`/api/invoices/${id}`)
            .then(r => r.json())
            .then(async data => {
                if (data.error) { setError(data.error); setLoading(false); return; }
                setInvoice(data.invoice);
                setCompany(data.company);
                setLoading(false);

                // If unpaid, immediately create payment intent
                if (data.invoice.status !== 'paid') {
                    const piRes = await fetch('/api/stripe/create-payment-intent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ invoiceId: id }),
                    });
                    const piData = await piRes.json();
                    if (!piData.error) setClientSecret(piData.clientSecret);
                }
            })
            .catch(() => { setError('Failed to load invoice'); setLoading(false); });
    }, [id]);

    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0 });

    /* ── Loading ── */
    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f8', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
                <div style={logoStyle}><span style={logoTextStyle}>AW</span></div>
                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: 12 }}>Loading invoice...</p>
            </div>
        </div>
    );

    /* ── Error ── */
    if (error || !invoice) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f8', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
                <div style={logoStyle}><span style={logoTextStyle}>AW</span></div>
                <h2 style={{ marginTop: 16, color: '#001a70' }}>Invoice Not Found</h2>
                <p style={{ color: '#666' }}>{error || 'This invoice does not exist.'}</p>
            </div>
        </div>
    );

    const isPaid = invoice.status === 'paid' || paymentComplete;

    const elementsOptions: StripeElementsOptions = clientSecret ? {
        clientSecret, appearance,
        fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }],
    } : {};

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f2f8 0%, #e4e7ef 100%)', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {/* ── Top Brand Bar ── */}
            <div style={{ background: '#001a70', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#cc9f53', fontWeight: 800, fontSize: 13 }}>AW</span>
                </div>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.5px' }}>ADMIREWORKS</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginLeft: 'auto' }}>Secure Payment</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>

            {/* ── Main Content: Two-column on desktop, stacked on mobile ── */}
            <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>

                {/* ═══ LEFT: Order Summary ═══ */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                        <div>
                            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#999', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 4px' }}>INVOICE</p>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#001a70', margin: 0 }}>{invoice.invoiceNumber}</h2>
                        </div>
                        <span style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                            background: isPaid ? '#e6f9e6' : '#fff8e6', color: isPaid ? '#15803d' : '#b8860b',
                        }}>{isPaid ? '✓ Paid' : 'Pending'}</span>
                    </div>

                    {/* Client + Dates */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '16px 20px', background: '#f8f9fc', borderRadius: 10, marginBottom: 24 }}>
                        <div>
                            <p style={labelStyle}>Bill To</p>
                            <p style={{ fontWeight: 700, margin: 0 }}>{invoice.clientName}</p>
                        </div>
                        <div>
                            <p style={labelStyle}>Invoice Date</p>
                            <p style={{ margin: '0 0 8px', fontWeight: 500 }}>{fmt(invoice.issuedAt)}</p>
                            <p style={labelStyle}>Due Date</p>
                            <p style={{ margin: 0, fontWeight: 500 }}>{fmt(invoice.dueDate)}</p>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div style={{ marginBottom: 20 }}>
                        {(invoice.lineItems || []).map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>{item.description}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#999' }}>Qty: {item.qty} × {fmtAmt(item.rate)} {invoice.currency}</p>
                                </div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{fmtAmt(item.amount)} {invoice.currency}</p>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div style={{ borderTop: '2px solid #001a70', paddingTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                            <span style={{ color: '#666' }}>Subtotal</span>
                            <span>{fmtAmt(invoice.subtotal)} {invoice.currency}</span>
                        </div>
                        {invoice.tax > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                                <span style={{ color: '#666' }}>Tax</span>
                                <span>{fmtAmt(invoice.tax)} {invoice.currency}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.15rem', fontWeight: 800 }}>
                            <span>Total</span>
                            <span style={{ color: '#001a70' }}>{fmtAmt(invoice.totalDue)} {invoice.currency}</span>
                        </div>
                    </div>

                    {/* Company Info */}
                    {company && (
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #eee', fontSize: '0.75rem', color: '#999', lineHeight: 1.6 }}>
                            <p style={{ margin: 0 }}><strong style={{ color: '#333' }}>{company.name}</strong> · {company.tagline}</p>
                            <p style={{ margin: 0 }}>{company.address} · {company.email} · {company.phone}</p>
                        </div>
                    )}
                </div>

                {/* ═══ RIGHT: Payment Form (always visible) ═══ */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
                    {isPaid ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e6f9e6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <h3 style={{ color: '#15803d', fontSize: '1.1rem', margin: '0 0 6px' }}>
                                {paymentComplete && invoice.status !== 'paid' ? 'Payment Successful!' : 'Invoice Paid'}
                            </h3>
                            <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>
                                {invoice.paidAt ? `Paid on ${fmt(invoice.paidAt)}` : 'Thank you for your payment.'}
                            </p>
                        </div>
                    ) : clientSecret ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#001a70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                                </svg>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001a70', margin: 0 }}>Payment Details</h3>
                            </div>
                            <Elements stripe={stripePromise} options={elementsOptions}>
                                <PaymentForm amount={invoice.totalDue} currency={invoice.currency} />
                            </Elements>
                            <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.72rem', color: '#bbb' }}>🔒 Secure payment</span>
                                <span style={{ fontSize: '0.72rem', color: '#ddd' }}>|</span>
                                <span style={{ fontSize: '0.72rem', color: '#bbb' }}>256-bit encryption</span>
                                <span style={{ fontSize: '0.72rem', color: '#ddd' }}>|</span>
                                <span style={{ fontSize: '0.72rem', color: '#bbb' }}>Powered by <strong style={{ color: '#635bff' }}>Stripe</strong></span>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#001a70', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                            <p style={{ color: '#666', marginTop: 12, fontSize: '0.9rem' }}>Loading payment form...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    {/* Terms (inline, below payment form) */}
                    {!isPaid && (
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0', fontSize: '0.72rem', color: '#aaa', lineHeight: 1.5 }}>
                            <p style={{ margin: 0 }}>By completing this payment, you agree to the terms of service. Payment is due upon receipt. Upon confirmation, services continue uninterrupted.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ textAlign: 'center', padding: '12px 0 24px' }}>
                <p style={{ fontWeight: 800, fontSize: '0.68rem', letterSpacing: '2px', color: '#001a70', margin: 0 }}>ADMIREWORKS</p>
                <p style={{ fontSize: '0.65rem', color: '#999', margin: '2px 0 0' }}>Admirable Venture Services · Dubai, UAE</p>
            </div>

            {/* ── Responsive: stack on mobile ── */}
            <style>{`
                @media (max-width: 720px) {
                    div[style*="gridTemplateColumns"] { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}

const logoStyle: React.CSSProperties = { width: 48, height: 48, borderRadius: 10, background: '#001a70', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
const logoTextStyle: React.CSSProperties = { color: '#cc9f53', fontWeight: 800, fontSize: 18 };
const labelStyle: React.CSSProperties = { fontSize: '0.68rem', fontWeight: 700, color: '#999', letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 4px' };
