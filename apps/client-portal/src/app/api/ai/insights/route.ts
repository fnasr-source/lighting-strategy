/**
 * AI Insights API — /api/ai/insights
 * 
 * Uses Google Gemini 2.0 Flash via Vertex AI REST API to generate
 * per-account performance insights based on business type.
 * 
 * POST /api/ai/insights?clientId=xxx
 * POST /api/ai/insights?clientId=xxx&dateRange=6m
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import fs from 'fs';

const PROJECT_ID = 'admireworks---internal-os';
const LOCATION = 'us-central1';
const MODEL = 'gemini-2.0-flash';

// ── Auth helper ───────────────────────────────────────────────────
let authClient: any = null;
async function getAccessToken(): Promise<string> {
    if (!authClient) {
        const saPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../../firebase/service-account.json');
        const keyFile = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        const auth = new GoogleAuth({
            credentials: keyFile,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        authClient = await auth.getClient();
    }
    const token = await authClient.getAccessToken();
    return token.token || token;
}

// ── Gemini call ───────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
    const token = await getAccessToken();
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        }),
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Gemini API error (${resp.status}): ${err}`);
    }

    const json = await resp.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');
    return text;
}

// ── Prompt builders ───────────────────────────────────────────────
function buildEcommercePrompt(client: any, metrics: any[], dailyMetrics: any[]): string {
    return `You are a world-class e-commerce performance marketing analyst. Analyze the following data for "${client.name}", a ${client.industry || 'retail'} e-commerce business in the ${client.region || 'MENA'} region (currency: ${client.baseCurrency || 'EGP'}).

Connected platforms: ${[...new Set(metrics.map((m: any) => m.platform))].join(', ') || 'None'}

MONTHLY PERFORMANCE DATA (most recent first):
${JSON.stringify(metrics.map((m: any) => ({
        month: m.monthEndDate,
        revenue: Math.round(m.revenue),
        spend: Math.round(m.spend),
        roas: m.spend > 0 ? (m.revenue / m.spend).toFixed(1) : 'N/A',
        orders: m.orders,
        aov: m.orders > 0 ? Math.round(m.revenue / m.orders) : 0,
        cpo: m.orders > 0 ? Math.round(m.spend / m.orders) : 0,
        impressions: m.impressions,
        clicks: m.clicks,
        ctr: m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) + '%' : 'N/A',
    })), null, 2)}

RECENT DAILY TREND (last 14 days):
${JSON.stringify(dailyMetrics.slice(0, 14).map((d: any) => ({
        date: d.date,
        revenue: Math.round(d.revenue || 0),
        spend: Math.round(d.spend || 0),
        orders: d.orders || 0,
    })), null, 2)}

Respond with EXACT JSON:
{
  "summary": "2-3 sentence performance overview highlighting the most important trends",
  "health_score": <number 0-100 representing overall account health>,
  "wins": ["Text of win 1", "Text of win 2"],
  "alerts": [{"severity": "high|medium|low", "message": "Alert text", "metric": "metric_name"}],
  "recommendations": [{"priority": 1, "action": "Specific action to take", "expected_impact": "Expected result", "category": "budget|creative|targeting|offer"}],
  "trends": {"revenue_direction": "up|down|flat", "roas_direction": "up|down|flat", "spend_efficiency": "improving|declining|stable"},
  "benchmarks": {"roas_rating": "excellent|good|average|poor", "ctr_rating": "excellent|good|average|poor", "aov_rating": "high|average|low"}
}`;
}

function buildLeadGenPrompt(client: any, metrics: any[], dailyMetrics: any[]): string {
    return `You are a world-class lead generation performance marketing analyst. Analyze the following data for "${client.name}", a ${client.industry || 'services'} business in the ${client.region || 'MENA'} region (currency: ${client.baseCurrency || 'AED'}).

Connected platforms: ${[...new Set(metrics.map((m: any) => m.platform))].join(', ') || 'None'}

MONTHLY PERFORMANCE DATA (most recent first):
${JSON.stringify(metrics.map((m: any) => ({
        month: m.monthEndDate,
        spend: Math.round(m.spend),
        leads: m.conversions,
        cpl: m.conversions > 0 ? Math.round(m.spend / m.conversions) : 0,
        impressions: m.impressions,
        clicks: m.clicks,
        ctr: m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) + '%' : 'N/A',
        cpc: m.clicks > 0 ? (m.spend / m.clicks).toFixed(2) : 'N/A',
        conversion_rate: m.clicks > 0 ? ((m.conversions / m.clicks) * 100).toFixed(2) + '%' : 'N/A',
    })), null, 2)}

RECENT DAILY TREND (last 14 days):
${JSON.stringify(dailyMetrics.slice(0, 14).map((d: any) => ({
        date: d.date,
        spend: Math.round(d.spend || 0),
        leads: d.conversions || 0,
        clicks: d.clicks || 0,
    })), null, 2)}

Respond with EXACT JSON:
{
  "summary": "2-3 sentence performance overview focusing on lead quality and cost efficiency",
  "health_score": <number 0-100 representing overall account health>,
  "wins": ["Text of win 1", "Text of win 2"],
  "alerts": [{"severity": "high|medium|low", "message": "Alert text", "metric": "metric_name"}],
  "recommendations": [{"priority": 1, "action": "Specific action to take", "expected_impact": "Expected result", "category": "budget|creative|targeting|landing_page"}],
  "trends": {"lead_volume_direction": "up|down|flat", "cpl_direction": "up|down|flat", "quality_trend": "improving|declining|stable"},
  "benchmarks": {"cpl_rating": "excellent|good|average|poor", "ctr_rating": "excellent|good|average|poor", "conversion_rate_rating": "high|average|low"}
}`;
}

// ── Main Handler ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');
        if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

        const db = getAdminDb();

        // Load client
        const clientDoc = await db.collection('clients').doc(clientId).get();
        if (!clientDoc.exists) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        const client = clientDoc.data()!;

        // Load monthly metrics (combined rollups — fetch all for client, sort in-memory to avoid composite index)
        const monthlySnap = await db.collection('monthlyClientRollups')
            .where('clientId', '==', clientId)
            .get();
        const monthlyMetrics = monthlySnap.docs
            .map(d => d.data())
            .sort((a: any, b: any) => (b.monthEndDate || '').localeCompare(a.monthEndDate || ''))
            .slice(0, 12);

        // Load daily metrics (fetch all for client, filter last 30 days in-memory)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString().slice(0, 10);
        const dailySnap = await db.collection('dailyPlatformMetrics')
            .where('clientId', '==', clientId)
            .get();
        const dailyMetrics = dailySnap.docs
            .map(d => d.data())
            .filter((d: any) => d.date >= cutoffDate)
            .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
            .slice(0, 60);

        // If no data, return early
        if (monthlyMetrics.length === 0 && dailyMetrics.length === 0) {
            return NextResponse.json({
                success: true,
                insights: {
                    summary: `No performance data available yet for ${client.name}. Connect platforms and sync data to get AI-powered insights.`,
                    health_score: 0,
                    wins: [],
                    alerts: [{ severity: 'medium', message: 'No data synced yet', metric: 'data' }],
                    recommendations: [{ priority: 1, action: 'Connect ad platforms in Integrations', expected_impact: 'Enable performance tracking', category: 'setup' }],
                    trends: {},
                    benchmarks: {},
                },
                generated_at: new Date().toISOString(),
                source: 'fallback',
            });
        }

        // Build business-type-specific prompt
        const businessType = client.businessType || 'ecommerce';
        const prompt = businessType === 'lead_gen'
            ? buildLeadGenPrompt(client, monthlyMetrics, dailyMetrics)
            : buildEcommercePrompt(client, monthlyMetrics, dailyMetrics);

        // Call Gemini
        const rawResponse = await callGemini(prompt);
        let insights;
        try {
            insights = JSON.parse(rawResponse);
        } catch {
            insights = { summary: rawResponse, health_score: 50, wins: [], alerts: [], recommendations: [], trends: {}, benchmarks: {} };
        }

        // Store in Firestore for caching
        const insightDoc = {
            clientId,
            businessType,
            insights,
            generatedAt: new Date().toISOString(),
            model: MODEL,
            dataPoints: { monthly: monthlyMetrics.length, daily: dailyMetrics.length },
        };
        await db.collection('clientInsights').doc(clientId).set(insightDoc, { merge: true });

        return NextResponse.json({
            success: true,
            insights,
            generated_at: insightDoc.generatedAt,
            source: 'gemini',
            model: MODEL,
        });

    } catch (err: any) {
        console.error('AI Insights error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
