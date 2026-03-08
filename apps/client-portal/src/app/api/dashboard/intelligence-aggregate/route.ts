import { NextRequest, NextResponse } from 'next/server';
import { loadAllClientsIntelligence } from '@/lib/performance-intelligence/intelligence';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const currency = searchParams.get('currency') || 'USD';
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;

        const response = await loadAllClientsIntelligence({ currency, from, to });

        return NextResponse.json(response);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to build aggregate intelligence';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
