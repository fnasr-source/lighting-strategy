import { getSecret } from '@/lib/secrets';
import { analyzeFinanceEmail, type FinanceAiAttachmentInput } from '@/lib/finance-ai';
import type { FinanceInboxAttachment, FinanceInboxItem, FinanceSettings, Invoice, RecurringExpense } from '@/lib/firestore';
import { DEFAULT_FINANCE_LABELS } from '@/lib/finance';

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_ATTACHMENT_TEXT = 3500;
const MAX_INLINE_ATTACHMENT_BYTES = 5_000_000;

type GmailMessageListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
};

type GmailHeader = { name: string; value: string };
type GmailPayload = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  headers?: GmailHeader[];
  parts?: GmailPayload[];
};

type GmailMessageResponse = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPayload;
};

type GmailAttachmentResponse = {
  data?: string;
  size?: number;
};

export type FetchedFinanceMessage = {
  message: GmailMessageResponse;
  matchedLabels: string[];
};

function decodeBase64Url(input?: string) {
  if (!input) return '';
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function flattenParts(payload?: GmailPayload): GmailPayload[] {
  if (!payload) return [];
  const parts = [payload];
  for (const part of payload.parts || []) parts.push(...flattenParts(part));
  return parts;
}

function extractHeader(payload: GmailPayload | undefined, headerName: string) {
  const header = payload?.headers?.find((item) => item.name.toLowerCase() === headerName.toLowerCase());
  return header?.value || '';
}

function extractBestBody(payload?: GmailPayload) {
  const parts = flattenParts(payload);
  const htmlPart = parts.find((part) => part.mimeType === 'text/html' && part.body?.data);
  const plainPart = parts.find((part) => part.mimeType === 'text/plain' && part.body?.data);
  const raw = decodeBase64Url(htmlPart?.body?.data || plainPart?.body?.data || payload?.body?.data);
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractAttachments(payload?: GmailPayload): FinanceInboxAttachment[] {
  return flattenParts(payload)
    .filter((part) => !!part.filename)
    .map((part) => ({
      filename: part.filename || 'attachment',
      mimeType: part.mimeType,
      attachmentId: part.body?.attachmentId,
      size: part.body?.size,
    }));
}

function extractCurrency(text: string) {
  const upper = text.toUpperCase();
  if (upper.includes('AED')) return 'AED';
  if (upper.includes('EGP') || upper.includes(' جنيه') || upper.includes('£')) return 'EGP';
  if (upper.includes('SAR')) return 'SAR';
  if (upper.includes('USD') || upper.includes('$')) return 'USD';
  return undefined;
}

function extractAmount(text: string) {
  const match = text.match(/(?:AED|EGP|SAR|USD|\$|£)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i)
    || text.match(/([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s?(?:AED|EGP|SAR|USD)/i);
  if (!match) return undefined;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

function extractDate(text: string) {
  const match = text.match(/(20\d{2}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]20\d{2})/);
  if (!match) return undefined;
  const raw = match[1];
  if (/^20\d{2}-\d{2}-\d{2}$/.test(raw)) return raw;
  const [month, day, year] = raw.split(/[\/\-]/);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractInvoiceNumber(text: string) {
  const patterns = [
    /invoice\s*(?:number|no\.?|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-/]{3,})/i,
    /receipt\s*(?:number|no\.?|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-/]{3,})/i,
    /\b(IN[-_][A-Z0-9\-]+)\b/i,
    /#([0-9]{4,}(?:-[0-9]{2,})+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function inferParsedType(labelNames: string[], text: string): FinanceInboxItem['parsedType'] {
  const normalized = `${labelNames.join(' ')} ${text}`.toLowerCase();
  if (normalized.includes('client payments') || normalized.includes('payment confirmed') || normalized.includes('payment confirmation')) return 'payment_confirmation';
  if (normalized.includes('receipt')) return 'receipt';
  if (normalized.includes('invoice') || normalized.includes('tax invoice')) return 'vendor_invoice';
  if (normalized.includes('bank')) return 'bank_notice';
  return 'unknown';
}

function inferRecurrence(text: string): FinanceInboxItem['recurrenceHint'] {
  const normalized = text.toLowerCase();
  if (normalized.includes('monthly')) return 'monthly';
  if (normalized.includes('quarter')) return 'quarterly';
  if (normalized.includes('semiannual') || normalized.includes('every 6 months')) return 'semiannual';
  if (normalized.includes('annual') || normalized.includes('yearly')) return 'annual';
  return 'unknown';
}

function buildConfidence(parsedType: FinanceInboxItem['parsedType'], amount?: number, currency?: string, attachments?: FinanceInboxAttachment[]) {
  let confidence = parsedType === 'unknown' ? 0.25 : 0.55;
  if (amount) confidence += 0.2;
  if (currency) confidence += 0.1;
  if ((attachments || []).length > 0) confidence += 0.1;
  return Math.min(confidence, 0.95);
}

function mapAiClassification(classification?: string): FinanceInboxItem['parsedType'] {
  if (classification === 'vendor_invoice' || classification === 'receipt' || classification === 'payment_confirmation' || classification === 'bank_notice') {
    return classification;
  }
  return 'unknown';
}

function isTextMime(mimeType?: string, filename?: string) {
  const normalized = (mimeType || '').toLowerCase();
  const name = (filename || '').toLowerCase();
  return normalized.startsWith('text/')
    || normalized.includes('json')
    || normalized.includes('xml')
    || normalized.includes('csv')
    || name.endsWith('.txt')
    || name.endsWith('.csv')
    || name.endsWith('.xml')
    || name.endsWith('.json')
    || name.endsWith('.html');
}

function isInlineAiMime(mimeType?: string) {
  const normalized = (mimeType || '').toLowerCase();
  return normalized === 'application/pdf' || normalized.startsWith('image/');
}

async function getAccessToken() {
  const clientId = await getSecret('GMAIL_CLIENT_ID');
  const clientSecret = await getSecret('GMAIL_CLIENT_SECRET');
  const refreshToken = await getSecret('GMAIL_REFRESH_TOKEN');
  if (!clientId || !clientSecret || !refreshToken) return '';

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Gmail token (${response.status})`);
  }
  const data = await response.json() as { access_token?: string };
  return data.access_token || '';
}

async function gmailFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Gmail API failed for ${path} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function getLabelMaps(accessToken: string) {
  const data = await gmailFetch<{ labels?: Array<{ id: string; name: string }> }>('/labels', accessToken);
  const byName = new Map<string, string>();
  const byId = new Map<string, string>();
  (data.labels || []).forEach((label) => {
    byName.set(label.name, label.id);
    byId.set(label.id, label.name);
  });
  return { byName, byId };
}

async function fetchAttachmentData(accessToken: string, messageId: string, attachmentId: string) {
  return gmailFetch<GmailAttachmentResponse>(`/messages/${messageId}/attachments/${attachmentId}`, accessToken);
}

async function buildAttachmentContexts(message: GmailMessageResponse, attachments: FinanceInboxAttachment[], accessToken: string) {
  const aiAttachments: FinanceAiAttachmentInput[] = [];
  const storedAttachments: FinanceInboxAttachment[] = [];

  for (const attachment of attachments) {
    try {
      let rawData = '';
      if (attachment.attachmentId) {
        const response = await fetchAttachmentData(accessToken, message.id, attachment.attachmentId);
        rawData = response.data || '';
      }

      let excerpt = '';
      if (isTextMime(attachment.mimeType, attachment.filename) && rawData) {
        excerpt = decodeBase64Url(rawData).slice(0, MAX_ATTACHMENT_TEXT).replace(/\s+/g, ' ').trim();
      }

      const aiAttachment: FinanceAiAttachmentInput = {
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
      };

      if (excerpt) aiAttachment.textPreview = excerpt;
      if (!excerpt && rawData && isInlineAiMime(attachment.mimeType) && (attachment.size || 0) <= MAX_INLINE_ATTACHMENT_BYTES) {
        aiAttachment.inlineDataBase64 = rawData;
      }

      aiAttachments.push(aiAttachment);
      storedAttachments.push({ ...attachment, excerpt: excerpt || undefined });
    } catch {
      storedAttachments.push(attachment);
    }
  }

  return { aiAttachments, storedAttachments };
}

export async function fetchLabeledFinanceMessages(settings: FinanceSettings | null, maxPerLabel = 20): Promise<FetchedFinanceMessage[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  const labels = settings?.watchedLabels?.length ? settings.watchedLabels : DEFAULT_FINANCE_LABELS;
  const { byName, byId } = await getLabelMaps(accessToken);
  const seen = new Set<string>();
  const messages: FetchedFinanceMessage[] = [];

  for (const labelName of labels) {
    const labelId = byName.get(labelName);
    if (!labelId) continue;
    const data = await gmailFetch<GmailMessageListResponse>(`/messages?labelIds=${encodeURIComponent(labelId)}&maxResults=${maxPerLabel}`, accessToken);
    for (const item of data.messages || []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const message = await gmailFetch<GmailMessageResponse>(`/messages/${item.id}?format=full`, accessToken);
      const matchedLabels = (message.labelIds || []).map((id) => byId.get(id)).filter(Boolean) as string[];
      messages.push({ message, matchedLabels: matchedLabels.filter((name) => labels.includes(name)) });
    }
  }

  return messages;
}

export function parseFinanceMessage(message: GmailMessageResponse, labelNames: string[]): Omit<FinanceInboxItem, 'id' | 'createdAt' | 'updatedAt'> {
  const bodyText = extractBestBody(message.payload);
  const subject = extractHeader(message.payload, 'Subject');
  const sender = extractHeader(message.payload, 'From');
  const fullText = `${subject} ${bodyText}`;
  const attachments = extractAttachments(message.payload);
  const parsedType = inferParsedType(labelNames, fullText);
  const extractedCurrency = extractCurrency(fullText);
  const extractedAmount = extractAmount(fullText);
  const extractedInvoiceDate = extractDate(fullText);
  const extractedDueDate = /due/i.test(fullText) ? extractDate(fullText.replace(/^.*?due/i, '')) : undefined;
  const extractedVendor = sender.split('<')[0]?.replace(/"/g, '').trim() || undefined;

  return {
    source: 'gmail',
    gmailMessageId: message.id,
    gmailThreadId: message.threadId,
    labelNames,
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString(),
    sender,
    subject,
    attachments,
    parsedType,
    extractedVendor,
    extractedAmount,
    extractedCurrency,
    extractedInvoiceNumber: extractInvoiceNumber(fullText),
    extractedInvoiceDate,
    extractedDueDate,
    extractedDescription: bodyText.slice(0, 500) || subject,
    recurrenceHint: inferRecurrence(fullText),
    confidence: buildConfidence(parsedType, extractedAmount, extractedCurrency, attachments),
    reviewStatus: 'pending',
    postingTarget: parsedType === 'payment_confirmation' ? 'payment' : parsedType === 'vendor_invoice' || parsedType === 'receipt' ? 'expense' : 'ignore',
    rawSnippet: message.snippet || bodyText.slice(0, 180),
    parserVersion: 'finance-gmail-v1',
  };
}

export async function buildFinanceInboxItem(
  fetched: FetchedFinanceMessage,
  params: {
    recurringExpenses: RecurringExpense[];
    invoices: Invoice[];
  },
): Promise<Omit<FinanceInboxItem, 'id' | 'createdAt' | 'updatedAt'> | null> {
  const heuristic = parseFinanceMessage(fetched.message, fetched.matchedLabels);
  const accessToken = await getAccessToken();
  const { aiAttachments, storedAttachments } = await buildAttachmentContexts(fetched.message, heuristic.attachments || [], accessToken);

  let ai = null;
  try {
    ai = await analyzeFinanceEmail({
      subject: heuristic.subject,
      sender: heuristic.sender,
      bodyText: heuristic.extractedDescription,
      labelNames: fetched.matchedLabels,
      heuristic,
      attachments: aiAttachments,
      recurringExpenses: params.recurringExpenses,
      invoices: params.invoices,
    });
  } catch (error) {
    console.error('Finance AI analysis failed:', error);
  }

  if (ai?.classification === 'ignore' && ai.shouldCreateInboxItem === false) {
    return null;
  }

  return {
    ...heuristic,
    labelNames: fetched.matchedLabels,
    attachments: storedAttachments,
    parsedType: ai ? mapAiClassification(ai.classification) : heuristic.parsedType,
    extractedVendor: ai?.vendor || heuristic.extractedVendor,
    extractedAmount: typeof ai?.amount === 'number' ? ai.amount : heuristic.extractedAmount,
    extractedCurrency: ai?.currency || heuristic.extractedCurrency,
    extractedInvoiceNumber: ai?.invoiceNumber || heuristic.extractedInvoiceNumber,
    extractedInvoiceDate: ai?.invoiceDate || heuristic.extractedInvoiceDate,
    extractedDueDate: ai?.dueDate || heuristic.extractedDueDate,
    recurrenceHint: ai?.cadenceHint || heuristic.recurrenceHint,
    confidence: typeof ai?.confidence === 'number' ? ai.confidence : heuristic.confidence,
    postingTarget: ai?.suggestedPostingTarget || heuristic.postingTarget,
    suggestedPostingTarget: ai?.suggestedPostingTarget || heuristic.postingTarget,
    suggestedRecurringExpenseId: ai?.matchedRecurringExpenseId || undefined,
    suggestedRecurringExpenseName: ai?.matchedRecurringExpenseName || undefined,
    suggestedInvoiceId: ai?.matchedInvoiceId || undefined,
    suggestedInvoiceNumber: ai?.matchedInvoiceNumber || undefined,
    aiSummary: ai?.summary || undefined,
    aiReasoning: ai?.reasoning || undefined,
    analysisVersion: ai ? 'finance-ai-v1' : 'heuristic-only',
    parserVersion: ai ? 'finance-gmail-v2' : heuristic.parserVersion,
  };
}
