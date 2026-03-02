'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface LineItem {
    description: string;
    qty: number;
    rate: number;
    amount: number;
}

interface InvoiceData {
    id: string;
    invoiceNumber: string;
    clientName: string;
    lineItems: LineItem[];
    subtotal: number;
    tax: number;
    totalDue: number;
    currency: string;
    status: string;
    issuedAt?: string;
    dueDate?: string;
    paidAt?: string;
    stripePaymentLinkUrl?: string;
    notes?: string;
}

interface CompanyData {
    name: string;
    tagline: string;
    email: string;
    phone: string;
    address: string;
}

export default function PublicInvoicePage() {
    const { id } = useParams<{ id: string }>();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [company, setCompany] = useState<CompanyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/invoices/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { setError(data.error); }
                else { setInvoice(data.invoice); setCompany(data.company); }
            })
            .catch(() => setError('Failed to load invoice'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #f5f5f7)' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: '#001a70', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <span style={{ color: '#cc9f53', fontWeight: 800, fontSize: 18 }}>AW</span>
                </div>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>Loading invoice...</p>
            </div>
        </div>
    );

    if (error || !invoice) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7' }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ marginBottom: 8 }}>Invoice Not Found</h2>
                <p style={{ color: '#666' }}>{error || 'This invoice does not exist.'}</p>
            </div>
        </div>
    );

    const formatDate = (d?: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatAmount = (amt: number) => amt.toLocaleString('en-US', { minimumFractionDigits: 0 });

    const isPaid = invoice.status === 'paid';

    return (
        <div style={{
            minHeight: '100vh', background: 'linear-gradient(135deg, #f0f2f8 0%, #e8eaf0 100%)',
            padding: '40px 16px', fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
                {/* Invoice Card */}
                <div style={{
                    background: '#fff', borderRadius: 16, padding: '40px 36px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
                }}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#001a70', margin: 0 }}>INVOICE</h1>
                            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 4 }}>{invoice.invoiceNumber}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 10, background: '#001a70',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6,
                            }}>
                                <span style={{ color: '#cc9f53', fontWeight: 800, fontSize: 16 }}>AW</span>
                            </div>
                            {company && (
                                <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.5 }}>
                                    <p style={{ margin: 0, fontWeight: 600, color: '#333' }}>{company.name}</p>
                                    <p style={{ margin: 0 }}>{company.address}</p>
                                    <p style={{ margin: 0 }}>{company.email}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28,
                        padding: '20px 24px', background: '#f8f9fc', borderRadius: 10,
                    }}>
                        <div>
                            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#999', letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 6px' }}>Bill To</p>
                            <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>{invoice.clientName}</p>
                        </div>
                        <div>
                            <div style={{ marginBottom: 8 }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#999', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>Invoice Date</p>
                                <p style={{ fontWeight: 500, margin: 0 }}>{formatDate(invoice.issuedAt)}</p>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#999', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>Due Date</p>
                                <p style={{ fontWeight: 500, margin: 0 }}>{formatDate(invoice.dueDate)}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#999', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>Status</p>
                                <span style={{
                                    display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                    background: isPaid ? '#e6f9e6' : '#fff8e6', color: isPaid ? '#15803d' : '#b8860b',
                                }}>
                                    {isPaid ? '✓ Paid' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #001a70' }}>
                                <th style={{ textAlign: 'left', padding: '10px 0', fontSize: '0.72rem', fontWeight: 700, color: '#001a70', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Description</th>
                                <th style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.72rem', fontWeight: 700, color: '#001a70', letterSpacing: '0.5px', textTransform: 'uppercase', width: 60 }}>Qty</th>
                                <th style={{ textAlign: 'right', padding: '10px 0', fontSize: '0.72rem', fontWeight: 700, color: '#001a70', letterSpacing: '0.5px', textTransform: 'uppercase', width: 120 }}>Rate</th>
                                <th style={{ textAlign: 'right', padding: '10px 0', fontSize: '0.72rem', fontWeight: 700, color: '#001a70', letterSpacing: '0.5px', textTransform: 'uppercase', width: 120 }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(invoice.lineItems || []).map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '14px 0', fontSize: '0.88rem' }}>{item.description}</td>
                                    <td style={{ padding: '14px 0', textAlign: 'center', fontSize: '0.88rem' }}>{item.qty}</td>
                                    <td style={{ padding: '14px 0', textAlign: 'right', fontSize: '0.88rem' }}>{formatAmount(item.rate)} {invoice.currency}</td>
                                    <td style={{ padding: '14px 0', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600 }}>{formatAmount(item.amount)} {invoice.currency}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
                        <div style={{ width: 260 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.88rem' }}>
                                <span style={{ color: '#666' }}>Subtotal</span>
                                <span>{formatAmount(invoice.subtotal)} {invoice.currency}</span>
                            </div>
                            {invoice.tax > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.88rem' }}>
                                    <span style={{ color: '#666' }}>Tax</span>
                                    <span>{formatAmount(invoice.tax)} {invoice.currency}</span>
                                </div>
                            )}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', padding: '12px 0',
                                borderTop: '2px solid #001a70', fontSize: '1.1rem', fontWeight: 800,
                            }}>
                                <span>Total Due</span>
                                <span style={{ color: '#001a70' }}>{formatAmount(invoice.totalDue)} {invoice.currency}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pay Button */}
                    {!isPaid && invoice.stripePaymentLinkUrl && (
                        <a
                            href={invoice.stripePaymentLinkUrl}
                            style={{
                                display: 'block', textAlign: 'center', padding: '16px 32px',
                                background: 'linear-gradient(135deg, #001a70 0%, #002a9e 100%)',
                                color: '#fff', fontSize: '1rem', fontWeight: 700, borderRadius: 10,
                                textDecoration: 'none', maxWidth: 400, margin: '0 auto',
                                boxShadow: '0 4px 12px rgba(0,26,112,0.3)',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                        >
                            Pay {formatAmount(invoice.totalDue)} {invoice.currency} →
                        </a>
                    )}

                    {isPaid && (
                        <div style={{
                            textAlign: 'center', padding: '16px 32px',
                            background: '#e6f9e6', color: '#15803d', fontSize: '1rem', fontWeight: 700,
                            borderRadius: 10, maxWidth: 400, margin: '0 auto',
                        }}>
                            ✓ This invoice has been paid {invoice.paidAt ? `on ${formatDate(invoice.paidAt)}` : ''}
                        </div>
                    )}

                    {/* Trust Badge */}
                    <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.8rem', color: '#999' }}>
                        🔒 Payments are processed securely via <strong style={{ color: '#635bff' }}>Stripe</strong>
                    </p>

                    {/* Terms */}
                    <div style={{
                        marginTop: 28, paddingTop: 20, borderTop: '1px solid #eee',
                        fontSize: '0.76rem', color: '#888', lineHeight: 1.6,
                    }}>
                        <p><strong style={{ color: '#333' }}>Terms & Conditions:</strong></p>
                        <p>This invoice represents the monthly retainer. Payment is due upon receipt. Upon payment confirmation, services continue uninterrupted for the billing period.</p>
                        {company && (
                            <p>For questions, contact us at <a href={`mailto:${company.email}`} style={{ color: '#001a70' }}>{company.email}</a> or {company.phone}.</p>
                        )}
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
