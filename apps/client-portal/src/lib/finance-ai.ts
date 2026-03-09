import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import type { FinanceInboxItem, Invoice, RecurringExpense } from '@/lib/firestore';
import { getSecret } from '@/lib/secrets';

const PROJECT_ID = 'admireworks---internal-os';
const LOCATION = 'us-central1';
const MODEL = 'gemini-2.0-flash';
const MAX_INLINE_ATTACHMENT_BYTES = 5_000_000;
const MAX_TEXT_ATTACHMENT_CHARS = 3_500;

export type FinanceAiAttachmentInput = {
  filename: string;
  mimeType?: string;
  size?: number;
  textPreview?: string;
  inlineDataBase64?: string;
};

export type FinanceAiAnalysis = {
  classification: 'vendor_invoice' | 'receipt' | 'payment_confirmation' | 'bank_notice' | 'ignore' | 'unknown';
  shouldCreateInboxItem: boolean;
  confidence?: number;
  vendor?: string | null;
  invoiceNumber?: string | null;
  amount?: number | null;
  currency?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  cadenceHint?: FinanceInboxItem['recurrenceHint'];
  suggestedPostingTarget?: FinanceInboxItem['postingTarget'];
  matchedRecurringExpenseId?: string | null;
  matchedRecurringExpenseName?: string | null;
  matchedInvoiceId?: string | null;
  matchedInvoiceNumber?: string | null;
  summary?: string | null;
  reasoning?: string | null;
};

let authClient: Awaited<ReturnType<GoogleAuth['getClient']>> | null = null;

async function getAccessToken(): Promise<string> {
  if (!authClient) {
    const saPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../../firebase/service-account.json');
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || await getSecret('GOOGLE_SERVICE_ACCOUNT_JSON');
    const auth = new GoogleAuth(serviceAccountJson ? {
      credentials: JSON.parse(serviceAccountJson),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    } : fs.existsSync(saPath) ? {
      credentials: JSON.parse(fs.readFileSync(saPath, 'utf8')),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    } : {
      projectId: PROJECT_ID,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    authClient = await auth.getClient();
  }

  const token = await authClient.getAccessToken();
  return typeof token === 'string' ? token : token?.token || '';
}

function normalizeName(input?: string) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreRecurringCandidate(candidate: RecurringExpense, text: string) {
  const haystack = normalizeName(text);
  const vendor = normalizeName(candidate.vendor || candidate.name);
  const aliases = (candidate.aliases || []).map(normalizeName).filter(Boolean);
  const terms = [vendor, normalizeName(candidate.name), ...aliases].filter(Boolean);
  let score = 0;

  terms.forEach((term) => {
    if (!term) return;
    if (haystack.includes(term)) score += 4;
    const overlap = term.split(' ').filter((part) => haystack.includes(part)).length;
    score += overlap;
  });

  return score;
}

function shortlistRecurringExpenses(expenses: RecurringExpense[], text: string) {
  return expenses
    .map((expense) => ({ expense, score: scoreRecurringCandidate(expense, text) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((item) => item.expense);
}

function shortlistInvoices(invoices: Invoice[], text: string) {
  const haystack = normalizeName(text);
  return invoices
    .filter((invoice) => invoice.status !== 'paid')
    .filter((invoice) => {
      const invoiceNumber = normalizeName(invoice.invoiceNumber);
      const clientName = normalizeName(invoice.clientName);
      return !!invoiceNumber && haystack.includes(invoiceNumber) || !!clientName && haystack.includes(clientName);
    })
    .slice(0, 12);
}

function safeJsonParse(input: string): FinanceAiAnalysis | null {
  try {
    return JSON.parse(input) as FinanceAiAnalysis;
  } catch {
    const cleaned = input.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned) as FinanceAiAnalysis;
    } catch {
      return null;
    }
  }
}

export async function analyzeFinanceEmail(params: {
  subject?: string;
  sender?: string;
  bodyText?: string;
  labelNames: string[];
  heuristic: Partial<FinanceInboxItem>;
  attachments: FinanceAiAttachmentInput[];
  recurringExpenses: RecurringExpense[];
  invoices: Invoice[];
}): Promise<FinanceAiAnalysis | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const compositeText = [params.sender, params.subject, params.bodyText, params.heuristic.rawSnippet].filter(Boolean).join('\n');
  const recurringCandidates = shortlistRecurringExpenses(params.recurringExpenses.filter((item) => item.status !== 'cancelled'), compositeText);
  const invoiceCandidates = shortlistInvoices(params.invoices, compositeText);

  const attachmentParts = params.attachments
    .filter((attachment) => attachment.inlineDataBase64 && attachment.mimeType && (attachment.size || 0) <= MAX_INLINE_ATTACHMENT_BYTES)
    .slice(0, 2)
    .map((attachment) => ({
      inlineData: {
        mimeType: attachment.mimeType!,
        data: attachment.inlineDataBase64!,
      },
    }));

  const attachmentTextPreviews = params.attachments
    .filter((attachment) => attachment.textPreview)
    .map((attachment) => ({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      excerpt: attachment.textPreview?.slice(0, MAX_TEXT_ATTACHMENT_CHARS),
    }));

  const prompt = `You are classifying finance emails for Admireworks.

Decide if this email is a real finance item worth adding to the finance inbox. Ignore newsletters, helper/tutorial emails, marketing messages, and product announcements.

If it is finance-related, classify it as one of:
- vendor_invoice
- receipt
- payment_confirmation
- bank_notice
- unknown
- ignore

Also determine whether it should be linked to an existing recurring expense or an existing client invoice.

Current watched labels:
${JSON.stringify(params.labelNames)}

Heuristic parse:
${JSON.stringify({
    parsedType: params.heuristic.parsedType,
    extractedVendor: params.heuristic.extractedVendor,
    extractedAmount: params.heuristic.extractedAmount,
    extractedCurrency: params.heuristic.extractedCurrency,
    extractedInvoiceDate: params.heuristic.extractedInvoiceDate,
    extractedDueDate: params.heuristic.extractedDueDate,
    recurrenceHint: params.heuristic.recurrenceHint,
    postingTarget: params.heuristic.postingTarget,
    confidence: params.heuristic.confidence,
  }, null, 2)}

Email metadata:
${JSON.stringify({
    sender: params.sender,
    subject: params.subject,
    bodyText: (params.bodyText || '').slice(0, 6000),
    attachments: params.attachments.map((attachment) => ({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
    })),
    attachmentTextPreviews,
  }, null, 2)}

Existing recurring expenses candidates:
${JSON.stringify(recurringCandidates.map((item) => ({
    id: item.id,
    name: item.name,
    vendor: item.vendor,
    amount: item.amount,
    currency: item.currency,
    cadence: item.cadence,
    nextChargeDate: item.nextChargeDate,
    paymentAccount: item.paymentAccount,
  })), null, 2)}

Open invoice candidates:
${JSON.stringify(invoiceCandidates.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName,
    totalDue: invoice.totalDue,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    status: invoice.status,
  })), null, 2)}

Return ONLY valid JSON:
{
  "classification": "vendor_invoice|receipt|payment_confirmation|bank_notice|ignore|unknown",
  "shouldCreateInboxItem": true,
  "confidence": 0.0,
  "vendor": null,
  "invoiceNumber": null,
  "amount": null,
  "currency": null,
  "invoiceDate": null,
  "dueDate": null,
  "cadenceHint": "monthly|quarterly|semiannual|annual|unknown",
  "suggestedPostingTarget": "expense|recurring_expense|payment|ignore",
  "matchedRecurringExpenseId": null,
  "matchedRecurringExpenseName": null,
  "matchedInvoiceId": null,
  "matchedInvoiceNumber": null,
  "summary": null,
  "reasoning": null
}`;

  const resp = await fetch(`https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }, ...attachmentParts] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1600,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!resp.ok) {
    throw new Error(`Finance AI classification failed (${resp.status}): ${await resp.text()}`);
  }

  const json = await resp.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return safeJsonParse(text);
}
