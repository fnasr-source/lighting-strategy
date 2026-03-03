/**
 * AI Engagement Analysis — /api/ai/engagement-analysis
 * 
 * Analyses social media engagement data using Google Gemini 2.0 Flash
 * via Vertex AI REST API (same auth as /api/ai/insights).
 */
import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import fs from 'fs';

const PROJECT_ID = 'admireworks---internal-os';
const LOCATION = 'us-central1';
const MODEL = 'gemini-2.0-flash';

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

async function callGemini(prompt: string): Promise<string> {
    const token = await getAccessToken();
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024, responseMimeType: 'application/json' },
        }),
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Gemini API error (${resp.status}): ${err}`);
    }

    const json = await resp.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(req: NextRequest) {
    try {
        const { clientName, engagement } = await req.json();
        if (!engagement) return NextResponse.json({ error: 'engagement data required' }, { status: 400 });

        const prompt = `You are an expert social media analyst for a digital marketing agency.
Analyse the following social media engagement data for "${clientName}" and provide insights.

ENGAGEMENT DATA:
- Platforms: ${engagement.platforms?.join(', ') || 'Unknown'}
- Total Posts: ${engagement.totalPosts}
- Total Likes: ${engagement.totalLikes}
- Total Comments: ${engagement.totalComments}
- Total Shares: ${engagement.totalShares}

TOP PERFORMING POSTS:
${(engagement.topPostCaptions || []).map((p: any, i: number) => `${i + 1}. [${p.type}] "${p.message}" (❤️${p.likes} 💬${p.comments})`).join('\n')}

RECENT COMMENTS SAMPLE:
${(engagement.recentComments || []).map((c: any, i: number) => `${i + 1}. ${c.from}: "${c.message}" (on: "${c.postContext}")`).join('\n')}

Return JSON with:
{
  "sentimentSummary": "2-3 sentence summary of overall audience sentiment and engagement quality",
  "topThemes": ["theme1", "theme2", "theme3"],
  "recommendations": ["actionable recommendation 1", "recommendation 2", "recommendation 3"],
  "audienceInsights": "1-2 sentence insight about audience demographics/behavior patterns"
}`;

        const text = await callGemini(prompt);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Could not parse AI response');
        const analysis = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ success: true, analysis });
    } catch (err: any) {
        console.error('AI engagement analysis error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
