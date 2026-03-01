'use client';

import { useEffect, useState } from 'react';
import { paymentsService, type Payment } from '@/lib/firestore';
import { CreditCard } from 'lucide-react';

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    useEffect(() => { return paymentsService.subscribe(setPayments); }, []);

    const total = payments.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0);

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Payments</h1>
                <p className="page-subtitle">{payments.length} payment{payments.length !== 1 ? 's' : ''} · Total: {total.toLocaleString()}</p>
            </div>

            {payments.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">💳</div><div className="empty-state-title">No Payments Yet</div><p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Payments will appear here after invoices are paid.</p></div></div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead><tr><th>Client</th><th>Invoice</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id}>
                                    <td>{p.clientName}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.invoiceNumber || '—'}</td>
                                    <td style={{ fontWeight: 600 }}>{p.amount?.toLocaleString()} {p.currency}</td>
                                    <td>{p.method}</td>
                                    <td><span className={`status-pill status-${p.status === 'succeeded' ? 'paid' : p.status === 'failed' ? 'overdue' : 'pending'}`}>{p.status}</span></td>
                                    <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
