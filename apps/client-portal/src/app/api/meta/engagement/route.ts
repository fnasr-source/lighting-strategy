/**
 * Social Media Engagement API — /api/meta/engagement
 * 
 * Fetches comments, reactions, and post engagement from Facebook/Instagram
 * pages connected to a client's Meta Ads account.
 * Uses the same access token from Meta Ads connection.
 * 
 * Query params:
 *   clientId  — required
 *   days      — lookback period (default: 30)
 *   limit     — max posts to fetch (default: 20)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

interface PostEngagement {
    id: string;
    message: string;
    createdTime: string;
    type: 'photo' | 'video' | 'link' | 'status' | 'reel' | string;
    likes: number;
    comments: number;
    shares: number;
    reach?: number;
    thumbnail?: string;
    commentSamples: { from: string; message: string; createdTime: string; sentiment?: string }[];
}

interface EngagementSummary {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgEngagementRate: number;
    topPosts: PostEngagement[];
    recentComments: { from: string; message: string; postMessage: string; createdTime: string }[];
    platforms: string[];
}

// Fetch Facebook Page posts with engagement
async function fetchFBPagePosts(pageId: string, accessToken: string, since: string, limit: number) {
    const fields = 'message,created_time,type,full_picture,permalink_url,likes.summary(true).limit(0),comments.summary(true).limit(5){from,message,created_time},shares';
    const url = `https://graph.facebook.com/v21.0/${pageId}/posts?` +
        `fields=${fields}` +
        `&since=${since}` +
        `&limit=${limit}` +
        `&access_token=${accessToken}`;

    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(`FB Page API: ${data.error.message}`);
    return data.data || [];
}

// Fetch Instagram media with engagement
async function fetchIGMedia(igUserId: string, accessToken: string, limit: number) {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,comments{text,username,timestamp}';
    const url = `https://graph.facebook.com/v21.0/${igUserId}/media?` +
        `fields=${fields}` +
        `&limit=${limit}` +
        `&access_token=${accessToken}`;

    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(`IG API: ${data.error.message}`);
    return data.data || [];
}

// Get Facebook pages managed by this token
async function getPages(accessToken: string): Promise<{ id: string; name: string; access_token: string }[]> {
    const url = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) return [];
    return data.data || [];
}

// Get Instagram business account linked to a page
async function getIGAccount(pageId: string, pageToken: string): Promise<string | null> {
    const url = `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.instagram_business_account?.id || null;
}

export async function GET(req: NextRequest) { return handleRequest(req); }
export async function POST(req: NextRequest) { return handleRequest(req); }

async function handleRequest(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');
        const daysBack = parseInt(searchParams.get('days') || '30');
        const limit = parseInt(searchParams.get('limit') || '20');

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
        const accessToken = conn.credentials?.accessToken;
        if (!accessToken) {
            return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
        }

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - daysBack);
        const sinceStr = sinceDate.toISOString().slice(0, 10);

        const summary: EngagementSummary = {
            totalPosts: 0, totalLikes: 0, totalComments: 0, totalShares: 0,
            avgEngagementRate: 0, topPosts: [], recentComments: [], platforms: [],
        };

        // Get Facebook pages
        const pages = await getPages(accessToken);
        const allPosts: PostEngagement[] = [];
        const allComments: EngagementSummary['recentComments'] = [];

        for (const page of pages.slice(0, 3)) { // Max 3 pages
            try {
                // Facebook posts
                const fbPosts = await fetchFBPagePosts(page.id, page.access_token, sinceStr, limit);
                if (!summary.platforms.includes('Facebook')) summary.platforms.push('Facebook');

                for (const post of fbPosts) {
                    const likes = post.likes?.summary?.total_count || 0;
                    const comments = post.comments?.summary?.total_count || 0;
                    const shares = post.shares?.count || 0;
                    const commentSamples = (post.comments?.data || []).map((c: any) => ({
                        from: c.from?.name || 'User',
                        message: c.message || '',
                        createdTime: c.created_time || '',
                    }));

                    const pe: PostEngagement = {
                        id: post.id, message: post.message || '', createdTime: post.created_time,
                        type: post.type || 'status', likes, comments, shares,
                        thumbnail: post.full_picture || '',
                        commentSamples,
                    };
                    allPosts.push(pe);
                    summary.totalLikes += likes;
                    summary.totalComments += comments;
                    summary.totalShares += shares;

                    for (const c of commentSamples) {
                        allComments.push({
                            from: c.from, message: c.message,
                            postMessage: (post.message || '').slice(0, 80),
                            createdTime: c.createdTime,
                        });
                    }
                }

                // Instagram
                try {
                    const igId = await getIGAccount(page.id, page.access_token);
                    if (igId) {
                        const igMedia = await fetchIGMedia(igId, page.access_token, limit);
                        if (!summary.platforms.includes('Instagram')) summary.platforms.push('Instagram');

                        for (const media of igMedia) {
                            const likes = media.like_count || 0;
                            const commentsCount = media.comments_count || 0;
                            const commentSamples = (media.comments?.data || []).slice(0, 3).map((c: any) => ({
                                from: c.username || 'User',
                                message: c.text || '',
                                createdTime: c.timestamp || '',
                            }));

                            const pe: PostEngagement = {
                                id: media.id, message: media.caption || '',
                                createdTime: media.timestamp,
                                type: media.media_type === 'VIDEO' ? 'reel' : 'photo',
                                likes, comments: commentsCount, shares: 0,
                                thumbnail: media.thumbnail_url || media.media_url || '',
                                commentSamples,
                            };
                            allPosts.push(pe);
                            summary.totalLikes += likes;
                            summary.totalComments += commentsCount;

                            for (const c of commentSamples) {
                                allComments.push({
                                    from: c.from, message: c.message,
                                    postMessage: (media.caption || '').slice(0, 80),
                                    createdTime: c.createdTime,
                                });
                            }
                        }
                    }
                } catch (igErr) {
                    console.warn(`IG fetch failed for page ${page.name}:`, igErr);
                }
            } catch (pageErr: any) {
                console.warn(`Page ${page.name} fetch failed:`, pageErr.message);
            }
        }

        summary.totalPosts = allPosts.length;
        // Sort posts by total engagement
        allPosts.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));
        summary.topPosts = allPosts.slice(0, 6);
        // Sort comments by recency
        allComments.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
        summary.recentComments = allComments.slice(0, 20);
        // Average engagement rate (if we have posts)
        if (allPosts.length > 0) {
            summary.avgEngagementRate = (summary.totalLikes + summary.totalComments + summary.totalShares) / allPosts.length;
        }

        return NextResponse.json({ success: true, clientId, summary });
    } catch (err: any) {
        console.error('Engagement API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
