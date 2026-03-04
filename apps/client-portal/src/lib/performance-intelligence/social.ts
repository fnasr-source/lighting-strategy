import type { SocialInteraction } from '@/lib/performance-intelligence/types';

const POSITIVE_WORDS = [
  'great', 'love', 'amazing', 'perfect', 'awesome', 'thanks', 'helpful', 'excellent', 'fast', 'good',
];

const NEGATIVE_WORDS = [
  'bad', 'late', 'angry', 'terrible', 'hate', 'slow', 'issue', 'problem', 'refund', 'complaint',
];

const TOPIC_MAP: Array<{ topic: string; keywords: string[] }> = [
  { topic: 'pricing', keywords: ['price', 'cost', 'expensive', 'cheap', 'discount'] },
  { topic: 'delivery', keywords: ['delivery', 'shipping', 'arrive', 'late', 'courier'] },
  { topic: 'support', keywords: ['support', 'help', 'response', 'agent', 'service'] },
  { topic: 'quality', keywords: ['quality', 'broken', 'defect', 'excellent', 'durable'] },
  { topic: 'product_fit', keywords: ['size', 'fit', 'color', 'material', 'feature'] },
];

function detectLanguage(text: string): string {
  if (!text.trim()) return 'unknown';
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  return hasArabic ? 'ar' : 'en';
}

export function analyzeSentiment(text: string): {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
} {
  const normalized = text.toLowerCase();

  const positiveHits = POSITIVE_WORDS.reduce(
    (acc, word) => (normalized.includes(word) ? acc + 1 : acc),
    0,
  );
  const negativeHits = NEGATIVE_WORDS.reduce(
    (acc, word) => (normalized.includes(word) ? acc + 1 : acc),
    0,
  );

  const score = positiveHits - negativeHits;

  if (score > 0) return { score: Math.min(1, score / 3), label: 'positive' };
  if (score < 0) return { score: Math.max(-1, score / 3), label: 'negative' };
  return { score: 0, label: 'neutral' };
}

export function extractTopics(text: string): string[] {
  const normalized = text.toLowerCase();
  const topics = TOPIC_MAP
    .filter((entry) => entry.keywords.some((kw) => normalized.includes(kw)))
    .map((entry) => entry.topic);
  return topics.length > 0 ? topics : ['general'];
}

export function computeSeverity(interaction: Pick<SocialInteraction, 'sentimentLabel' | 'interactionType' | 'message'>):
  | 'low'
  | 'medium'
  | 'high' {
  const text = interaction.message.toLowerCase();
  const urgency = ['urgent', 'asap', 'lawyer', 'scam', 'fraud', 'refund now'].some((k) => text.includes(k));
  if (urgency) return 'high';
  if (interaction.sentimentLabel === 'negative' && interaction.interactionType === 'dm') return 'high';
  if (interaction.sentimentLabel === 'negative') return 'medium';
  return 'low';
}

export function normalizeSocialMessage(message: string): {
  language: string;
  sentimentScore: number;
  sentimentLabel: 'positive' | 'neutral' | 'negative';
  topics: string[];
} {
  const language = detectLanguage(message);
  const sentiment = analyzeSentiment(message);
  const topics = extractTopics(message);
  return {
    language,
    sentimentScore: sentiment.score,
    sentimentLabel: sentiment.label,
    topics,
  };
}
