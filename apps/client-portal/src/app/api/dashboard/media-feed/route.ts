import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

type MediaFeedItem = {
  id: string;
  type: 'creative' | 'social';
  platform: string;
  title: string;
  text: string;
  mediaUrl: string;
  occurredAt: string;
  engagementScore: number;
  metadata?: Record<string, string | number>;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 20), 100));

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const db = getAdminDb();

    const loadSocial = async () => {
      try {
        return await db
          .collection('fact_social_interaction')
          .where('clientId', '==', clientId)
          .orderBy('occurredAt', 'desc')
          .limit(limit)
          .get();
      } catch {
        return db
          .collection('fact_social_interaction')
          .where('clientId', '==', clientId)
          .limit(limit)
          .get();
      }
    };

    const loadCreative = async () => {
      try {
        return await db
          .collection('creativePerformance')
          .where('clientId', '==', clientId)
          .orderBy('updatedAt', 'desc')
          .limit(limit)
          .get();
      } catch {
        return db
          .collection('creativePerformance')
          .where('clientId', '==', clientId)
          .limit(limit)
          .get();
      }
    };

    const [socialSnap, creativeSnap] = await Promise.all([loadSocial(), loadCreative()]);

    const items: MediaFeedItem[] = [];

    for (const doc of socialSnap.docs) {
      const data = doc.data();
      const score = (data.sentimentScore || 0) + (data.severity === 'high' ? 1 : 0);

      items.push({
        id: doc.id,
        type: 'social',
        platform: String(data.channel || data.platform || 'social'),
        title: String(data.interactionType || 'interaction'),
        text: String(data.message || ''),
        mediaUrl: String(data.mediaUrl || ''),
        occurredAt: String(data.occurredAt || data.updatedAt || new Date().toISOString()),
        engagementScore: Number(score),
      });
    }

    for (const doc of creativeSnap.docs) {
      const data = doc.data();
      const spend = Number(data.spend || 0);
      const revenue = Number(data.revenue || 0);
      const score = spend > 0 ? revenue / spend : 0;

      items.push({
        id: doc.id,
        type: 'creative',
        platform: String(data.platform || 'meta_ads'),
        title: String(data.name || data.headline || 'Creative'),
        text: String(data.primaryText || data.caption || ''),
        mediaUrl: String(data.thumbnail || data.mediaUrl || ''),
        occurredAt: String(data.updatedAt || new Date().toISOString()),
        engagementScore: score,
        metadata: {
          spend,
          revenue,
          roas: score,
        },
      });
    }

    items.sort((a, b) => {
      if (a.occurredAt !== b.occurredAt) return b.occurredAt.localeCompare(a.occurredAt);
      return b.engagementScore - a.engagementScore;
    });

    return NextResponse.json({
      success: true,
      clientId,
      items: items.slice(0, limit),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load media feed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
