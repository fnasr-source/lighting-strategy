import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { computeSeverity, normalizeSocialMessage } from '@/lib/performance-intelligence/social';
import type { SocialConversation, SocialInteraction } from '@/lib/performance-intelligence/types';

type GenericObject = Record<string, unknown>;

type SocialSourceRow = {
  externalId: string;
  channel: 'facebook' | 'instagram' | 'messenger' | 'other';
  interactionType: 'comment' | 'dm' | 'mention';
  conversationId: string;
  authorName: string;
  authorHandle: string;
  message: string;
  occurredAt: string;
  mediaUrl?: string;
  permalink?: string;
};

function parseLimit(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

async function getMetaConnection(clientId: string): Promise<{ accessToken: string } | null> {
  const db = getAdminDb();
  const snap = await db
    .collection('platformConnections')
    .where('clientId', '==', clientId)
    .where('platform', '==', 'meta_ads')
    .where('isConnected', '==', true)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const data = snap.docs[0].data();

  if (data.credentialRef?.provider === 'firestore' && data.credentialRef?.key) {
    const secretsDoc = await db.collection('systemConfig').doc('integrationSecrets').get();
    const payload = secretsDoc.data()?.[data.credentialRef.key];
    if (payload && typeof payload.accessToken === 'string') {
      return { accessToken: payload.accessToken };
    }
  }

  const token = data.credentials?.accessToken;
  if (typeof token !== 'string' || token.length === 0) return null;

  return { accessToken: token };
}

async function fetchPages(accessToken: string): Promise<Array<{ id: string; name: string; token: string }>> {
  const url = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`;
  const response = await fetch(url);
  const payload = (await response.json()) as GenericObject;
  if (!response.ok || payload.error) return [];

  const rows = Array.isArray(payload.data) ? payload.data as GenericObject[] : [];
  return rows
    .map((row) => ({
      id: String(row.id || ''),
      name: String(row.name || ''),
      token: String(row.access_token || ''),
    }))
    .filter((row) => row.id && row.token);
}

async function fetchFacebookComments(params: {
  pageId: string;
  pageToken: string;
  since: string;
  limit: number;
}): Promise<SocialSourceRow[]> {
  const fields = 'id,message,from,created_time,permalink_url,parent{id,message,permalink_url,full_picture}';
  const url =
    `https://graph.facebook.com/v21.0/${params.pageId}/feed?fields=${encodeURIComponent(fields)}` +
    `&since=${params.since}&limit=${params.limit}&access_token=${params.pageToken}`;

  const response = await fetch(url);
  const payload = (await response.json()) as GenericObject;
  if (!response.ok || payload.error) return [];

  const rows = Array.isArray(payload.data) ? payload.data as GenericObject[] : [];
  const normalized: SocialSourceRow[] = [];

  for (const post of rows) {
    const postId = String(post.id || '');
    if (!postId) continue;

    const commentsUrl =
      `https://graph.facebook.com/v21.0/${postId}/comments?fields=id,message,from,created_time,permalink_url` +
      `&limit=${params.limit}&access_token=${params.pageToken}`;

    const commentsResponse = await fetch(commentsUrl);
    const commentsPayload = (await commentsResponse.json()) as GenericObject;
    const comments = Array.isArray(commentsPayload.data) ? commentsPayload.data as GenericObject[] : [];

    for (const comment of comments) {
      const message = String(comment.message || '').trim();
      if (!message) continue;
      const fromObj = comment.from as GenericObject | undefined;
      normalized.push({
        externalId: String(comment.id || ''),
        channel: 'facebook',
        interactionType: 'comment',
        conversationId: postId,
        authorName: String(fromObj?.name || 'User'),
        authorHandle: String(fromObj?.id || ''),
        message,
        occurredAt: String(comment.created_time || new Date().toISOString()),
        permalink: String(comment.permalink_url || ''),
        mediaUrl: String((post.parent as GenericObject | undefined)?.full_picture || ''),
      });
    }
  }

  return normalized;
}

async function fetchInstagramComments(params: {
  pageId: string;
  pageToken: string;
  limit: number;
}): Promise<SocialSourceRow[]> {
  const igRefUrl = `https://graph.facebook.com/v21.0/${params.pageId}?fields=instagram_business_account&access_token=${params.pageToken}`;
  const igRefResponse = await fetch(igRefUrl);
  const igRefPayload = (await igRefResponse.json()) as GenericObject;
  const igId = String((igRefPayload.instagram_business_account as GenericObject | undefined)?.id || '');
  if (!igId) return [];

  const mediaUrl =
    `https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,media_url,thumbnail_url,timestamp,comments{id,text,username,timestamp}` +
    `&limit=${params.limit}&access_token=${params.pageToken}`;

  const mediaResponse = await fetch(mediaUrl);
  const mediaPayload = (await mediaResponse.json()) as GenericObject;
  if (!mediaResponse.ok || mediaPayload.error) return [];

  const mediaRows = Array.isArray(mediaPayload.data) ? mediaPayload.data as GenericObject[] : [];
  const normalized: SocialSourceRow[] = [];

  for (const media of mediaRows) {
    const mediaId = String(media.id || '');
    const mediaAsset = String(media.thumbnail_url || media.media_url || '');
    const comments = Array.isArray((media.comments as GenericObject | undefined)?.data)
      ? ((media.comments as GenericObject).data as GenericObject[])
      : [];

    for (const comment of comments) {
      const text = String(comment.text || '').trim();
      if (!text) continue;
      normalized.push({
        externalId: String(comment.id || ''),
        channel: 'instagram',
        interactionType: 'comment',
        conversationId: mediaId,
        authorName: String(comment.username || 'User'),
        authorHandle: String(comment.username || ''),
        message: text,
        occurredAt: String(comment.timestamp || media.timestamp || new Date().toISOString()),
        mediaUrl: mediaAsset,
        permalink: '',
      });
    }
  }

  return normalized;
}

// Placeholder fetchers for DMs and mentions where platform permissions may vary.
async function fetchMetaDms(_params: {
  pageId: string;
  pageToken: string;
  since: string;
  limit: number;
}): Promise<SocialSourceRow[]> {
  return [];
}

async function fetchMetaMentions(_params: {
  pageId: string;
  pageToken: string;
  since: string;
  limit: number;
}): Promise<SocialSourceRow[]> {
  return [];
}

function toSocialInteraction(clientId: string, row: SocialSourceRow): SocialInteraction {
  const analyzed = normalizeSocialMessage(row.message);
  const interaction: SocialInteraction = {
    clientId,
    platform: 'meta_social',
    platformType: 'social',
    channel: row.channel,
    interactionType: row.interactionType,
    conversationId: row.conversationId,
    externalId: row.externalId,
    authorHandle: row.authorHandle,
    authorName: row.authorName,
    message: row.message,
    language: analyzed.language,
    sentimentScore: analyzed.sentimentScore,
    sentimentLabel: analyzed.sentimentLabel,
    topics: analyzed.topics,
    severity: 'low',
    isResolved: false,
    occurredAt: row.occurredAt,
    mediaUrl: row.mediaUrl,
    permalink: row.permalink,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  interaction.severity = computeSeverity(interaction);
  return interaction;
}

function buildConversations(clientId: string, interactions: SocialInteraction[]): SocialConversation[] {
  const map = new Map<string, SocialInteraction[]>();

  for (const interaction of interactions) {
    const key = interaction.conversationId || interaction.externalId;
    const list = map.get(key) ?? [];
    list.push(interaction);
    map.set(key, list);
  }

  const conversations: SocialConversation[] = [];

  for (const [conversationId, list] of map) {
    const sorted = [...list].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const latest = sorted[sorted.length - 1];
    const avgSentiment = sorted.reduce((acc, item) => acc + item.sentimentScore, 0) / sorted.length;

    const topicCount = new Map<string, number>();
    for (const item of sorted) {
      for (const topic of item.topics || ['general']) {
        topicCount.set(topic, (topicCount.get(topic) ?? 0) + 1);
      }
    }

    const dominantTopics = [...topicCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    conversations.push({
      clientId,
      platform: 'meta_social',
      channel: latest.channel,
      conversationId,
      participantKey: latest.authorHandle || latest.authorName || 'anonymous',
      latestMessage: latest.message,
      latestMessageAt: latest.occurredAt,
      interactionCount: sorted.length,
      unresolvedCount: sorted.filter((item) => !item.isResolved).length,
      sentimentScore: avgSentiment,
      sentimentLabel: avgSentiment > 0.15 ? 'positive' : avgSentiment < -0.15 ? 'negative' : 'neutral',
      dominantTopics,
      status: sorted.some((item) => item.severity === 'high') ? 'escalated' : 'open',
      updatedAt: new Date().toISOString(),
    });
  }

  return conversations;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const days = parseLimit(searchParams.get('days'), 30);
    const limit = parseLimit(searchParams.get('limit'), 40);

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const connection = await getMetaConnection(clientId);
    if (!connection) {
      return NextResponse.json({ success: false, error: 'No active Meta connection available for social listening.' }, { status: 404 });
    }

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const since = sinceDate.toISOString().slice(0, 10);

    const pages = await fetchPages(connection.accessToken);
    const sourceRows: SocialSourceRow[] = [];

    for (const page of pages.slice(0, 3)) {
      const [fbComments, igComments, dms, mentions] = await Promise.all([
        fetchFacebookComments({ pageId: page.id, pageToken: page.token, since, limit }),
        fetchInstagramComments({ pageId: page.id, pageToken: page.token, limit }),
        fetchMetaDms({ pageId: page.id, pageToken: page.token, since, limit }),
        fetchMetaMentions({ pageId: page.id, pageToken: page.token, since, limit }),
      ]);

      sourceRows.push(...fbComments, ...igComments, ...dms, ...mentions);
    }

    const interactions = sourceRows.map((row) => toSocialInteraction(clientId, row));
    const conversations = buildConversations(clientId, interactions);

    const db = getAdminDb();
    const batch = db.batch();

    for (const interaction of interactions) {
      const docId = `${clientId}_${interaction.externalId}`;
      batch.set(db.collection('fact_social_interaction').doc(docId), interaction, { merge: true });
    }

    for (const conversation of conversations) {
      const docId = `${clientId}_${conversation.conversationId}`;
      batch.set(db.collection('fact_social_conversation').doc(docId), conversation, { merge: true });
    }

    const jobRef = db.collection('ingestionJobs').doc();
    batch.set(jobRef, {
      clientId,
      platform: 'meta_social',
      scope: 'social_listening',
      mode: 'hourly',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status: interactions.length > 0 ? 'success' : 'partial',
      rowsRead: sourceRows.length,
      rowsWritten: interactions.length + conversations.length,
      errorCount: 0,
      request: { from: since, to: new Date().toISOString().slice(0, 10), granularity: 'daily' },
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      clientId,
      days,
      interactionsWritten: interactions.length,
      conversationsWritten: conversations.length,
      channels: [...new Set(interactions.map((item) => item.channel))],
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown social listening sync error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
