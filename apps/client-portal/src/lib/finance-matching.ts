import type { FinanceInboxItem, Invoice, RecurringExpense } from '@/lib/firestore';

export type FinanceRecurringMatch = {
  recurringExpenseId: string;
  recurringExpenseName: string;
  score: number;
};

export type FinanceInvoiceMatch = {
  invoiceId: string;
  invoiceNumber: string;
  score: number;
};

const COMPANY_SUFFIXES = new Set([
  'inc',
  'incorporated',
  'llc',
  'ltd',
  'limited',
  'corp',
  'corporation',
  'co',
  'company',
  'gmbh',
  'pbc',
  'team',
]);

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'from',
  'your',
  'you',
  'has',
  'have',
  'been',
  'was',
  'with',
  'this',
  'that',
  'invoice',
  'receipt',
  'payment',
  'order',
  'tax',
  'bill',
  'statement',
  'charge',
  'subscription',
  'account',
]);

const PLACEHOLDER_REFERENCES = new Set(['transaction', 'download', 'invoice', 'receipt', 'order']);

function normalizeWhitespace(input?: string) {
  return String(input || '').replace(/\s+/g, ' ').trim();
}

export function normalizeFinanceText(input?: string) {
  return normalizeWhitespace(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactFinanceText(input?: string) {
  return normalizeFinanceText(input).replace(/\s+/g, '');
}

function stripCompanySuffixes(input?: string) {
  return normalizeFinanceText(input)
    .split(' ')
    .filter((part) => part && !COMPANY_SUFFIXES.has(part))
    .join(' ')
    .trim();
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => normalizeWhitespace(value || '')).filter(Boolean)));
}

export function extractEmailAddress(sender?: string) {
  const raw = String(sender || '');
  const bracketMatch = raw.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) return bracketMatch[1].trim().toLowerCase();
  const emailMatch = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return emailMatch?.[0]?.toLowerCase() || '';
}

export function extractSenderDomain(sender?: string) {
  const email = extractEmailAddress(sender);
  if (!email.includes('@')) return '';
  return email.split('@')[1];
}

function extractDomainRoot(domain?: string) {
  const parts = String(domain || '')
    .toLowerCase()
    .split('.')
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || '';
}

function tokenize(input?: string) {
  return normalizeFinanceText(input)
    .split(' ')
    .filter((part) => part && !STOP_WORDS.has(part));
}

function hasExactishMatch(left?: string, right?: string) {
  const leftCompact = compactFinanceText(left);
  const rightCompact = compactFinanceText(right);
  if (!leftCompact || !rightCompact) return false;
  return leftCompact === rightCompact || leftCompact.includes(rightCompact) || rightCompact.includes(leftCompact);
}

function amountLooksClose(left?: number, right?: number) {
  if (typeof left !== 'number' || typeof right !== 'number') return false;
  const tolerance = Math.max(1, Math.min(left, right) * 0.05);
  return Math.abs(left - right) <= tolerance;
}

function vendorCandidates(params: {
  extractedVendor?: string;
  sender?: string;
  subject?: string;
  bodyText?: string;
}) {
  const senderDomain = extractSenderDomain(params.sender);
  const domainRoot = extractDomainRoot(senderDomain);
  const subjectMatch = String(params.subject || '').match(/(?:receipt|invoice|payment|order)\s+(?:from|for)\s+(.+?)(?:\s+#|\s+\(|$)/i);

  return uniqueStrings([
    params.extractedVendor,
    stripCompanySuffixes(params.extractedVendor),
    subjectMatch?.[1],
    stripCompanySuffixes(subjectMatch?.[1]),
    domainRoot,
  ]);
}

function recurringTerms(item: RecurringExpense) {
  return uniqueStrings([
    item.name,
    item.vendor,
    stripCompanySuffixes(item.name),
    stripCompanySuffixes(item.vendor),
    ...(item.aliases || []),
  ]);
}

export function findBestRecurringExpenseMatch(params: {
  extractedVendor?: string;
  sender?: string;
  subject?: string;
  bodyText?: string;
  amount?: number;
  currency?: string;
  recurringExpenses: RecurringExpense[];
}): FinanceRecurringMatch | null {
  const haystack = normalizeFinanceText([params.subject, params.bodyText, params.extractedVendor, params.sender].filter(Boolean).join(' '));
  const haystackTokens = new Set(tokenize(haystack));
  const vendorHints = vendorCandidates(params);
  const senderDomain = extractSenderDomain(params.sender);
  const domainRoot = extractDomainRoot(senderDomain);

  const candidates = params.recurringExpenses
    .map((expense) => {
      let score = 0;
      const terms = recurringTerms(expense);

      for (const hint of vendorHints) {
        for (const term of terms) {
          if (!term) continue;
          if (hasExactishMatch(hint, term)) score += 9;
          else if (normalizeFinanceText(term) && haystack.includes(normalizeFinanceText(term))) score += 5;
        }
      }

      for (const term of terms) {
        const termTokens = tokenize(term);
        const overlap = termTokens.filter((token) => haystackTokens.has(token)).length;
        score += overlap;
        if (domainRoot && hasExactishMatch(domainRoot, term)) score += 6;
      }

      if (params.currency && expense.currency && params.currency.toUpperCase() === expense.currency.toUpperCase()) score += 2;
      if (amountLooksClose(params.amount, expense.amount)) score += 3;
      if (expense.status === 'active') score += 1;
      if (expense.status === 'cancelled') score -= 1;

      return {
        recurringExpenseId: expense.id || '',
        recurringExpenseName: expense.name,
        score,
      };
    })
    .filter((candidate) => candidate.recurringExpenseId && candidate.score >= 8)
    .sort((left, right) => right.score - left.score);

  return candidates[0] || null;
}

export function findBestInvoiceMatch(params: {
  sender?: string;
  subject?: string;
  bodyText?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  invoices: Invoice[];
}): FinanceInvoiceMatch | null {
  const haystack = normalizeFinanceText([params.subject, params.bodyText, params.sender, params.invoiceNumber].filter(Boolean).join(' '));

  const candidates = params.invoices
    .filter((invoice) => invoice.status !== 'paid')
    .map((invoice) => {
      let score = 0;
      if (params.invoiceNumber && normalizeFinanceText(invoice.invoiceNumber) === normalizeFinanceText(params.invoiceNumber)) score += 12;
      if (normalizeFinanceText(invoice.invoiceNumber) && haystack.includes(normalizeFinanceText(invoice.invoiceNumber))) score += 8;
      if (normalizeFinanceText(invoice.clientName) && haystack.includes(normalizeFinanceText(invoice.clientName))) score += 4;
      if (params.currency && invoice.currency && params.currency.toUpperCase() === invoice.currency.toUpperCase()) score += 1;
      if (amountLooksClose(params.amount, invoice.totalDue)) score += 2;
      return {
        invoiceId: invoice.id || '',
        invoiceNumber: invoice.invoiceNumber,
        score,
      };
    })
    .filter((candidate) => candidate.invoiceId && candidate.score >= 8)
    .sort((left, right) => right.score - left.score);

  return candidates[0] || null;
}

export function inferFinanceClassification(params: {
  subject?: string;
  bodyText?: string;
  labelNames?: string[];
  aiClassification?: FinanceInboxItem['parsedType'] | 'ignore';
  heuristicClassification?: FinanceInboxItem['parsedType'];
}) {
  const text = normalizeFinanceText([params.labelNames?.join(' '), params.subject, params.bodyText].filter(Boolean).join(' '));
  if (/\b(receipt|order receipt|tax receipt)\b/.test(text)) return 'receipt' as const;
  if (/\b(invoice|tax invoice|billing statement)\b/.test(text)) return 'vendor_invoice' as const;
  if (/\b(payment confirmation|payment confirmed|payment has been processed|funded|successful payment|charge successful)\b/.test(text)) {
    return 'payment_confirmation' as const;
  }
  if (/\b(bank|debit advice|credit advice)\b/.test(text)) return 'bank_notice' as const;
  if (params.aiClassification && params.aiClassification !== 'ignore') return params.aiClassification;
  return params.heuristicClassification || 'unknown';
}

export function inferFinancePostingTarget(params: {
  classification: FinanceInboxItem['parsedType'];
  labelNames?: string[];
  subject?: string;
  bodyText?: string;
  recurringMatch?: FinanceRecurringMatch | null;
  invoiceMatch?: FinanceInvoiceMatch | null;
  aiTarget?: FinanceInboxItem['postingTarget'];
  recurrenceHint?: FinanceInboxItem['recurrenceHint'];
}) {
  if (params.invoiceMatch) return 'payment' as const;
  if (params.recurringMatch) return 'expense' as const;

  const text = normalizeFinanceText([params.labelNames?.join(' '), params.subject, params.bodyText].filter(Boolean).join(' '));
  const isClientPaymentLane = text.includes('client payments');
  const isSubscriptionLike = /\b(monthly|annual|yearly|quarterly|semiannual|renewal|renewed|plan|membership|subscription|workspace|seat)\b/.test(text)
    || params.recurrenceHint === 'monthly'
    || params.recurrenceHint === 'quarterly'
    || params.recurrenceHint === 'semiannual'
    || params.recurrenceHint === 'annual';

  if (params.classification === 'bank_notice') return 'ignore' as const;
  if (params.classification === 'payment_confirmation') {
    if (isClientPaymentLane) return 'payment' as const;
    return isSubscriptionLike || params.aiTarget === 'recurring_expense' ? 'recurring_expense' as const : 'expense' as const;
  }
  if (params.classification === 'vendor_invoice' || params.classification === 'receipt') {
    return isSubscriptionLike || params.aiTarget === 'recurring_expense' ? 'recurring_expense' as const : 'expense' as const;
  }
  return params.aiTarget || 'ignore';
}

export function sanitizeInvoiceReference(input?: string) {
  const value = normalizeFinanceText(input).replace(/\s+/g, '-');
  if (!value || PLACEHOLDER_REFERENCES.has(value)) return '';
  return value;
}

export function buildFinanceFingerprint(params: {
  classification?: string;
  vendor?: string;
  sender?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  invoiceDate?: string;
  subject?: string;
  recurringExpenseId?: string | null;
  invoiceId?: string | null;
}) {
  const vendor = stripCompanySuffixes(params.vendor) || extractDomainRoot(extractSenderDomain(params.sender)) || 'unknown-vendor';
  const invoiceReference = sanitizeInvoiceReference(params.invoiceNumber);
  const amountPart = typeof params.amount === 'number' ? params.amount.toFixed(2) : 'na';
  const currencyPart = normalizeFinanceText(params.currency).toUpperCase() || 'NA';
  const datePart = params.invoiceDate || '';
  const subjectPart = normalizeFinanceText(params.subject).split(' ').slice(0, 6).join('-') || 'na';

  if (params.invoiceId) return `invoice:${params.invoiceId}:${invoiceReference || amountPart}:${currencyPart}`;
  if (params.recurringExpenseId) return `recurring:${params.recurringExpenseId}:${invoiceReference || datePart || subjectPart}:${amountPart}:${currencyPart}`;
  return [
    normalizeFinanceText(params.classification),
    compactFinanceText(vendor),
    invoiceReference || datePart || subjectPart,
    amountPart,
    currencyPart,
  ].join(':');
}
