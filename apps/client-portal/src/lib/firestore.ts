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
    paidAt?: string;
    createdAt?: any;
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
