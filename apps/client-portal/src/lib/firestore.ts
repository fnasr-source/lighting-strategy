/**
 * Firestore Service — all CRUD operations for the platform.
 * Used from client-side React components via Firebase Client SDK.
 */
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore';
import type {
    BillingCadence,
    BillingPolicyMetadata,
    ExchangeRateSnapshot,
    LegacyServiceCode,
    ReminderState,
} from '@/lib/billing';
import { db } from '@/lib/firebase';

function splitIntoBatches<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        batches.push(items.slice(i, i + size));
    }
    return batches;
}

function getSortableTime(value: any): number {
    if (!value) return 0;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?.seconds === 'number') return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

// ── Types ────────────────────────────────────────────
export interface Contact {
    name: string;
    email: string;
    phone?: string;
    title?: string; // e.g. "CEO", "Marketing Manager"
    role: 'primary' | 'cc';
}

export interface Client {
    id?: string;
    name: string;
    email?: string;       // kept for backward compat — primary contact email
    phone?: string;       // kept for backward compat
    company?: string;
    contacts?: Contact[]; // multiple contacts: primary + CC
    region: string; // EG, AE, SA, US...
    baseCurrency: string;
    status: 'lead' | 'prospect' | 'proposal_sent' | 'active' | 'churned';
    businessType?: 'ecommerce' | 'lead_gen' | 'hybrid' | 'saas';
    industry?: string; // e.g. 'fashion', 'hr_consulting', 'food_beverage'
    ga4PropertyId?: string;
    clientCode?: string;
    legacyServiceCode?: LegacyServiceCode;
    billingCadence?: BillingCadence;
    billingStatusLabel?: string;
    nextInvoiceSendDate?: string;
    nextInvoiceDueDate?: string;
    legacyRateModel?: string;
    marketRegion?: string;
    platformCount?: number;
    notes?: string;
    nextMeetingAt?: string;
    lastMeetingAt?: string;
    meetingCount?: number;
    createdAt?: any;
    updatedAt?: any;
}

export interface BillingClarityScheduleItem {
    label: string;
    value: string;
}

export interface BillingClarity {
    title?: string;
    dueNowLabel?: string;
    schedule?: BillingClarityScheduleItem[];
    scopeIncluded?: string[];
    scopeExcluded?: string[];
}

export interface Invoice {
    id?: string;
    invoiceNumber: string;
    clientId: string;
    clientName: string;
    proposalNumber?: string;
    lineItems: { description: string; qty: number; rate: number; amount: number }[];
    subtotal: number;
    tax: number;
    totalDue: number;
    currency: string;
    status: 'draft' | 'pending' | 'paid' | 'overdue';
    stripePaymentLinkId?: string;
    stripePaymentLinkUrl?: string;
    issuedAt?: string;
    dueDate?: string;
    paidAt?: string;
    discount?: number;
    discountLabel?: string;
    billingClarity?: BillingClarity;
    exchangeRateSnapshot?: ExchangeRateSnapshot;
    exchangeRateUsed?: number;
    exchangeRateDate?: string;
    exchangeRateSourceUrl?: string;
    pricingRule?: string;
    billingPolicy?: BillingPolicyMetadata;
    sendLeadDays?: number;
    reminderState?: ReminderState;
    paymentTerms?: string;
    legacyUrl?: string;
    emailSent?: boolean;
    emailSentAt?: string;
    servicePeriodStart?: string;
    servicePeriodMonths?: number;
    servicePeriodEnd?: string;
    notes?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface Payment {
    id?: string;
    clientId: string;
    clientName: string;
    invoiceId?: string;
    invoiceNumber?: string;
    amount: number;
    currency: string;
    method: 'stripe' | 'instapay' | 'bank_transfer';
    status: 'succeeded' | 'pending' | 'failed';
    stripePaymentIntentId?: string;
    instapayRef?: string;       // InstaPay reference number
    proofUrl?: string;          // Screenshot/proof of payment (Firebase Storage URL)
    paidAt?: string;
    createdAt?: any;
}

export interface RecurringInvoice {
    id?: string;
    clientId: string;
    clientName: string;
    templateName: string;       // e.g. "Monthly Marketing Retainer"
    lineItems: { description: string; qty: number; rate: number; amount: number }[];
    subtotal: number;
    tax: number;
    totalDue: number;
    currency: string;
    frequency: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom_months';
    billingDay: number;         // Day of month (1-28)
    nextDueDate: string;        // YYYY-MM-DD
    nextSendDate?: string;      // YYYY-MM-DD
    billingCadence?: BillingCadence;
    intervalMonths?: number;
    billingPolicy?: BillingPolicyMetadata;
    exchangeRateSnapshot?: ExchangeRateSnapshot;
    sendLeadDays?: number;
    reminderState?: ReminderState;
    invoiceTemplateData?: {
        billingClarity?: BillingClarity;
        paymentTerms?: string;
        discount?: number;
        discountLabel?: string;
        pricingRule?: string;
    };
    active: boolean;
    autoSendEmail: boolean;     // Whether to auto-email on generation
    paymentMethods: ('stripe' | 'instapay' | 'bank_transfer')[]; // Allowed payment methods
    servicePeriodStart?: string;
    servicePeriodMonths?: number;
    servicePeriodEnd?: string;
    notes?: string;
    lastGeneratedAt?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface InvoiceReminder {
    id?: string;
    invoiceId: string;
    invoiceNumber: string;
    clientId: string;
    clientName: string;
    type: 'upcoming' | 'due_today' | 'overdue_3d' | 'overdue_7d' | 'overdue_14d';
    sentAt?: string;
    status: 'pending' | 'sent' | 'failed';
    createdAt?: any;
}

// ── Reporting Engine Types ───────────────────────────

export interface PlatformConnection {
    id?: string;
    clientId: string;
    platform: 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'ga4' | 'shopify' | 'woocommerce';
    isConnected: boolean;
    credentials?: Record<string, string>; // legacy path
    credentialRef?: {
        provider: 'firestore';
        key: string;
        version: number;
    };
    credentialsMasked?: Record<string, string>;
    timezone?: string;
    currency?: string;
    lastSync?: string;
    syncStatus?: 'ok' | 'error' | 'syncing';
    lastError?: string | null;
    createdAt?: any;
}

export interface MonthlyPlatformMetric {
    id?: string;
    clientId: string;
    platform: string;
    platformType: 'ad' | 'ecommerce' | 'analytics';
    monthEndDate: string;
    currency: string;
    impressions: number;
    clicks: number;
    spend: number;
    revenue: number;
    conversions: number;
    orders: number;
    reach: number;
    frequency: number;
    linkClicks: number;
    cpm: number;
    source?: string;
    aggregatedAt?: any;
}

export interface DailyPlatformMetric {
    id?: string;
    clientId: string;
    platform: string;
    platformType: 'ad' | 'ecommerce' | 'analytics';
    date: string;              // YYYY-MM-DD
    granularity: 'daily';
    currency: string;
    impressions: number;
    clicks: number;
    spend: number;
    revenue: number;
    conversions: number;
    orders: number;
    reach: number;
    frequency: number;
    linkClicks: number;
    cpm: number;
    source?: string;
    aggregatedAt?: any;
}

export interface MonthlyClientRollup {
    id?: string;
    clientId: string;
    platformType: 'ad' | 'ecommerce' | 'combined';
    monthEndDate: string;
    currency: string;
    impressions: number;
    clicks: number;
    spend: number;
    revenue: number;
    conversions: number;
    orders: number;
    roas: number;
    cpo: number;
    aov: number;
    cpm: number;
    source?: string;
    aggregatedAt?: any;
}

// ── Communication Types ──────────────────────────────

export interface Thread {
    id?: string;
    clientId: string;
    clientName: string;
    subject: string;
    category: 'general' | 'approval' | 'report' | 'billing';
    priority: 'normal' | 'urgent';
    status: 'open' | 'resolved' | 'waiting';
    lastMessageAt?: any;
    lastMessagePreview?: string;
    createdBy: string;     // UID
    createdByName: string;
    messageCount?: number;
    createdAt?: any;
    updatedAt?: any;
}

export interface Message {
    id?: string;
    threadId: string;
    senderUid: string;
    senderName: string;
    senderRole: 'owner' | 'admin' | 'team' | 'client';
    content: string;
    attachments?: { name: string; url: string; type: string }[];
    // Approval-specific
    approvalAction?: 'request' | 'approve' | 'reject';
    approvalItemUrl?: string;
    createdAt?: any;
}

// ── Expenses ─────────────────────────────────────────

export interface Expense {
    id?: string;
    description: string;
    amount: number;
    currency: string;
    category: 'operations' | 'marketing' | 'tools' | 'payroll' | 'office' | 'client' | 'other';
    clientId?: string;       // If expense is client-specific
    clientName?: string;
    date: string;            // YYYY-MM-DD
    vendor?: string;
    receiptUrl?: string;
    isRecurring?: boolean;
    recurringPeriod?: 'monthly' | 'quarterly' | 'yearly';
    status?: 'draft' | 'approved' | 'scheduled' | 'paid' | 'cancelled';
    dueDate?: string;
    source?: 'manual' | 'email' | 'import';
    financeInboxItemId?: string;
    financeFingerprint?: string;
    invoiceReference?: string;
    recurringExpenseId?: string;
    paymentAccount?: string;
    approvalState?: 'pending' | 'approved' | 'rejected';
    notes?: string;
    createdBy?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface FinanceInboxAttachment {
    filename: string;
    mimeType?: string;
    attachmentId?: string;
    size?: number;
    excerpt?: string;
}

export interface FinanceInboxItem {
    id?: string;
    source: 'gmail';
    gmailMessageId: string;
    gmailThreadId?: string;
    labelNames: string[];
    receivedAt?: string;
    sender?: string;
    subject?: string;
    attachments?: FinanceInboxAttachment[];
    parsedType: 'vendor_invoice' | 'receipt' | 'payment_confirmation' | 'bank_notice' | 'unknown';
    extractedVendor?: string;
    extractedAmount?: number;
    extractedCurrency?: string;
    extractedInvoiceNumber?: string;
    extractedInvoiceDate?: string;
    extractedDueDate?: string;
    extractedDescription?: string;
    recurrenceHint?: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'unknown';
    confidence?: number;
    reviewStatus: 'pending' | 'approved' | 'rejected';
    postingTarget?: 'expense' | 'recurring_expense' | 'payment' | 'ignore';
    suggestedPostingTarget?: 'expense' | 'recurring_expense' | 'payment' | 'ignore';
    suggestedRecurringExpenseId?: string;
    suggestedRecurringExpenseName?: string;
    suggestedInvoiceId?: string;
    suggestedInvoiceNumber?: string;
    aiSummary?: string;
    aiReasoning?: string;
    analysisVersion?: string;
    linkedExpenseId?: string;
    linkedRecurringExpenseId?: string;
    linkedPaymentId?: string;
    financeFingerprint?: string;
    duplicateOfInboxItemId?: string;
    rawSnippet?: string;
    parserVersion?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface RecurringExpense {
    id?: string;
    name: string;
    vendor?: string;
    category: string;
    utilizedBy?: string;
    cadence: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom_months';
    intervalMonths?: number;
    nextChargeDate: string;
    amount: number;
    currency: string;
    normalizedAmount?: number;
    normalizedCurrency?: string;
    paymentAccount?: string;
    status: 'active' | 'paused' | 'cancelled';
    source: 'csv' | 'email' | 'manual';
    remarks?: string;
    aliases?: string[];
    financeInboxItemId?: string;
    lastChargedAt?: string;
    lastInvoiceAmount?: number;
    lastEmailSubject?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface CashAccount {
    id?: string;
    name: string;
    accountType: 'bank' | 'wallet' | 'card' | 'petty_cash';
    currency: string;
    currentBalance: number;
    includeInAvailableCash: boolean;
    notes?: string;
    lastUpdatedAt?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface FinanceEntry {
    id?: string;
    entryType: 'receivable_due' | 'receivable_paid' | 'payable_due' | 'payable_paid' | 'deferred_revenue_hold' | 'deferred_revenue_release' | 'manual_adjustment';
    direction: 'inflow' | 'outflow' | 'reserve';
    amount: number;
    currency: string;
    normalizedAmount?: number;
    normalizedCurrency?: string;
    effectiveDate: string;
    sourceType: 'invoice' | 'payment' | 'expense' | 'recurring_expense' | 'proposal' | 'system';
    sourceId: string;
    clientId?: string;
    clientName?: string;
    vendor?: string;
    status: 'scheduled' | 'posted' | 'cleared';
    notes?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface FinanceAlert {
    id?: string;
    type: 'invoice_due_tomorrow' | 'subscription_due_tomorrow' | 'payable_due_tomorrow' | 'overdue_invoice' | 'low_free_cash' | 'forecast_shortfall' | 'inbox_review_pending';
    severity: 'low' | 'medium' | 'high';
    targetDate: string;
    status: 'open' | 'dismissed' | 'sent';
    title: string;
    description: string;
    relatedId?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface FinanceSettings {
    id?: string;
    gmailConnectedEmail?: string;
    watchedLabels: string[];
    pollingMinutes: number;
    digestRecipients: string[];
    baseCurrency: string;
    forecastHorizons: number[];
    dailyDigestHourDubai?: number;
    createdAt?: any;
    updatedAt?: any;
}

export interface Lead {
    id?: string;
    name: string;
    email?: string;
    company?: string;
    phone?: string;
    source: 'apollo' | 'referral' | 'inbound' | 'event' | 'other';
    priority: 'A' | 'B' | 'C';
    status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'converted';
    assignedTo?: string;
    notes?: string;
    convertedToClientId?: string;
    nextMeetingAt?: string;
    lastMeetingAt?: string;
    meetingCount?: number;
    createdAt?: any;
    updatedAt?: any;
}

export interface Proposal {
    id?: string;
    clientId?: string;
    clientName: string;
    proposalNumber: string;
    status: 'draft' | 'ready' | 'sent' | 'accepted' | 'declined' | 'expired';
    sentDate?: string;
    validUntil?: string;
    recommendedOption?: string;
    documentUrl?: string;
    totalValue?: number;
    currency?: string;
    notes?: string;
    createdAt?: any;
}

export interface PaymentLink {
    id?: string;
    stripePaymentLinkId: string;
    url: string;
    productName: string;
    amount: number;
    currency: string;
    billingType: 'one-time' | 'monthly';
    clientId?: string;
    clientName?: string;
    status: 'active' | 'inactive';
    createdAt?: any;
}

export interface IngestionJob {
    id?: string;
    clientId: string;
    platform: string;
    status: 'running' | 'success' | 'partial' | 'error';
    rowsRead: number;
    rowsWritten: number;
    startedAt: string;
    finishedAt?: string;
    createdAt?: any;
    updatedAt?: any;
}

// ── Scheduling Types ────────────────────────────────

export interface SchedulingHost {
    id?: string;
    uid: string;
    email: string;
    displayName: string;
    timezone: string;
    active: boolean;
    defaultAvailability: { weekday: number; startTime: string; endTime: string }[];
    google?: {
        connected: boolean;
        calendarId?: string;
        lastSyncAt?: string;
        lastError?: string;
    };
    createdAt?: any;
    updatedAt?: any;
}

export interface SchedulingEventType {
    id?: string;
    slug: string;
    name: string;
    description?: string;
    audienceCase: 'lead' | 'client' | 'team_partner';
    durationMin: number;
    bufferBeforeMin: number;
    bufferAfterMin: number;
    minNoticeMinutes: number;
    bookingWindowDays: number;
    cancelCutoffHours: number;
    routingMode: 'host_fixed' | 'round_robin_weighted' | 'collective_required';
    fixedHostUserId?: string;
    timezone: string;
    reminderPolicy: { firstMinutesBefore: number; secondMinutesBefore: number };
    intakeQuestions: { id: string; label: string; type: string; required: boolean; options?: string[] }[];
    locationType: 'google_meet' | 'phone' | 'custom';
    locationDetails?: string;
    isActive: boolean;
    createdAt?: any;
    updatedAt?: any;
}

export interface SchedulingBooking {
    id?: string;
    eventTypeId: string;
    eventSlug: string;
    eventName: string;
    status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    startAt: string;
    endAt: string;
    hostUserIds: string[];
    primaryHostUserId: string;
    invitee: {
        name: string;
        email: string;
        phone?: string;
        company?: string;
        timezone: string;
    };
    googleMeetLink?: string;
    locationText?: string;
    linkedLeadId?: string;
    linkedClientId?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface SchedulingHostEventTypeMap {
    id?: string;
    eventTypeId: string;
    hostUserId: string;
    weight: number;
    active: boolean;
    createdAt?: any;
    updatedAt?: any;
}

export interface SchedulingAvailabilityRule {
    id?: string;
    hostUserId: string;
    eventTypeId?: string;
    ruleType: 'weekly' | 'date_override';
    weekday?: number;
    date?: string;
    startTime?: string;
    endTime?: string;
    isAvailable: boolean;
    createdAt?: any;
    updatedAt?: any;
}

export interface SchedulingReminder {
    id?: string;
    bookingId: string;
    reminderType: '24h' | '1h';
    scheduledFor: string;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    idempotencyKey: string;
    attempts: number;
    createdAt?: any;
    updatedAt?: any;
}

export interface Task {
    id?: string;
    bookingId?: string;
    title: string;
    description?: string;
    assignedToUid?: string;
    dueAt?: string;
    status: 'open' | 'done';
    createdAt?: any;
    updatedAt?: any;
}

// ── Clients ──────────────────────────────────────────
export const clientsService = {
    async getAll(): Promise<Client[]> {
        const snap = await getDocs(query(collection(db, 'clients'), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    },

    async getById(id: string): Promise<Client | null> {
        const snap = await getDoc(doc(db, 'clients', id));
        return snap.exists() ? { id: snap.id, ...snap.data() } as Client : null;
    },

    async getByIds(ids: string[]): Promise<Client[]> {
        const uniqueIds = [...new Set(ids.filter(Boolean))];
        const results = await Promise.all(uniqueIds.map((id) => this.getById(id)));
        return results.filter((client): client is Client => Boolean(client));
    },

    async create(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'clients'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<Client>): Promise<void> {
        await updateDoc(doc(db, 'clients', id), { ...data, updatedAt: serverTimestamp() });
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'clients', id));
    },

    subscribe(callback: (clients: Client[]) => void) {
        return onSnapshot(query(collection(db, 'clients'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
        });
    },

    subscribeByIds(ids: string[], callback: (clients: Client[]) => void) {
        const uniqueIds = [...new Set(ids.filter(Boolean))];
        if (uniqueIds.length === 0) {
            callback([]);
            return () => { };
        }

        const unsubs = uniqueIds.map((id) =>
            onSnapshot(doc(db, 'clients', id), () => {
                void this.getByIds(uniqueIds).then((clients) => callback(clients));
            }),
        );

        void this.getByIds(uniqueIds).then((clients) => callback(clients));
        return () => unsubs.forEach((unsub) => unsub());
    },
};

// ── Invoices ─────────────────────────────────────────
export const invoicesService = {
    async getAll(): Promise<Invoice[]> {
        const snap = await getDocs(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
    },

    async getByClient(clientId: string): Promise<Invoice[]> {
        const snap = await getDocs(query(collection(db, 'invoices'), where('clientId', '==', clientId), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
    },

    async create(data: Omit<Invoice, 'id' | 'createdAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'invoices'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<Invoice>): Promise<void> {
        await updateDoc(doc(db, 'invoices', id), { ...data, updatedAt: serverTimestamp() });
    },

    subscribe(callback: (invoices: Invoice[]) => void) {
        return onSnapshot(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
        });
    },
};

// ── Payments ─────────────────────────────────────────
export const paymentsService = {
    async getAll(): Promise<Payment[]> {
        const snap = await getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
    },

    async getByClient(clientId: string): Promise<Payment[]> {
        const snap = await getDocs(query(collection(db, 'payments'), where('clientId', '==', clientId), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
    },

    async create(data: Omit<Payment, 'id' | 'createdAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'payments'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    subscribe(callback: (payments: Payment[]) => void) {
        return onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        });
    },
};

// ── Recurring Invoices ───────────────────────────────
export const recurringInvoicesService = {
    async getAll(): Promise<RecurringInvoice[]> {
        const snap = await getDocs(query(collection(db, 'recurringInvoices'), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringInvoice));
    },

    async getActive(): Promise<RecurringInvoice[]> {
        const snap = await getDocs(query(collection(db, 'recurringInvoices'), where('active', '==', true)));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringInvoice));
    },

    async create(data: Omit<RecurringInvoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'recurringInvoices'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<RecurringInvoice>): Promise<void> {
        await updateDoc(doc(db, 'recurringInvoices', id), { ...data, updatedAt: serverTimestamp() });
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'recurringInvoices', id));
    },

    subscribe(callback: (items: RecurringInvoice[]) => void) {
        return onSnapshot(query(collection(db, 'recurringInvoices'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringInvoice)));
        });
    },
};

// ── Invoice Reminders ────────────────────────────────
export const remindersService = {
    async getByInvoice(invoiceId: string): Promise<InvoiceReminder[]> {
        const snap = await getDocs(query(collection(db, 'invoiceReminders'), where('invoiceId', '==', invoiceId)));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as InvoiceReminder));
    },

    async create(data: Omit<InvoiceReminder, 'id' | 'createdAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'invoiceReminders'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    async markSent(id: string): Promise<void> {
        await updateDoc(doc(db, 'invoiceReminders', id), { status: 'sent', sentAt: new Date().toISOString() });
    },
};

// ── Expenses ─────────────────────────────────────────
export const expensesService = {
    subscribe(callback: (items: Expense[]) => void) {
        return onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
        });
    },
    async create(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'expenses'), {
            ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        return ref.id;
    },
    async update(id: string, data: Partial<Expense>): Promise<void> {
        await updateDoc(doc(db, 'expenses', id), { ...data, updatedAt: serverTimestamp() });
    },
    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'expenses', id));
    },
};

export const financeInboxService = {
    subscribe(callback: (items: FinanceInboxItem[]) => void) {
        return onSnapshot(query(collection(db, 'financeInboxItems'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinanceInboxItem)));
        });
    },
    async create(data: Omit<FinanceInboxItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'financeInboxItems'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },
    async update(id: string, data: Partial<FinanceInboxItem>): Promise<void> {
        await updateDoc(doc(db, 'financeInboxItems', id), { ...data, updatedAt: serverTimestamp() });
    },
};

export const recurringExpensesService = {
    subscribe(callback: (items: RecurringExpense[]) => void) {
        return onSnapshot(query(collection(db, 'recurringExpenses'), orderBy('nextChargeDate', 'asc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringExpense)));
        });
    },
    async create(data: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'recurringExpenses'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },
    async update(id: string, data: Partial<RecurringExpense>): Promise<void> {
        await updateDoc(doc(db, 'recurringExpenses', id), { ...data, updatedAt: serverTimestamp() });
    },
    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'recurringExpenses', id));
    },
};

export const cashAccountsService = {
    subscribe(callback: (items: CashAccount[]) => void) {
        return onSnapshot(query(collection(db, 'cashAccounts'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as CashAccount)));
        });
    },
    async create(data: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'cashAccounts'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },
    async update(id: string, data: Partial<CashAccount>): Promise<void> {
        await updateDoc(doc(db, 'cashAccounts', id), { ...data, updatedAt: serverTimestamp() });
    },
    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'cashAccounts', id));
    },
};

export const financeEntriesService = {
    subscribe(callback: (items: FinanceEntry[]) => void) {
        return onSnapshot(query(collection(db, 'financeEntries'), orderBy('effectiveDate', 'asc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinanceEntry)));
        });
    },
};

export const financeAlertsService = {
    subscribe(callback: (items: FinanceAlert[]) => void) {
        return onSnapshot(query(collection(db, 'financeAlerts'), orderBy('targetDate', 'asc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinanceAlert)));
        });
    },
    async update(id: string, data: Partial<FinanceAlert>): Promise<void> {
        await updateDoc(doc(db, 'financeAlerts', id), { ...data, updatedAt: serverTimestamp() });
    },
};

export const financeSettingsService = {
    async get(): Promise<FinanceSettings | null> {
        const snap = await getDoc(doc(db, 'systemConfig', 'finance'));
        return snap.exists() ? { id: snap.id, ...snap.data() } as FinanceSettings : null;
    },
    async upsert(data: Partial<FinanceSettings>): Promise<void> {
        await setDoc(doc(db, 'systemConfig', 'finance'), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    },
};

// ── Threads (Communication) ──────────────────────────
export const threadsService = {
    subscribe(callback: (threads: Thread[]) => void) {
        return onSnapshot(query(collection(db, 'threads'), orderBy('lastMessageAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Thread)));
        });
    },
    subscribeByClient(clientId: string, callback: (threads: Thread[]) => void) {
        return onSnapshot(query(collection(db, 'threads'), where('clientId', '==', clientId), orderBy('lastMessageAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Thread)));
        });
    },
    subscribeByClientIds(clientIds: string[], callback: (threads: Thread[]) => void) {
        const uniqueIds = [...new Set(clientIds.filter(Boolean))];
        if (uniqueIds.length === 0) {
            callback([]);
            return () => { };
        }

        const batches = splitIntoBatches(uniqueIds, 10);
        const latestByBatch: Thread[][] = batches.map(() => []);

        const emit = () => {
            callback(
                latestByBatch
                    .flat()
                    .sort((a, b) => getSortableTime(b.lastMessageAt) - getSortableTime(a.lastMessageAt)),
            );
        };

        const unsubs = batches.map((batch, index) =>
            onSnapshot(
                query(collection(db, 'threads'), where('clientId', 'in', batch), orderBy('lastMessageAt', 'desc')),
                (snap) => {
                    latestByBatch[index] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Thread));
                    emit();
                },
            ),
        );

        return () => unsubs.forEach((unsub) => unsub());
    },
    async create(data: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'threads'), {
            ...data, messageCount: 0,
            lastMessageAt: serverTimestamp(),
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        return ref.id;
    },
    async update(id: string, data: Partial<Thread>): Promise<void> {
        await updateDoc(doc(db, 'threads', id), { ...data, updatedAt: serverTimestamp() });
    },
};

// ── Messages (Communication) ─────────────────────────
export const messagesService = {
    subscribeByThread(threadId: string, callback: (msgs: Message[]) => void) {
        return onSnapshot(query(collection(db, 'messages'), where('threadId', '==', threadId), orderBy('createdAt', 'asc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
        });
    },
    async create(data: Omit<Message, 'id' | 'createdAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'messages'), {
            ...data, createdAt: serverTimestamp(),
        });
        // Update thread
        await updateDoc(doc(db, 'threads', data.threadId), {
            lastMessageAt: serverTimestamp(),
            lastMessagePreview: data.content.slice(0, 100),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },
};

// ── Platform Connections ─────────────────────────────
export const platformConnectionsService = {
    async getByClient(clientId: string): Promise<PlatformConnection[]> {
        const snap = await getDocs(query(collection(db, 'platformConnections'), where('clientId', '==', clientId)));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as PlatformConnection));
    },
    async getAll(): Promise<PlatformConnection[]> {
        const snap = await getDocs(collection(db, 'platformConnections'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as PlatformConnection));
    },
    subscribe(callback: (items: PlatformConnection[]) => void) {
        return onSnapshot(collection(db, 'platformConnections'), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlatformConnection)));
        });
    },
    subscribeByClientIds(clientIds: string[], callback: (items: PlatformConnection[]) => void) {
        const uniqueIds = [...new Set(clientIds.filter(Boolean))];
        if (uniqueIds.length === 0) {
            callback([]);
            return () => { };
        }

        const batches = splitIntoBatches(uniqueIds, 10);
        const latestByBatch: PlatformConnection[][] = batches.map(() => []);

        const emit = () => {
            callback(
                latestByBatch
                    .flat()
                    .sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt)),
            );
        };

        const unsubs = batches.map((batch, index) =>
            onSnapshot(
                query(collection(db, 'platformConnections'), where('clientId', 'in', batch)),
                (snap) => {
                    latestByBatch[index] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlatformConnection));
                    emit();
                },
            ),
        );

        return () => unsubs.forEach((unsub) => unsub());
    },
};

// ── Monthly Metrics ──────────────────────────────────
export const monthlyMetricsService = {
    async getByClient(clientId: string): Promise<MonthlyPlatformMetric[]> {
        const snap = await getDocs(query(collection(db, 'monthlyPlatformMetrics'), where('clientId', '==', clientId), orderBy('monthEndDate', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as MonthlyPlatformMetric));
    },
    subscribe(callback: (items: MonthlyPlatformMetric[]) => void) {
        return onSnapshot(query(collection(db, 'monthlyPlatformMetrics'), orderBy('monthEndDate', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as MonthlyPlatformMetric)));
        });
    },
};

// ── Monthly Rollups ──────────────────────────────────
export const monthlyRollupsService = {
    async getByClient(clientId: string): Promise<MonthlyClientRollup[]> {
        const snap = await getDocs(query(collection(db, 'monthlyClientRollups'), where('clientId', '==', clientId), orderBy('monthEndDate', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as MonthlyClientRollup));
    },
    async getCombinedByClient(clientId: string): Promise<MonthlyClientRollup[]> {
        const snap = await getDocs(query(collection(db, 'monthlyClientRollups'), where('clientId', '==', clientId), where('platformType', '==', 'combined'), orderBy('monthEndDate', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as MonthlyClientRollup));
    },
    subscribe(callback: (items: MonthlyClientRollup[]) => void) {
        return onSnapshot(query(collection(db, 'monthlyClientRollups'), orderBy('monthEndDate', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as MonthlyClientRollup)));
        });
    },
};

// ── Daily Platform Metrics ───────────────────────────
export const dailyMetricsService = {
    subscribe(callback: (items: DailyPlatformMetric[]) => void) {
        return onSnapshot(query(collection(db, 'dailyPlatformMetrics'), orderBy('date', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyPlatformMetric)));
        });
    },
};

export const ingestionJobsService = {
    subscribeByClient(clientId: string, callback: (items: IngestionJob[]) => void) {
        return onSnapshot(
            query(collection(db, 'ingestionJobs'), where('clientId', '==', clientId), orderBy('startedAt', 'desc')),
            snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as IngestionJob))),
        );
    },
};

export const leadsService = {
    async getAll(): Promise<Lead[]> {
        const snap = await getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
    },

    async create(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'leads'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<Lead>): Promise<void> {
        await updateDoc(doc(db, 'leads', id), { ...data, updatedAt: serverTimestamp() });
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'leads', id));
    },

    subscribe(callback: (leads: Lead[]) => void) {
        return onSnapshot(query(collection(db, 'leads'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
        });
    },
};

// ── Proposals ────────────────────────────────────────
export const proposalsService = {
    async getAll(): Promise<Proposal[]> {
        const snap = await getDocs(query(collection(db, 'proposals'), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Proposal));
    },

    async create(data: Omit<Proposal, 'id' | 'createdAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'proposals'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<Proposal>): Promise<void> {
        await updateDoc(doc(db, 'proposals', id), data);
    },

    subscribe(callback: (proposals: Proposal[]) => void) {
        return onSnapshot(query(collection(db, 'proposals'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Proposal)));
        });
    },
};

// ── Payment Links ────────────────────────────────────
export const paymentLinksService = {
    async getAll(): Promise<PaymentLink[]> {
        const snap = await getDocs(query(collection(db, 'paymentLinks'), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentLink));
    },

    async create(data: Omit<PaymentLink, 'id' | 'createdAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'paymentLinks'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },
};

// ── Scheduling ───────────────────────────────────────
export const schedulingEventTypesService = {
    subscribe(callback: (items: SchedulingEventType[]) => void) {
        return onSnapshot(query(collection(db, 'schedulingEventTypes'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SchedulingEventType)));
        });
    },
};

export const schedulingBookingsService = {
    subscribe(callback: (items: SchedulingBooking[]) => void) {
        return onSnapshot(query(collection(db, 'schedulingBookings'), orderBy('startAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SchedulingBooking)));
        });
    },
};

export const schedulingHostsService = {
    subscribe(callback: (items: SchedulingHost[]) => void) {
        return onSnapshot(query(collection(db, 'schedulingHosts'), orderBy('displayName', 'asc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SchedulingHost)));
        });
    },
};

export const schedulingHostMapsService = {
    subscribe(callback: (items: SchedulingHostEventTypeMap[]) => void) {
        return onSnapshot(query(collection(db, 'schedulingHostEventTypeMap'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SchedulingHostEventTypeMap)));
        });
    },
};

// ── User Profiles & Roles ────────────────────────────
export type UserRole = 'owner' | 'admin' | 'team' | 'client';

export type Permission =
    | 'clients:read' | 'clients:write'
    | 'invoices:read' | 'invoices:write'
    | 'payments:read' | 'payments:write'
    | 'leads:read' | 'leads:write'
    | 'proposals:read' | 'proposals:write'
    | 'reports:read' | 'reports:write'
    | 'campaigns:read' | 'campaigns:write'
    | 'communications:read' | 'communications:write'
    | 'settings:read' | 'settings:write'
    | 'team:read' | 'team:write'
    | 'billing:read' | 'billing:write'
    | 'scheduling:read' | 'scheduling:write'
    | 'performance:read' | 'performance:write';

/** Default permissions per role */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    owner: [
        'clients:read', 'clients:write', 'invoices:read', 'invoices:write',
        'payments:read', 'payments:write', 'leads:read', 'leads:write',
        'proposals:read', 'proposals:write', 'reports:read', 'reports:write',
        'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
        'settings:read', 'settings:write', 'team:read', 'team:write',
        'billing:read', 'billing:write',
        'scheduling:read', 'scheduling:write',
        'performance:read', 'performance:write',
    ],
    admin: [
        'clients:read', 'clients:write', 'invoices:read', 'invoices:write',
        'payments:read', 'payments:write', 'leads:read', 'leads:write',
        'proposals:read', 'proposals:write', 'reports:read', 'reports:write',
        'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
        'settings:read', 'team:read', 'team:write',
        'scheduling:read', 'scheduling:write',
        'performance:read', 'performance:write',
    ],
    team: [
        'clients:read', 'invoices:read', 'reports:read', 'reports:write',
        'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
        'scheduling:read', 'scheduling:write',
        'performance:read',
    ],
    client: [
        'invoices:read', 'payments:read', 'reports:read',
        'campaigns:read', 'communications:read',
        'performance:read',
    ],
};

export interface UserProfile {
    id?: string;            // Firestore doc ID = Firebase Auth UID
    uid: string;            // Firebase Auth UID
    email: string;
    displayName: string;
    role: UserRole;
    permissions: Permission[];       // Can override role defaults
    assignedClients?: string[];      // For team members: which client IDs they can access
    linkedClientId?: string;         // For client users: the client record they belong to
    linkedClientIds?: string[];      // For client users: all client IDs they can access
    avatarUrl?: string;
    phone?: string;
    title?: string;                  // e.g. "Growth Strategist", "CEO"
    isActive: boolean;
    lastLoginAt?: any;
    createdAt?: any;
    updatedAt?: any;
}

export function getAccessibleClientIds(profile: UserProfile | null): string[] {
    if (!profile) return [];
    if (profile.role === 'owner' || profile.role === 'admin') return [];
    if (profile.role === 'team') return [...new Set(profile.assignedClients?.filter(Boolean) || [])];
    if (profile.role === 'client') {
        const ids = profile.linkedClientIds?.length
            ? profile.linkedClientIds
            : (profile.linkedClientId ? [profile.linkedClientId] : []);
        return [...new Set(ids.filter(Boolean))];
    }
    return [];
}

export const userProfilesService = {
    async getByUid(uid: string): Promise<UserProfile | null> {
        const snap = await getDoc(doc(db, 'userProfiles', uid));
        return snap.exists() ? { id: snap.id, ...snap.data() } as UserProfile : null;
    },

    async getAll(): Promise<UserProfile[]> {
        const snap = await getDocs(query(collection(db, 'userProfiles'), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
    },

    async getByRole(role: UserRole): Promise<UserProfile[]> {
        const snap = await getDocs(query(collection(db, 'userProfiles'), where('role', '==', role)));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
    },

    async create(uid: string, data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        const { ...rest } = data;
        await (await import('firebase/firestore')).setDoc(doc(db, 'userProfiles', uid), {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    },

    async update(uid: string, data: Partial<UserProfile>): Promise<void> {
        await updateDoc(doc(db, 'userProfiles', uid), { ...data, updatedAt: serverTimestamp() });
    },

    async delete(uid: string): Promise<void> {
        await deleteDoc(doc(db, 'userProfiles', uid));
    },

    subscribe(callback: (profiles: UserProfile[]) => void) {
        return onSnapshot(query(collection(db, 'userProfiles'), orderBy('createdAt', 'desc')), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        });
    },

    /** Check if user has a specific permission */
    hasPermission(profile: UserProfile | null, permission: Permission): boolean {
        if (!profile) return false;
        // Owner always has everything
        if (profile.role === 'owner') return true;
        if (profile.permissions.includes(permission)) return true;
        return ROLE_PERMISSIONS[profile.role]?.includes(permission) ?? false;
    },

    /** Check if user can access a specific client */
    canAccessClient(profile: UserProfile | null, clientId: string): boolean {
        if (!profile) return false;
        if (profile.role === 'owner' || profile.role === 'admin') return true;
        return getAccessibleClientIds(profile).includes(clientId);
    },

    getAccessibleClientIds(profile: UserProfile | null): string[] {
        return getAccessibleClientIds(profile);
    },
};

// ── Activity Logs ────────────────────────────────────────

export interface ActivityLog {
    id?: string;
    userId: string;
    userEmail: string;
    userName: string;
    action: 'user_created' | 'user_updated' | 'user_deleted' | 'role_changed' | 'permission_changed' | 'client_linked' | 'settings_updated' | 'invite_sent';
    target: string;
    details: string;
    createdAt?: any;
}

export const activityLogsService = {
    async create(data: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'activityLogs'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    subscribe(callback: (logs: ActivityLog[]) => void, limitCount = 50) {
        return onSnapshot(
            query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(limitCount)),
            snap => {
                callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
            },
        );
    },
};

// ── Pending Invites ──────────────────────────────────────

export interface PendingInvite {
    id?: string;
    email: string;
    role: UserRole;
    linkedClientId?: string;
    linkedClientIds?: string[];
    invitedBy: string;
    invitedByName: string;
    status: 'pending' | 'accepted' | 'expired';
    createdAt?: any;
    expiresAt?: string;
}

export const pendingInvitesService = {
    async create(data: Omit<PendingInvite, 'id' | 'createdAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'pendingInvites'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    subscribe(callback: (invites: PendingInvite[]) => void) {
        return onSnapshot(
            query(collection(db, 'pendingInvites'), orderBy('createdAt', 'desc')),
            snap => {
                callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as PendingInvite)));
            },
        );
    },

    async update(id: string, data: Partial<PendingInvite>): Promise<void> {
        await updateDoc(doc(db, 'pendingInvites', id), data);
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'pendingInvites', id));
    },
};
