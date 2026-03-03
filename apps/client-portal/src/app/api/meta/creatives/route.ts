/**
 * Top Creatives & Ad Copies API — /api/meta/creatives
 * 
 * Fetches top-performing ad creatives and ad copies from Meta Marketing API.
 * Uses /insights endpoint for performance data, then enriches with creative details.
 * 
 * Query params:
 *   clientId  — required
 *   days      — lookback period (default: 30)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

interface Creative {
    id: string;
    name: string;
    adType: 'image' | 'video' | 'carousel' | 'unknown';
    thumbnail?: string;
    spend: number;
    revenue: number;
    roas: number;
    impressions: number;
    clicks: number;
    purchases: number;
}

interface AdCopy {
    id: string;
    headline: string;
    primaryText: string;
    spend: number;
    revenue: number;
    roas: number;
    impressions: number;
    clicks: number;
    purchases: number;
}

// Step 1: Fetch ad-level insights (performance data)
async function fetchAdInsights(
    adAccountId: string, accessToken: string, since: string, until: string,
): Promise<{ id: string; name: string; impressions: number; clicks: number; spend: number; revenue: number; purchases: number }[]> {
    const fields = 'ad_id,ad_name,impressions,clicks,spend,actions,action_values';
    const url = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?` +
        `fields=${fields}` +
        `&level=ad` +
        `&time_range={"since":"${since}","until":"${until}"}` +
        `&sort=spend_descending` +
        `&limit=30` +
        `&access_token=${accessToken}`;

    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(`Meta API: ${data.error.message}`);

    return (data.data || []).map((row: Record<string, any>) => {
        const impressions = parseInt(row.impressions || '0');
        const clicks = parseInt(row.clicks || '0');
        const spend = parseFloat(row.spend || '0');
        let purchases = 0, revenue = 0;

        if (row.actions) {
            for (const a of row.actions) {
                if (['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'].includes(a.action_type)) {
                    purchases += parseInt(a.value || '0');
                }
            }
        }
        if (row.action_values) {
            for (const a of row.action_values) {
                if (['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'].includes(a.action_type)) {
                    revenue += parseFloat(a.value || '0');
                }
            }
        }

        return { id: row.ad_id, name: row.ad_name || 'Unnamed Ad', impressions, clicks, spend, revenue, purchases };
    });
}

// Step 2: Fetch creative metadata for given ad IDs
async function fetchCreativeDetails(
    adIds: string[], accessToken: string,
): Promise<Map<string, { thumbnail: string; adType: string; headline: string; primaryText: string }>> {
    const map = new Map<string, { thumbnail: string; adType: string; headline: string; primaryText: string }>();

    // Fetch ads with creative details (batch of IDs)
    const idsParam = adIds.slice(0, 30).join(',');
    const fields = 'id,creative{thumbnail_url,object_story_spec,asset_feed_spec}';
    const url = `https://graph.facebook.com/v21.0/?ids=${idsParam}&fields=${fields}&access_token=${accessToken}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) {
            console.warn('Creative details fetch failed:', data.error.message);
            return map;
        }

        for (const [adId, adData] of Object.entries(data)) {
            const ad = adData as Record<string, any>;
            const creative = ad.creative;
            if (!creative) continue;

            let adType = 'unknown';
            let thumbnail = creative.thumbnail_url || '';
            let headline = '';
            let primaryText = '';

            if (creative.object_story_spec) {
                const spec = creative.object_story_spec;
                if (spec.video_data) {
                    adType = 'video';
                    headline = spec.video_data.title || spec.video_data.call_to_action?.value?.link_title || '';
                    primaryText = spec.video_data.message || '';
                    thumbnail = thumbnail || spec.video_data.image_url || '';
                } else if (spec.link_data) {
                    if (spec.link_data.child_attachments) adType = 'carousel';
                    else adType = 'image';
                    headline = spec.link_data.name || spec.link_data.title || '';
                    primaryText = spec.link_data.message || '';
                    thumbnail = thumbnail || spec.link_data.picture || '';
                }
            }

            if (creative.asset_feed_spec) {
                const afs = creative.asset_feed_spec;
                if (afs.videos?.length) adType = 'video';
                else if (afs.images?.length) adType = 'image';
                if (afs.bodies?.length) primaryText = primaryText || afs.bodies[0].text || '';
                if (afs.titles?.length) headline = headline || afs.titles[0].text || '';
            }

            map.set(adId, { thumbnail, adType, headline, primaryText });
        }
    } catch (err) {
        console.warn('Creative details fetch error:', err);
    }

    return map;
}

export async function GET(req: NextRequest) { return handleRequest(req); }
export async function POST(req: NextRequest) { return handleRequest(req); }

async function handleRequest(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');
        const daysBack = parseInt(searchParams.get('days') || '30');

        if (!clientId) {
            return NextResponse.json({ error: 'clientId required' }, { status: 400 });
        }

        const db = getAdminDb();
        const connSnap = await db.collection('platformConnections')
            .where('clientId', '==', clientId)
            .where('platform', '==', 'meta_ads')
            .limit(1)
            .get();

        if (connSnap.empty) {
            return NextResponse.json({ error: 'No Meta Ads connection found' }, { status: 404 });
        }

        const conn = connSnap.docs[0].data();
        const { credentials } = conn;
        if (!credentials?.adAccountId || !credentials?.accessToken) {
            return NextResponse.json({ error: 'Missing Meta Ads credentials' }, { status: 400 });
        }

        const now = new Date();
        const since = new Date(now);
        since.setDate(since.getDate() - daysBack);
        const sinceStr = since.toISOString().slice(0, 10);
        const untilStr = now.toISOString().slice(0, 10);

        // Step 1: Get performance data
        const adInsights = await fetchAdInsights(
            credentials.adAccountId, credentials.accessToken, sinceStr, untilStr,
        );

        if (adInsights.length === 0) {
            return NextResponse.json({
                success: true, clientId,
                dateRange: { since: sinceStr, until: untilStr },
                creatives: [], adCopies: [], totalAds: 0,
            });
        }

        // Step 2: Get creative details for these ads
        const adIds = adInsights.map(a => a.id);
        const creativeDetails = await fetchCreativeDetails(adIds, credentials.accessToken);

        // Build creative + ad copy lists
        const creatives: Creative[] = [];
        const adCopies: AdCopy[] = [];

        for (const ad of adInsights) {
            if (ad.spend <= 0) continue;
            const roas = ad.spend > 0 ? ad.revenue / ad.spend : 0;
            const details = creativeDetails.get(ad.id);

            creatives.push({
                id: ad.id, name: ad.name,
                adType: (details?.adType || 'unknown') as Creative['adType'],
                thumbnail: details?.thumbnail || '',
                spend: ad.spend, revenue: ad.revenue, roas,
                impressions: ad.impressions, clicks: ad.clicks, purchases: ad.purchases,
            });

            const headline = details?.headline || ad.name;
            const primaryText = details?.primaryText || '';
            if (headline || primaryText) {
                adCopies.push({
                    id: ad.id, headline, primaryText,
                    spend: ad.spend, revenue: ad.revenue, roas,
                    impressions: ad.impressions, clicks: ad.clicks, purchases: ad.purchases,
                });
            }
        }

        // Sort by ROAS descending
        creatives.sort((a, b) => b.roas - a.roas);
        adCopies.sort((a, b) => b.roas - a.roas);

        return NextResponse.json({
            success: true, clientId,
            dateRange: { since: sinceStr, until: untilStr },
            creatives: creatives.slice(0, 6),
            adCopies: adCopies.slice(0, 5),
            totalAds: creatives.length,
        });
    } catch (err: any) {
        console.error('Top creatives error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
