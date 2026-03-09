export type LegacyServiceCode = 'Ad Mgt' | 'DRM' | 'DRM+SM';

export type BillingCadence =
    | 'one_time'
    | 'monthly'
    | '2_months'
    | '3_months'
    | '6_months'
    | 'quarterly'
    | 'annual';

export interface ExchangeRateSnapshot {
    used: number;
    date: string;
    sourceUrl: string;
    pricingRule?: string;
    baseAmountUsd?: number;
    convertedAmount?: number;
    roundedAmount?: number;
}

export interface BillingPolicyMetadata {
    legacyServiceCode?: LegacyServiceCode;
    billingCadence?: BillingCadence;
    billingStatusLabel?: string;
    marketRegion?: string;
    platformCount?: number;
    legacyRateModel?: string;
    sendLeadDays?: number;
    intervalMonths?: number;
    minimumEngagementMonths?: number;
}

export interface ReminderStateEntry {
    status: 'pending' | 'sent' | 'failed';
    queuedAt?: string;
    sentAt?: string;
}

export interface ReminderState {
    upcoming?: ReminderStateEntry;
    dueToday?: ReminderStateEntry;
    overdue3d?: ReminderStateEntry;
    overdue7d?: ReminderStateEntry;
    overdue14d?: ReminderStateEntry;
    legacyFollowUps?: {
        first: boolean;
        second: boolean;
        third: boolean;
    };
    lastReminderType?: string;
    lastReminderAt?: string;
    statusLabel?: string;
}

const CADENCE_MONTHS: Record<BillingCadence, number> = {
    one_time: 0,
    monthly: 1,
    '2_months': 2,
    '3_months': 3,
    '6_months': 6,
    quarterly: 3,
    annual: 12,
};

const pad = (value: number) => String(value).padStart(2, '0');

const toDate = (isoDate: string) => new Date(`${isoDate}T12:00:00`);

export function addDaysToISODate(isoDate: string, days: number): string {
    const date = toDate(isoDate);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addMonthsToISODate(isoDate: string, months: number): string {
    const date = toDate(isoDate);
    date.setMonth(date.getMonth() + months);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getCadenceIntervalMonths(cadence?: BillingCadence, intervalMonths?: number): number {
    if (typeof intervalMonths === 'number' && Number.isFinite(intervalMonths) && intervalMonths > 0) {
        return intervalMonths;
    }
    if (!cadence) return 1;
    return CADENCE_MONTHS[cadence] || 1;
}

export function computeInvoiceDueDate(issuedAt: string, sendLeadDays = 3): string {
    return addDaysToISODate(issuedAt, Math.max(0, sendLeadDays));
}

export function inferCadenceFromLegacyPayment(value?: string): BillingCadence {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'monthly') return 'monthly';
    if (normalized === '2 months') return '2_months';
    if (normalized === '3 months') return '3_months';
    if (normalized === '6 months') return '6_months';
    return 'one_time';
}

export function generateClientCode(referenceDate: string, existingCodes: string[]): string {
    const prefix = referenceDate;
    const sameDayCodes = existingCodes.filter((code) => code.startsWith(`${prefix}-`));
    let nextSeq = 1;

    for (const code of sameDayCodes) {
        const seq = Number(code.split('-').pop());
        if (Number.isFinite(seq)) nextSeq = Math.max(nextSeq, seq + 1);
    }

    return `${prefix}-${String(nextSeq).padStart(2, '0')}`;
}

export function generateInvoiceNumber(existingNumbers: string[], issuedAt: string): string {
    const yearMonth = issuedAt.slice(0, 7).replace('-', '');
    const prefix = `AWI-${yearMonth}-`;
    let nextSeq = 1;

    for (const invoiceNumber of existingNumbers) {
        if (!invoiceNumber.startsWith(prefix)) continue;
        const seq = Number(invoiceNumber.slice(prefix.length));
        if (Number.isFinite(seq)) nextSeq = Math.max(nextSeq, seq + 1);
    }

    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

export function buildReminderStateEntry(status: ReminderStateEntry['status'], at: string): ReminderStateEntry {
    return status === 'sent' ? { status, sentAt: at } : { status, queuedAt: at };
}

export function withReminderState(
    current: ReminderState | undefined,
    reminderType: 'upcoming' | 'due_today' | 'overdue_3d' | 'overdue_7d' | 'overdue_14d',
    status: ReminderStateEntry['status'],
    at: string,
): ReminderState {
    const next: ReminderState = {
        ...(current || {}),
        legacyFollowUps: {
            first: current?.legacyFollowUps?.first ?? false,
            second: current?.legacyFollowUps?.second ?? false,
            third: current?.legacyFollowUps?.third ?? false,
        },
        lastReminderType: reminderType,
        lastReminderAt: at,
    };

    if (reminderType === 'upcoming') next.upcoming = buildReminderStateEntry(status, at);
    if (reminderType === 'due_today') next.dueToday = buildReminderStateEntry(status, at);
    if (reminderType === 'overdue_3d') {
        next.overdue3d = buildReminderStateEntry(status, at);
        next.legacyFollowUps!.first = true;
    }
    if (reminderType === 'overdue_7d') {
        next.overdue7d = buildReminderStateEntry(status, at);
        next.legacyFollowUps!.second = true;
    }
    if (reminderType === 'overdue_14d') {
        next.overdue14d = buildReminderStateEntry(status, at);
        next.legacyFollowUps!.third = true;
    }

    next.statusLabel = [
        next.legacyFollowUps?.first ? '1st follow-up queued' : '',
        next.legacyFollowUps?.second ? '2nd follow-up queued' : '',
        next.legacyFollowUps?.third ? '3rd follow-up queued' : '',
    ].filter(Boolean).join(' · ') || next.statusLabel || '';

    return next;
}
