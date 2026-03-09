'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    clientsService,
    invoicesService,
    recurringInvoicesService,
    type BillingClarity,
    type Client,
    type Invoice,
} from '@/lib/firestore';
import {
    computeInvoiceDueDate,
    generateInvoiceNumber,
    getCadenceIntervalMonths,
    type BillingCadence,
    type LegacyServiceCode,
} from '@/lib/billing';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, X, ExternalLink, Copy, Trash2 } from 'lucide-react';
import Link from 'next/link';

type LineItemForm = {
    description: string;
    qty: string;
    rate: string;
};

type InvoiceFormState = {
    invoiceNumber: string;
    clientId: string;
    currency: string;
    issuedAt: string;
    sendLeadDays: string;
    dueDate: string;
    notes: string;
    paymentTerms: string;
    discount: string;
    discountLabel: string;
    pricingRule: string;
    exchangeRateUsed: string;
    exchangeRateDate: string;
    exchangeRateSourceUrl: string;
    legacyServiceCode: LegacyServiceCode;
    billingCadence: BillingCadence;
    marketRegion: string;
    platformCount: string;
    legacyRateModel: string;
    minimumEngagementMonths: string;
    billingStatusLabel: string;
    lineItems: LineItemForm[];
    billingClarityTitle: string;
    dueNowLabel: string;
    billingScheduleText: string;
    scopeIncludedText: string;
    scopeExcludedText: string;
    createRecurringTemplate: boolean;
    recurringCadence: BillingCadence;
    nextSendDate: string;
    nextDueDate: string;
    allowInstapay: boolean;
    allowCard: boolean;
    allowBankTransfer: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyLineItem = (): LineItemForm => ({
    description: '',
    qty: '1',
    rate: '',
});

const parseTextList = (value: string): string[] =>
    value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

const parseSchedule = (value: string): BillingClarity['schedule'] =>
    value
        .split('\n')
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => {
            const [label, rawValue] = row.split('|').map((piece) => piece.trim());
            if (!label || !rawValue) return null;
            return { label, value: rawValue };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));

const toAmount = (value: string) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
};

const toLineItemPayload = (lineItem: LineItemForm) => {
    const qty = Math.max(0, Number(lineItem.qty) || 0);
    const rate = Math.max(0, Number(lineItem.rate) || 0);
    const description = lineItem.description.trim();
    return description ? { description, qty, rate, amount: qty * rate } : null;
};

export default function InvoicesPage() {
    const { isAdmin } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [copied, setCopied] = useState('');

    useEffect(() => {
        const unsubs = [
            invoicesService.subscribe(setInvoices),
            clientsService.subscribe(setClients),
        ];
        return () => { unsubs.forEach((unsubscribe) => unsubscribe()); };
    }, []);

    const buildDefaultForm = (): InvoiceFormState => {
        const issuedAt = today();
        const sendLeadDays = '3';
        const dueDate = computeInvoiceDueDate(issuedAt, Number(sendLeadDays));
        return {
            invoiceNumber: generateInvoiceNumber(invoices.map((invoice) => invoice.invoiceNumber), issuedAt),
            clientId: '',
            currency: 'AED',
            issuedAt,
            sendLeadDays,
            dueDate,
            notes: '',
            paymentTerms: '',
            discount: '0',
            discountLabel: '',
            pricingRule: '',
            exchangeRateUsed: '',
            exchangeRateDate: issuedAt,
            exchangeRateSourceUrl: '',
            legacyServiceCode: 'Ad Mgt',
            billingCadence: 'one_time',
            marketRegion: '',
            platformCount: '1',
            legacyRateModel: '',
            minimumEngagementMonths: '',
            billingStatusLabel: '',
            lineItems: [emptyLineItem()],
            billingClarityTitle: '',
            dueNowLabel: '',
            billingScheduleText: '',
            scopeIncludedText: '',
            scopeExcludedText: '',
            createRecurringTemplate: false,
            recurringCadence: 'monthly',
            nextSendDate: issuedAt,
            nextDueDate: dueDate,
            allowInstapay: false,
            allowCard: true,
            allowBankTransfer: false,
        };
    };

    const [form, setForm] = useState<InvoiceFormState>(buildDefaultForm);

    const filtered = invoices.filter((invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(search.toLowerCase())
    );

    const formSubtotal = useMemo(
        () => form.lineItems
            .map(toLineItemPayload)
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .reduce((sum, item) => sum + item.amount, 0),
        [form.lineItems],
    );
    const formDiscount = toAmount(form.discount);
    const formTotalDue = Math.max(0, formSubtotal - formDiscount);

    const openNewInvoice = () => {
        setForm(buildDefaultForm());
        setShowForm(true);
    };

    const handleClientChange = (clientId: string) => {
        const client = clients.find((item) => item.id === clientId);
        const currency = client?.baseCurrency || 'AED';
        const nextSendDate = client?.nextInvoiceSendDate || form.issuedAt;
        const sendLeadDays = Number(form.sendLeadDays) || 3;
        setForm((current) => ({
            ...current,
            clientId,
            currency,
            legacyServiceCode: client?.legacyServiceCode || current.legacyServiceCode,
            billingCadence: client?.billingCadence || current.billingCadence,
            recurringCadence: client?.billingCadence || current.recurringCadence,
            marketRegion: client?.marketRegion || current.marketRegion,
            platformCount: String(client?.platformCount || current.platformCount || '1'),
            legacyRateModel: client?.legacyRateModel || current.legacyRateModel,
            billingStatusLabel: client?.billingStatusLabel || current.billingStatusLabel,
            nextSendDate,
            nextDueDate: client?.nextInvoiceDueDate || computeInvoiceDueDate(nextSendDate, sendLeadDays),
            allowInstapay: currency === 'EGP',
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const client = clients.find((item) => item.id === form.clientId);
        if (!client?.id) return;

        const lineItems = form.lineItems
            .map(toLineItemPayload)
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
        if (lineItems.length === 0) return;

        const sendLeadDays = Math.max(0, Number(form.sendLeadDays) || 0);
        const billingClarity: BillingClarity | undefined = (
            form.billingClarityTitle ||
            form.dueNowLabel ||
            form.billingScheduleText ||
            form.scopeIncludedText ||
            form.scopeExcludedText
        ) ? {
            title: form.billingClarityTitle || undefined,
            dueNowLabel: form.dueNowLabel || undefined,
            schedule: parseSchedule(form.billingScheduleText),
            scopeIncluded: parseTextList(form.scopeIncludedText),
            scopeExcluded: parseTextList(form.scopeExcludedText),
        } : undefined;

        const exchangeRateSnapshot = form.exchangeRateUsed ? {
            used: Number(form.exchangeRateUsed),
            date: form.exchangeRateDate || form.issuedAt,
            sourceUrl: form.exchangeRateSourceUrl,
            pricingRule: form.pricingRule || undefined,
        } : undefined;

        const invoicePayload: Omit<Invoice, 'id' | 'createdAt'> = {
            invoiceNumber: form.invoiceNumber,
            clientId: client.id,
            clientName: client.name,
            lineItems,
            subtotal: formSubtotal,
            tax: 0,
            totalDue: formTotalDue,
            currency: form.currency,
            status: 'pending',
            issuedAt: form.issuedAt,
            dueDate: form.dueDate,
            notes: form.notes || undefined,
            paymentTerms: form.paymentTerms || undefined,
            discount: formDiscount > 0 ? formDiscount : undefined,
            discountLabel: form.discountLabel || undefined,
            billingClarity,
            exchangeRateSnapshot,
            exchangeRateUsed: exchangeRateSnapshot?.used,
            exchangeRateDate: exchangeRateSnapshot?.date,
            exchangeRateSourceUrl: exchangeRateSnapshot?.sourceUrl,
            pricingRule: form.pricingRule || undefined,
            sendLeadDays,
            billingPolicy: {
                legacyServiceCode: form.legacyServiceCode,
                billingCadence: form.billingCadence,
                billingStatusLabel: form.billingStatusLabel || undefined,
                marketRegion: form.marketRegion || undefined,
                platformCount: Number(form.platformCount) || 1,
                legacyRateModel: form.legacyRateModel || undefined,
                sendLeadDays,
                minimumEngagementMonths: Number(form.minimumEngagementMonths) || undefined,
            },
            reminderState: {
                legacyFollowUps: { first: false, second: false, third: false },
                statusLabel: form.billingStatusLabel || undefined,
            },
        };

        await invoicesService.create(invoicePayload);

        if (form.createRecurringTemplate) {
            const selectedPaymentMethods = [
                form.allowCard ? 'stripe' : null,
                form.allowInstapay ? 'instapay' : null,
                form.allowBankTransfer ? 'bank_transfer' : null,
            ].filter((item): item is 'stripe' | 'instapay' | 'bank_transfer' => Boolean(item));

            await recurringInvoicesService.create({
                clientId: client.id,
                clientName: client.name,
                templateName: `${client.name} — ${form.recurringCadence.replace('_', ' ')}`,
                lineItems,
                subtotal: formSubtotal,
                tax: 0,
                totalDue: formTotalDue,
                currency: form.currency,
                frequency: form.recurringCadence === 'monthly'
                    ? 'monthly'
                    : form.recurringCadence === 'annual'
                        ? 'annual'
                        : form.recurringCadence === '6_months'
                            ? 'semiannual'
                            : form.recurringCadence === 'quarterly' || form.recurringCadence === '3_months'
                                ? 'quarterly'
                                : 'custom_months',
                billingDay: Number((form.nextSendDate || form.issuedAt).slice(-2)) || 1,
                nextDueDate: form.nextDueDate,
                nextSendDate: form.nextSendDate,
                billingCadence: form.recurringCadence,
                intervalMonths: getCadenceIntervalMonths(form.recurringCadence),
                billingPolicy: {
                    legacyServiceCode: form.legacyServiceCode,
                    billingCadence: form.recurringCadence,
                    billingStatusLabel: form.billingStatusLabel || undefined,
                    marketRegion: form.marketRegion || undefined,
                    platformCount: Number(form.platformCount) || 1,
                    legacyRateModel: form.legacyRateModel || undefined,
                    sendLeadDays,
                    minimumEngagementMonths: Number(form.minimumEngagementMonths) || undefined,
                },
                exchangeRateSnapshot,
                sendLeadDays,
                reminderState: {
                    legacyFollowUps: { first: false, second: false, third: false },
                    statusLabel: form.billingStatusLabel || undefined,
                },
                invoiceTemplateData: {
                    billingClarity,
                    paymentTerms: form.paymentTerms || undefined,
                    discount: formDiscount > 0 ? formDiscount : undefined,
                    discountLabel: form.discountLabel || undefined,
                    pricingRule: form.pricingRule || undefined,
                },
                active: true,
                autoSendEmail: false,
                paymentMethods: selectedPaymentMethods.length > 0 ? selectedPaymentMethods : ['stripe'],
                notes: form.notes || undefined,
            });
        }

        setShowForm(false);
        setForm(buildDefaultForm());
    };

    const markPaid = async (invoice: Invoice) => {
        if (!invoice.id) return;
        await invoicesService.update(invoice.id, { status: 'paid', paidAt: new Date().toISOString() });
        try { await fetch(`/api/invoices/${invoice.id}/confirm-paid`, { method: 'POST' }); } catch { }
    };

    const copyLink = (invoice: Invoice) => {
        const url = `${window.location.origin}/invoice/${invoice.id}`;
        navigator.clipboard.writeText(url);
        setCopied(invoice.id || '');
        setTimeout(() => setCopied(''), 2000);
    };

    const updateLineItem = (index: number, field: keyof LineItemForm, value: string) => {
        setForm((current) => ({
            ...current,
            lineItems: current.lineItems.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
        }));
    };

    const addLineItem = () => {
        setForm((current) => ({ ...current, lineItems: [...current.lineItems, emptyLineItem()] }));
    };

    const removeLineItem = (index: number) => {
        setForm((current) => ({
            ...current,
            lineItems: current.lineItems.length === 1
                ? [emptyLineItem()]
                : current.lineItems.filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Invoices</h1>
                        <p className="page-subtitle">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
                    </div>
                    {isAdmin && <button className="btn btn-primary" onClick={openNewInvoice}><Plus size={16} /> New Invoice</button>}
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ position: 'relative', maxWidth: 400 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input type="text" className="form-input" placeholder="Search invoices..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">🧾</div><div className="empty-state-title">No Invoices</div></div></div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Invoice</th><th>Client</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td style={{ fontWeight: 600 }}>
                                        <Link href={`/invoice/${invoice.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                            {invoice.invoiceNumber}
                                        </Link>
                                    </td>
                                    <td>
                                        <div>{invoice.clientName}</div>
                                        {invoice.billingPolicy?.billingCadence && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                                                {[invoice.billingPolicy.legacyServiceCode, invoice.billingPolicy.billingCadence].filter(Boolean).join(' · ')}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{invoice.totalDue?.toLocaleString()} {invoice.currency}</td>
                                    <td>{invoice.dueDate}</td>
                                    <td><span className={`status-pill status-${invoice.status}`}>{invoice.status}</span></td>
                                    <td style={{ display: 'flex', gap: 8 }}>
                                        <Link href={`/invoice/${invoice.id}`} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                                            <ExternalLink size={12} /> View
                                        </Link>
                                        <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => copyLink(invoice)}>
                                            <Copy size={12} /> {copied === invoice.id ? 'Copied!' : 'Copy Link'}
                                        </button>
                                        {isAdmin && invoice.status === 'pending' && <button className="btn btn-gold" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => markPaid(invoice)}>Mark Paid</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowForm(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: 980, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>New Invoice</h2>
                                <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--muted)' }}>Supports full line-item invoices and optional recurring billing templates.</p>
                            </div>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Client *</label>
                                    <select className="form-input" required value={form.clientId} onChange={e => handleClientChange(e.target.value)}>
                                        <option value="">Select client</option>
                                        {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Invoice Number *</label>
                                    <input className="form-input" required value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Issue Date</label>
                                    <input className="form-input" type="date" value={form.issuedAt} onChange={e => setForm({
                                        ...form,
                                        issuedAt: e.target.value,
                                        dueDate: computeInvoiceDueDate(e.target.value, Number(form.sendLeadDays) || 3),
                                        nextSendDate: e.target.value,
                                        nextDueDate: computeInvoiceDueDate(e.target.value, Number(form.sendLeadDays) || 3),
                                        invoiceNumber: generateInvoiceNumber(invoices.map((invoice) => invoice.invoiceNumber), e.target.value),
                                        exchangeRateDate: e.target.value,
                                    })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Currency</label>
                                    <select className="form-input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value, allowInstapay: e.target.value === 'EGP' ? form.allowInstapay || true : false })}>
                                        <option value="AED">AED</option><option value="USD">USD</option><option value="EGP">EGP</option><option value="SAR">SAR</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Send Lead Days</label>
                                    <input className="form-input" type="number" min="0" value={form.sendLeadDays} onChange={e => setForm({
                                        ...form,
                                        sendLeadDays: e.target.value,
                                        dueDate: computeInvoiceDueDate(form.issuedAt, Number(e.target.value) || 0),
                                        nextDueDate: computeInvoiceDueDate(form.nextSendDate || form.issuedAt, Number(e.target.value) || 0),
                                    })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Legacy Service Code</label>
                                    <select className="form-input" value={form.legacyServiceCode} onChange={e => setForm({ ...form, legacyServiceCode: e.target.value as LegacyServiceCode })}>
                                        <option value="Ad Mgt">Ad Mgt</option>
                                        <option value="DRM">DRM</option>
                                        <option value="DRM+SM">DRM+SM</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Billing Cadence</label>
                                    <select className="form-input" value={form.billingCadence} onChange={e => setForm({ ...form, billingCadence: e.target.value as BillingCadence, recurringCadence: e.target.value as BillingCadence })}>
                                        <option value="one_time">One-Time</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="2_months">2 Months</option>
                                        <option value="3_months">3 Months</option>
                                        <option value="6_months">6 Months</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annual">Annual</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Market Region</label>
                                    <input className="form-input" value={form.marketRegion} onChange={e => setForm({ ...form, marketRegion: e.target.value })} placeholder="e.g. Egypt" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Platform Count</label>
                                    <input className="form-input" type="number" min="1" value={form.platformCount} onChange={e => setForm({ ...form, platformCount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Legacy Rate Model</label>
                                    <input className="form-input" value={form.legacyRateModel} onChange={e => setForm({ ...form, legacyRateModel: e.target.value })} placeholder="e.g. legacy_eg_3mo_700usd" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Min Engagement (Months)</label>
                                    <input className="form-input" type="number" min="0" value={form.minimumEngagementMonths} onChange={e => setForm({ ...form, minimumEngagementMonths: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Exchange Rate Used</label>
                                    <input className="form-input" type="number" step="0.0001" value={form.exchangeRateUsed} onChange={e => setForm({ ...form, exchangeRateUsed: e.target.value })} placeholder="e.g. 49.91" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Exchange Rate Date</label>
                                    <input className="form-input" type="date" value={form.exchangeRateDate} onChange={e => setForm({ ...form, exchangeRateDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Exchange Rate Source URL</label>
                                    <input className="form-input" value={form.exchangeRateSourceUrl} onChange={e => setForm({ ...form, exchangeRateSourceUrl: e.target.value })} placeholder="https://realegp.com/usd" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Discount Label</label>
                                    <input className="form-input" value={form.discountLabel} onChange={e => setForm({ ...form, discountLabel: e.target.value })} placeholder="e.g. 3-month bundle savings" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Discount Amount</label>
                                    <input className="form-input" type="number" step="0.01" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Pricing Rule</label>
                                <input className="form-input" value={form.pricingRule} onChange={e => setForm({ ...form, pricingRule: e.target.value })} placeholder="e.g. legacy_eg_3mo_700usd" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Line Items</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {form.lineItems.map((lineItem, index) => (
                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 0.8fr auto', gap: 12, alignItems: 'end' }}>
                                            <div>
                                                <input className="form-input" placeholder="Description" value={lineItem.description} onChange={e => updateLineItem(index, 'description', e.target.value)} />
                                            </div>
                                            <div>
                                                <input className="form-input" type="number" min="0" step="1" placeholder="Qty" value={lineItem.qty} onChange={e => updateLineItem(index, 'qty', e.target.value)} />
                                            </div>
                                            <div>
                                                <input className="form-input" type="number" min="0" step="0.01" placeholder="Rate" value={lineItem.rate} onChange={e => updateLineItem(index, 'rate', e.target.value)} />
                                            </div>
                                            <button type="button" className="btn btn-outline" onClick={() => removeLineItem(index)} style={{ height: 40 }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" className="btn btn-outline" style={{ marginTop: 12 }} onClick={addLineItem}>Add Line Item</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Billing Clarity Title</label>
                                    <input className="form-input" value={form.billingClarityTitle} onChange={e => setForm({ ...form, billingClarityTitle: e.target.value })} placeholder="e.g. What You Are Paying For" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Due Now Label</label>
                                    <input className="form-input" value={form.dueNowLabel} onChange={e => setForm({ ...form, dueNowLabel: e.target.value })} placeholder="e.g. Due now to start work" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Billing Schedule</label>
                                <textarea className="form-input" rows={3} value={form.billingScheduleText} onChange={e => setForm({ ...form, billingScheduleText: e.target.value })} placeholder="One item per line using Label | Value" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Scope Included</label>
                                    <textarea className="form-input" rows={4} value={form.scopeIncludedText} onChange={e => setForm({ ...form, scopeIncludedText: e.target.value })} placeholder="One item per line" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Scope Excluded</label>
                                    <textarea className="form-input" rows={4} value={form.scopeExcludedText} onChange={e => setForm({ ...form, scopeExcludedText: e.target.value })} placeholder="One item per line" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Payment Terms</label>
                                <input className="form-input" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} placeholder="e.g. Payment starts work immediately; due in 3 days" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes or client-facing summary." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Billing Status Label</label>
                                <input className="form-input" value={form.billingStatusLabel} onChange={e => setForm({ ...form, billingStatusLabel: e.target.value })} placeholder="e.g. 45 DAYS REMAINING" />
                            </div>

                            <div style={{ padding: '16px 18px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, marginBottom: 14 }}>
                                    <input type="checkbox" checked={form.createRecurringTemplate} onChange={e => setForm({ ...form, createRecurringTemplate: e.target.checked })} />
                                    Create recurring template for future invoices
                                </label>
                                {form.createRecurringTemplate && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                            <div className="form-group">
                                                <label className="form-label">Recurring Cadence</label>
                                                <select className="form-input" value={form.recurringCadence} onChange={e => setForm({ ...form, recurringCadence: e.target.value as BillingCadence })}>
                                                    <option value="monthly">Monthly</option>
                                                    <option value="2_months">2 Months</option>
                                                    <option value="3_months">3 Months</option>
                                                    <option value="6_months">6 Months</option>
                                                    <option value="quarterly">Quarterly</option>
                                                    <option value="annual">Annual</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Next Send Date</label>
                                                <input className="form-input" type="date" value={form.nextSendDate} onChange={e => setForm({
                                                    ...form,
                                                    nextSendDate: e.target.value,
                                                    nextDueDate: computeInvoiceDueDate(e.target.value, Number(form.sendLeadDays) || 0),
                                                })} />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Next Due Date</label>
                                                <input className="form-input" type="date" value={form.nextDueDate} onChange={e => setForm({ ...form, nextDueDate: e.target.value })} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="checkbox" checked={form.allowInstapay} onChange={e => setForm({ ...form, allowInstapay: e.target.checked })} />
                                                InstaPay
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="checkbox" checked={form.allowCard} onChange={e => setForm({ ...form, allowCard: e.target.checked })} />
                                                Card
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="checkbox" checked={form.allowBankTransfer} onChange={e => setForm({ ...form, allowBankTransfer: e.target.checked })} />
                                                Bank Transfer
                                            </label>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--bg)', marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span>Subtotal</span>
                                    <strong>{formSubtotal.toLocaleString()} {form.currency}</strong>
                                </div>
                                {formDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: 'var(--muted)' }}>
                                        <span>{form.discountLabel || 'Discount'}</span>
                                        <span>-{formDiscount.toLocaleString()} {form.currency}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--primary)' }}>
                                    <span>Total Due</span>
                                    <span>{formTotalDue.toLocaleString()} {form.currency}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
