'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { loadStripe, type StripeElementsOptions, type Appearance } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

/* ─── Stripe Appearance ─── */
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

/* ─── Payment Form ─── */
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
            {error && <div className="inv-error">{error}</div>}
            <button type="submit" disabled={!stripe || processing} className={`inv-pay-btn ${processing ? 'inv-pay-btn--loading' : ''}`}>
                {processing ? (
                    <span className="inv-pay-btn__inner"><span className="inv-spinner inv-spinner--sm" /> Processing...</span>
                ) : `Pay ${fmtAmt(amount)} ${currency}`}
            </button>
        </form>
    );
}

/* ═══ Main Page ═══ */
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

    useEffect(() => {
        fetch(`/api/invoices/${id}`)
            .then(r => r.json())
            .then(async data => {
                if (data.error) { setError(data.error); setLoading(false); return; }
                setInvoice(data.invoice);
                setCompany(data.company);
                setLoading(false);
                if (data.invoice.status !== 'paid') {
                    const piRes = await fetch('/api/stripe/create-payment-intent', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

    if (loading) return (
        <div className="inv-page">
            <style>{pageStyles}</style>
            <div className="inv-center"><div className="inv-logo"><span className="inv-logo__text">AW</span></div><p className="inv-center__msg">Loading invoice...</p></div>
        </div>
    );

    if (error || !invoice) return (
        <div className="inv-page">
            <style>{pageStyles}</style>
            <div className="inv-center"><div className="inv-logo"><span className="inv-logo__text">AW</span></div><h2 className="inv-center__title">Invoice Not Found</h2><p className="inv-center__msg">{error || 'This invoice does not exist.'}</p></div>
        </div>
    );

    const isPaid = invoice.status === 'paid' || paymentComplete;
    const elementsOptions: StripeElementsOptions = clientSecret ? {
        clientSecret, appearance,
        fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }],
    } : {};

    return (
        <div className="inv-page">
            <style>{pageStyles}</style>

            {/* Brand Bar */}
            <div className="inv-brandbar">
                <div className="inv-brandbar__left">
                    <div className="inv-brandbar__icon"><span>AW</span></div>
                    <span className="inv-brandbar__name">ADMIREWORKS</span>
                </div>
                <span className="inv-brandbar__secure">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Secure Payment
                </span>
            </div>

            {/* Main Grid */}
            <div className="inv-grid">
                {/* LEFT: Summary */}
                <div className="inv-card">
                    <div className="inv-card__header">
                        <div>
                            <p className="inv-label" style={{ margin: '0 0 4px' }}>INVOICE</p>
                            <h2 className="inv-card__invoice-num">{invoice.invoiceNumber}</h2>
                        </div>
                        <span className={`inv-status ${isPaid ? 'inv-status--paid' : 'inv-status--pending'}`}>
                            {isPaid ? '✓ Paid' : 'Pending'}
                        </span>
                    </div>

                    <div className="inv-info-grid">
                        <div>
                            <p className="inv-label">Bill To</p>
                            <p className="inv-info-value">{invoice.clientName}</p>
                        </div>
                        <div>
                            <p className="inv-label">Invoice Date</p>
                            <p className="inv-info-value">{fmt(invoice.issuedAt)}</p>
                            <p className="inv-label" style={{ marginTop: 8 }}>Due Date</p>
                            <p className="inv-info-value">{fmt(invoice.dueDate)}</p>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="inv-items">
                        {(invoice.lineItems || []).map((item, i) => (
                            <div key={i} className="inv-item">
                                <div className="inv-item__desc">
                                    <p className="inv-item__name">{item.description}</p>
                                    <p className="inv-item__meta">Qty: {item.qty} × {fmtAmt(item.rate)} {invoice.currency}</p>
                                </div>
                                <p className="inv-item__amount">{fmtAmt(item.amount)} {invoice.currency}</p>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="inv-totals">
                        <div className="inv-totals__row">
                            <span>Subtotal</span><span>{fmtAmt(invoice.subtotal)} {invoice.currency}</span>
                        </div>
                        {invoice.tax > 0 && (
                            <div className="inv-totals__row">
                                <span>Tax</span><span>{fmtAmt(invoice.tax)} {invoice.currency}</span>
                            </div>
                        )}
                        <div className="inv-totals__total">
                            <span>Total</span><span>{fmtAmt(invoice.totalDue)} {invoice.currency}</span>
                        </div>
                    </div>

                    {/* Company Info */}
                    {company && (
                        <div className="inv-company">
                            <p><strong>{company.name}</strong> · {company.tagline}</p>
                            <p>{company.address} · {company.email} · {company.phone}</p>
                        </div>
                    )}
                </div>

                {/* RIGHT: Payment */}
                <div className="inv-card">
                    {isPaid ? (
                        <div className="inv-success">
                            <div className="inv-success__icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <h3 className="inv-success__title">
                                {paymentComplete && invoice.status !== 'paid' ? 'Payment Successful!' : 'Invoice Paid'}
                            </h3>
                            <p className="inv-success__sub">
                                {invoice.paidAt ? `Paid on ${fmt(invoice.paidAt)}` : 'Thank you for your payment.'}
                            </p>
                        </div>
                    ) : clientSecret ? (
                        <>
                            <div className="inv-payment-header">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#001a70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                                </svg>
                                <h3>Payment Details</h3>
                            </div>
                            <Elements stripe={stripePromise} options={elementsOptions}>
                                <PaymentForm amount={invoice.totalDue} currency={invoice.currency} />
                            </Elements>
                            <div className="inv-trust">
                                <span>🔒 Secure payment</span>
                                <span className="inv-trust__sep">|</span>
                                <span>256-bit encryption</span>
                                <span className="inv-trust__sep">|</span>
                                <span>Powered by <strong style={{ color: '#635bff' }}>Stripe</strong></span>
                            </div>
                        </>
                    ) : (
                        <div className="inv-center" style={{ minHeight: 200 }}>
                            <div className="inv-spinner" />
                            <p className="inv-center__msg">Loading payment form...</p>
                        </div>
                    )}

                    {!isPaid && (
                        <div className="inv-terms-inline">
                            By completing this payment, you agree to the terms of service. Payment is due upon receipt.
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="inv-footer">
                <p className="inv-footer__brand">ADMIREWORKS</p>
                <p className="inv-footer__sub">Admirable Venture Services · Dubai, UAE</p>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CSS — proper media queries, no inline style hacks
   ═══════════════════════════════════════════════════ */
const pageStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.inv-page {
    min-height: 100vh;
    background: linear-gradient(160deg, #f0f2f8 0%, #e4e7ef 100%);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
}

/* ── Brand bar ── */
.inv-brandbar {
    background: #001a70;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.inv-brandbar__left { display: flex; align-items: center; gap: 10px; }
.inv-brandbar__icon {
    width: 32px; height: 32px; border-radius: 6px;
    background: rgba(255,255,255,0.15); display: flex;
    align-items: center; justify-content: center;
}
.inv-brandbar__icon span { color: #cc9f53; font-weight: 800; font-size: 13px; }
.inv-brandbar__name { color: #fff; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.5px; }
.inv-brandbar__secure { color: rgba(255,255,255,0.5); font-size: 0.72rem; display: flex; align-items: center; gap: 6px; }

/* ── Grid layout ── */
.inv-grid {
    max-width: 960px;
    margin: 0 auto;
    padding: 24px 16px;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 20px;
    align-items: start;
}
@media (max-width: 720px) {
    .inv-grid {
        grid-template-columns: 1fr;
        padding: 16px 12px;
        gap: 16px;
    }
}

/* ── Card ── */
.inv-card {
    background: #fff;
    border-radius: 14px;
    padding: 28px 24px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.05);
}
@media (max-width: 720px) {
    .inv-card { padding: 20px 16px; border-radius: 12px; }
}

/* ── Card Header ── */
.inv-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
}
.inv-card__invoice-num { font-size: 1.15rem; font-weight: 800; color: #001a70; margin: 0; }

/* ── Labels ── */
.inv-label {
    font-size: 0.68rem; font-weight: 700; color: #999;
    letter-spacing: 0.5px; text-transform: uppercase; margin: 0 0 4px;
}

/* ── Status pill ── */
.inv-status {
    padding: 4px 12px; border-radius: 20px;
    font-size: 0.72rem; font-weight: 600; white-space: nowrap;
}
.inv-status--paid { background: #e6f9e6; color: #15803d; }
.inv-status--pending { background: #fff8e6; color: #b8860b; }

/* ── Info grid ── */
.inv-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 14px 18px;
    background: #f8f9fc;
    border-radius: 10px;
    margin-bottom: 20px;
}
.inv-info-value { font-weight: 600; margin: 0; font-size: 0.9rem; }
@media (max-width: 420px) {
    .inv-info-grid { grid-template-columns: 1fr; gap: 12px; padding: 12px 14px; }
}

/* ── Line Items ── */
.inv-items { margin-bottom: 16px; }
.inv-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    gap: 12px;
}
.inv-item__desc { flex: 1; min-width: 0; }
.inv-item__name { margin: 0; font-size: 0.88rem; font-weight: 500; }
.inv-item__meta { margin: 2px 0 0; font-size: 0.75rem; color: #999; }
.inv-item__amount { margin: 0; font-weight: 700; font-size: 0.92rem; white-space: nowrap; }

/* ── Totals ── */
.inv-totals { border-top: 2px solid #001a70; padding-top: 12px; }
.inv-totals__row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.88rem; }
.inv-totals__row span:first-child { color: #666; }
.inv-totals__total {
    display: flex; justify-content: space-between;
    padding: 10px 0; font-size: 1.1rem; font-weight: 800;
}
.inv-totals__total span:last-child { color: #001a70; }

/* ── Company info ── */
.inv-company {
    margin-top: 16px; padding-top: 14px; border-top: 1px solid #eee;
    font-size: 0.72rem; color: #999; line-height: 1.5;
}
.inv-company p { margin: 0; }
.inv-company strong { color: #333; }

/* ── Payment header ── */
.inv-payment-header {
    display: flex; align-items: center; gap: 8px; margin-bottom: 20px;
}
.inv-payment-header h3 { font-size: 1rem; font-weight: 700; color: #001a70; margin: 0; }

/* ── Pay button ── */
.inv-pay-btn {
    display: block; width: 100%; margin-top: 20px; padding: 15px 24px;
    background: linear-gradient(135deg, #001a70 0%, #002a9e 100%);
    color: #fff; font-size: 1rem; font-weight: 700; border-radius: 10px;
    border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,26,112,0.25);
    transition: all 0.2s ease; letter-spacing: 0.3px;
    font-family: inherit; -webkit-appearance: none;
}
.inv-pay-btn:active { transform: scale(0.98); }
.inv-pay-btn--loading {
    background: #6b7280; cursor: not-allowed; box-shadow: none;
}
.inv-pay-btn__inner { display: inline-flex; align-items: center; gap: 8px; }

/* ── Error ── */
.inv-error {
    margin-top: 12px; padding: 10px 14px; background: #fef2f2;
    border: 1px solid #fecaca; border-radius: 8px; color: #d44315; font-size: 0.85rem;
}

/* ── Success ── */
.inv-success { text-align: center; padding: 32px 16px; }
.inv-success__icon {
    width: 56px; height: 56px; border-radius: 50%;
    background: #e6f9e6; display: inline-flex;
    align-items: center; justify-content: center; margin-bottom: 14px;
}
.inv-success__title { color: #15803d; font-size: 1.05rem; margin: 0 0 6px; }
.inv-success__sub { color: #666; font-size: 0.85rem; margin: 0; }

/* ── Trust badges ── */
.inv-trust {
    text-align: center; margin-top: 16px; display: flex;
    align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;
}
.inv-trust span { font-size: 0.72rem; color: #bbb; }
.inv-trust__sep { color: #ddd; }
@media (max-width: 420px) {
    .inv-trust { gap: 4px; }
    .inv-trust__sep { display: none; }
    .inv-trust span { font-size: 0.68rem; }
}

/* ── Terms inline ── */
.inv-terms-inline {
    margin-top: 16px; padding-top: 14px; border-top: 1px solid #f0f0f0;
    font-size: 0.72rem; color: #aaa; line-height: 1.5;
}

/* ── Spinner ── */
.inv-spinner {
    width: 32px; height: 32px; border: 3px solid #e5e7eb;
    border-top-color: #001a70; border-radius: 50%;
    animation: inv-spin 0.8s linear infinite; margin: 0 auto;
}
.inv-spinner--sm {
    width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff; border-radius: 50%;
    animation: inv-spin 0.8s linear infinite; display: inline-block;
}
@keyframes inv-spin { to { transform: rotate(360deg); } }

/* ── Center layout ── */
.inv-center {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; min-height: 100vh; text-align: center; padding: 24px;
}
.inv-center__title { margin-top: 16px; color: #001a70; font-size: 1.1rem; }
.inv-center__msg { color: #666; font-size: 0.9rem; margin-top: 8px; }

/* ── Logo ── */
.inv-logo {
    width: 48px; height: 48px; border-radius: 10px;
    background: #001a70; display: inline-flex;
    align-items: center; justify-content: center;
}
.inv-logo__text { color: #cc9f53; font-weight: 800; font-size: 18px; }

/* ── Footer ── */
.inv-footer { text-align: center; padding: 12px 0 20px; }
.inv-footer__brand { font-weight: 800; font-size: 0.68rem; letter-spacing: 2px; color: #001a70; margin: 0; }
.inv-footer__sub { font-size: 0.65rem; color: #999; margin: 2px 0 0; }
`;
