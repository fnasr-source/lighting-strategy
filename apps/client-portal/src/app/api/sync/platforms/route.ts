/**
 * Platform Data Sync API — /api/sync/platforms
 * 
 * Fetches DAILY + MONTHLY metrics from connected ad platforms (Meta Ads)
 * and e-commerce platforms (Shopify), writes to Firestore:
 *   - dailyPlatformMetrics    (per platform per day)
 *   - monthlyPlatformMetrics  (per platform per month)
 *   - monthlyClientRollups    (combined per month)
 *   - platformConnections     (lastSync, lastError updated)
 * 
 * Endpoints:
 *   POST /api/sync/platforms                    → sync all clients
 *   POST /api/sync/platforms?clientId=xxx       → sync one client
 *   POST /api/sync/platforms?months=6           → sync last N months (default: 3)
 *   GET  /api/sync/platforms?...                → same (easy browser trigger)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

interface SyncResult {
    client: string;
    platform: string;
    dailyRows: number;
    monthlyRows: number;
    status: 'ok' | 'error';
    error?: string;
}

// ─── Helper: date ranges ──────────────────────────────────────────
function getMonthRanges(monthsBack: number) {
    const ranges: { start: string; end: string; monthEnd: string }[] = [];
    const now = new Date();
    for (let i = 0; i < monthsBack; i++) {
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const start = new Date(end.getFullYear(), end.getMonth(), 1);
        ranges.push({
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
            monthEnd: end.toISOString().slice(0, 10),
        });
    }
    return ranges;
}

function getDailyRange(daysBack: number) {
    const dates: string[] = [];
    const now = new Date();
    for (let i = 0; i < daysBack; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
}

// ─── Meta Ads (Graph API v21) ─────────────────────────────────────
function parseMetaRow(row: Record<string, any>) {
    const impressions = parseInt(row.impressions || '0');
    const clicks = parseInt(row.clicks || '0');
    const spend = parseFloat(row.spend || '0');
    const reach = parseInt(row.reach || '0');
    const frequency = parseFloat(row.frequency || '0');
    const cpm = parseFloat(row.cpm || '0');

    let conversions = 0, revenue = 0, purchases = 0, linkClicks = 0;

    if (row.actions) {
        for (const a of row.actions) {
            if (a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase') {
                purchases += parseInt(a.value || '0');
                conversions += parseInt(a.value || '0');
            }
            if (a.action_type === 'link_click') linkClicks += parseInt(a.value || '0');
            if (a.action_type === 'omni_purchase') conversions += parseInt(a.value || '0');
        }
    }
    if (row.action_values) {
        for (const a of row.action_values) {
            if (['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'].includes(a.action_type)) {
                revenue += parseFloat(a.value || '0');
            }
        }
    }
    return { impressions, clicks, spend, reach, frequency, cpm, linkClicks, conversions, revenue, orders: purchases };
}

async function fetchMetaAdsInsights(
    adAccountId: string,
    accessToken: string,
    since: string,
    until: string,
    level: 'day' | 'month' = 'month',
): Promise<{ date: string; data: Record<string, any> }[]> {
    const results: { date: string; data: Record<string, any> }[] = [];
    const breakdownParam = level === 'day' ? '&time_increment=1' : '';

    const url = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?` +
        `fields=impressions,clicks,spend,reach,frequency,actions,action_values,cpm,cpc,ctr,cost_per_action_type` +
        `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}` +
        `${breakdownParam}&limit=500&access_token=${accessToken}`;

    const resp = await fetch(url);
    const json = await resp.json();

    if (json.error) throw new Error(`Meta API: ${json.error.message}`);
    if (!json.data || json.data.length === 0) return [];

    for (const row of json.data) {
        const dateStr = level === 'day' ? row.date_start : until;
        results.push({ date: dateStr, data: parseMetaRow(row) });
    }
    return results;
}

// ─── Shopify (Admin API) ──────────────────────────────────────────
async function fetchShopifyOrders(
    shopUrl: string,
    accessToken: string,
    since: string,
    until: string,
): Promise<{ date: string; revenue: number; orders: number }[]> {
    const cleanUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const startDate = new Date(since);
    const endDate = new Date(until);
    endDate.setDate(endDate.getDate() + 1); // inclusive

    // Daily buckets
    const dailyMap: Record<string, { revenue: number; orders: number }> = {};

    let pageUrl: string | null = `https://${cleanUrl}/admin/api/2024-01/orders.json?` +
        `status=any&created_at_min=${startDate.toISOString()}&created_at_max=${endDate.toISOString()}&limit=250&fields=id,total_price,financial_status,created_at`;

    while (pageUrl) {
        const resp: Response = await fetch(pageUrl, {
            headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
        });
        const json = await resp.json();
        if (json.errors) throw new Error(`Shopify API: ${JSON.stringify(json.errors)}`);

        const orders = json.orders || [];
        for (const o of orders) {
            if (o.financial_status !== 'refunded' && o.financial_status !== 'voided') {
                const day = o.created_at?.slice(0, 10);
                if (day) {
                    if (!dailyMap[day]) dailyMap[day] = { revenue: 0, orders: 0 };
                    dailyMap[day].orders++;
                    dailyMap[day].revenue += parseFloat(o.total_price || '0');
                }
            }
        }
        const linkHeader: string | null = resp.headers.get('Link');
        const nextMatch: RegExpMatchArray | null = linkHeader?.match(/<([^>]+)>;\s*rel="next"/) || null;
        pageUrl = nextMatch ? nextMatch[1] : null;
    }

    return Object.entries(dailyMap).map(([date, d]) => ({ date, ...d }));
}

// ─── Main Handler ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const clientIdFilter = searchParams.get('clientId');
        const monthsBack = parseInt(searchParams.get('months') || '3');
        const daysBack = parseInt(searchParams.get('days') || '90');
        const db = getAdminDb();

        // Load connections
        let connQuery = db.collection('platformConnections').where('isConnected', '==', true);
        if (clientIdFilter) {
            connQuery = connQuery.where('clientId', '==', clientIdFilter) as typeof connQuery;
        }
        const connSnap = await connQuery.get();

        const results: SyncResult[] = [];

        for (const connDoc of connSnap.docs) {
            const conn = connDoc.data();
            const { clientId, platform, credentials } = conn;
            const connRef = db.collection('platformConnections').doc(connDoc.id);

            try {
                const platformType = ['meta_ads', 'google_ads', 'tiktok_ads'].includes(platform) ? 'ad' : 'ecommerce';
                const currency = conn.currency || 'EGP';
                let dailyRows = 0;
                let monthlyRows = 0;

                if (platform === 'meta_ads' && credentials.adAccountId && credentials.accessToken) {
                    // ── Daily metrics ──
                    const dailyRange = getDailyRange(daysBack);
                    const dailySince = dailyRange[dailyRange.length - 1];
                    const dailyUntil = dailyRange[0];

                    try {
                        const dailyData = await fetchMetaAdsInsights(
                            credentials.adAccountId, credentials.accessToken,
                            dailySince, dailyUntil, 'day'
                        );
                        for (const row of dailyData) {
                            const docId = `${clientId}_${platform}_daily_${row.date}`;
                            await db.collection('dailyPlatformMetrics').doc(docId).set({
                                clientId, platform, platformType, currency,
                                date: row.date, granularity: 'daily',
                                ...row.data,
                                source: 'api_sync',
                                aggregatedAt: new Date().toISOString(),
                            }, { merge: true });
                            dailyRows++;
                        }
                    } catch (err: any) {
                        console.error(`Meta daily fetch error:`, err.message);
                    }

                    // ── Monthly metrics ──
                    const ranges = getMonthRanges(monthsBack);
                    for (const range of ranges) {
                        try {
                            const monthlyData = await fetchMetaAdsInsights(
                                credentials.adAccountId, credentials.accessToken,
                                range.start, range.end, 'month'
                            );
                            for (const row of monthlyData) {
                                const docId = `${clientId}_${platform}_${range.monthEnd}`;
                                await db.collection('monthlyPlatformMetrics').doc(docId).set({
                                    clientId, platform, platformType, currency,
                                    monthEndDate: range.monthEnd,
                                    ...row.data,
                                    source: 'api_sync',
                                    aggregatedAt: new Date().toISOString(),
                                }, { merge: true });
                                monthlyRows++;
                            }
                        } catch (err: any) {
                            console.error(`Meta monthly fetch error for ${range.monthEnd}:`, err.message);
                        }
                    }

                    // Mark connection healthy
                    await connRef.update({
                        lastSync: new Date().toISOString(),
                        lastError: null,
                        syncStatus: 'ok',
                    });

                } else if (platform === 'shopify' && credentials.shopUrl && credentials.accessToken) {
                    // ── Daily + Monthly from orders ──
                    const dailyRange = getDailyRange(daysBack);
                    const dailySince = dailyRange[dailyRange.length - 1];
                    const dailyUntil = dailyRange[0];

                    try {
                        const orderData = await fetchShopifyOrders(
                            credentials.shopUrl, credentials.accessToken,
                            dailySince, dailyUntil
                        );

                        // Write daily metrics
                        for (const row of orderData) {
                            const docId = `${clientId}_${platform}_daily_${row.date}`;
                            await db.collection('dailyPlatformMetrics').doc(docId).set({
                                clientId, platform, platformType: 'ecommerce', currency,
                                date: row.date, granularity: 'daily',
                                revenue: row.revenue, orders: row.orders,
                                conversions: row.orders,
                                impressions: 0, clicks: 0, spend: 0, reach: 0,
                                frequency: 0, cpm: 0, linkClicks: 0,
                                source: 'api_sync',
                                aggregatedAt: new Date().toISOString(),
                            }, { merge: true });
                            dailyRows++;
                        }

                        // Aggregate monthly
                        const monthlyAgg: Record<string, { revenue: number; orders: number }> = {};
                        for (const row of orderData) {
                            const d = new Date(row.date);
                            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
                            if (!monthlyAgg[monthEnd]) monthlyAgg[monthEnd] = { revenue: 0, orders: 0 };
                            monthlyAgg[monthEnd].revenue += row.revenue;
                            monthlyAgg[monthEnd].orders += row.orders;
                        }

                        for (const [monthEnd, totals] of Object.entries(monthlyAgg)) {
                            const docId = `${clientId}_${platform}_${monthEnd}`;
                            await db.collection('monthlyPlatformMetrics').doc(docId).set({
                                clientId, platform, platformType: 'ecommerce', currency,
                                monthEndDate: monthEnd,
                                revenue: totals.revenue, orders: totals.orders,
                                conversions: totals.orders,
                                impressions: 0, clicks: 0, spend: 0, reach: 0,
                                frequency: 0, cpm: 0, linkClicks: 0,
                                source: 'api_sync',
                                aggregatedAt: new Date().toISOString(),
                            }, { merge: true });
                            monthlyRows++;
                        }

                        // Mark connection healthy
                        await connRef.update({
                            lastSync: new Date().toISOString(),
                            lastError: null,
                            syncStatus: 'ok',
                        });
                    } catch (err: any) {
                        throw err; // re-throw so outer catch records error
                    }

                } else {
                    // Unsupported / missing credentials
                    await connRef.update({
                        syncStatus: 'error',
                        lastError: `Missing required credentials for ${platform}`,
                        lastSync: new Date().toISOString(),
                    });
                    results.push({ client: clientId, platform, dailyRows: 0, monthlyRows: 0, status: 'error', error: 'Missing credentials' });
                    continue;
                }

                results.push({ client: clientId, platform, dailyRows, monthlyRows, status: 'ok' });

            } catch (err: any) {
                // Record error on the connection document
                await connRef.update({
                    syncStatus: 'error',
                    lastError: err.message?.slice(0, 300),
                    lastSync: new Date().toISOString(),
                });
                results.push({ client: clientId, platform, dailyRows: 0, monthlyRows: 0, status: 'error', error: err.message });
            }
        }

        // ─── Compute combined rollups per client per month ─────────
        const clientIds = [...new Set(results.filter(r => r.status === 'ok').map(r => r.client))];
        for (const cid of clientIds) {
            const metricsSnap = await db.collection('monthlyPlatformMetrics')
                .where('clientId', '==', cid).get();

            const byMonth: Record<string, { impressions: number; clicks: number; spend: number; revenue: number; conversions: number; orders: number }> = {};

            for (const d of metricsSnap.docs) {
                const data = d.data();
                const m = data.monthEndDate;
                if (!byMonth[m]) byMonth[m] = { impressions: 0, clicks: 0, spend: 0, revenue: 0, conversions: 0, orders: 0 };
                byMonth[m].impressions += data.impressions || 0;
                byMonth[m].clicks += data.clicks || 0;
                byMonth[m].spend += data.spend || 0;
                byMonth[m].revenue += data.revenue || 0;
                byMonth[m].conversions += data.conversions || 0;
                byMonth[m].orders += data.orders || 0;
            }

            for (const [monthEnd, totals] of Object.entries(byMonth)) {
                const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
                const aov = totals.orders > 0 ? totals.revenue / totals.orders : 0;
                const cpo = totals.orders > 0 ? totals.spend / totals.orders : 0;
                const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;

                await db.collection('monthlyClientRollups').doc(`${cid}_combined_${monthEnd}`).set({
                    clientId: cid, platformType: 'combined', monthEndDate: monthEnd,
                    currency: 'EGP', ...totals, roas, aov, cpo, cpm,
                    source: 'api_sync', aggregatedAt: new Date().toISOString(),
                }, { merge: true });
            }
        }

        return NextResponse.json({
            success: true,
            synced: results.length,
            results,
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error('Sync error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
