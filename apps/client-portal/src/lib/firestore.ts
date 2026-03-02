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
import { db } from '@/lib/firebase';

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
    ga4PropertyId?: string;
    notes?: string;
    createdAt?: any;
    updatedAt?: any;
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
    notes?: string;
    createdAt?: any;
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
    frequency: 'monthly' | 'quarterly' | 'annual';
    billingDay: number;         // Day of month (1-28)
    nextDueDate: string;        // YYYY-MM-DD
    active: boolean;
    autoSendEmail: boolean;     // Whether to auto-email on generation
    paymentMethods: ('stripe' | 'instapay' | 'bank_transfer')[]; // Allowed payment methods
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
    credentials: Record<string, string>;
    lastSync?: string;
    createdAt?: any;
}

export interface MonthlyPlatformMetric {
    id?: string;
    clientId: string;
    platform: string;          // "Meta Ads", "Shopify", etc.
    platformType: 'ad' | 'ecommerce' | 'analytics';
    monthEndDate: string;       // YYYY-MM-DD
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
        });
        return ref.id;
    },

    async update(id: string, data: Partial<Invoice>): Promise<void> {
        await updateDoc(doc(db, 'invoices', id), data);
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

// ── Leads ────────────────────────────────────────────
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
    | 'billing:read' | 'billing:write';

/** Default permissions per role */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    owner: [
        'clients:read', 'clients:write', 'invoices:read', 'invoices:write',
        'payments:read', 'payments:write', 'leads:read', 'leads:write',
        'proposals:read', 'proposals:write', 'reports:read', 'reports:write',
        'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
        'settings:read', 'settings:write', 'team:read', 'team:write',
        'billing:read', 'billing:write',
    ],
    admin: [
        'clients:read', 'clients:write', 'invoices:read', 'invoices:write',
        'payments:read', 'payments:write', 'leads:read', 'leads:write',
        'proposals:read', 'proposals:write', 'reports:read', 'reports:write',
        'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
        'settings:read', 'team:read', 'team:write',
    ],
    team: [
        'clients:read', 'invoices:read', 'reports:read', 'reports:write',
        'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
    ],
    client: [
        'invoices:read', 'payments:read', 'reports:read',
        'campaigns:read', 'communications:read',
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
    avatarUrl?: string;
    phone?: string;
    title?: string;                  // e.g. "Growth Strategist", "CEO"
    isActive: boolean;
    lastLoginAt?: any;
    createdAt?: any;
    updatedAt?: any;
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
        return profile.permissions.includes(permission);
    },

    /** Check if user can access a specific client */
    canAccessClient(profile: UserProfile | null, clientId: string): boolean {
        if (!profile) return false;
        if (profile.role === 'owner' || profile.role === 'admin') return true;
        if (profile.role === 'team') return profile.assignedClients?.includes(clientId) ?? false;
        if (profile.role === 'client') return profile.linkedClientId === clientId;
        return false;
    },
};

