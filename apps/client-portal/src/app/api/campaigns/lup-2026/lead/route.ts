import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { sendCampaignBookingFollowupEmail } from '@/lib/scheduling/emails';

const BOOKING_SLUG = 'discovery-call';

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin') || '*'),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';

  try {
    const body = await req.json();
    const firstName = String(body?.firstName || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!firstName || !email) {
      return NextResponse.json({ error: 'firstName and email are required' }, { status: 400, headers: corsHeaders(origin) });
    }

    const leadPayload = {
      ...body,
      email,
      status: String(body?.status || 'new'),
      campaign: String(body?.campaign || 'leading-under-pressure-2026'),
      form_type: String(body?.form_type || 'application'),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      submitted_at: String(body?.submitted_at || new Date().toISOString()),
      client_id: String(body?.client_id || 'aspire-hr'),
      source: 'campaign_api',
    };

    await adminDb.collection('campaigns').doc('lup-2026').collection('leads').add(leadPayload);

    const bookingUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/book/${BOOKING_SLUG}?email=${encodeURIComponent(email)}&name=${encodeURIComponent(firstName)}`;

    await sendCampaignBookingFollowupEmail({
      to: email,
      firstName,
      bookingUrl,
      campaignName: 'Leading Under Pressure 2026',
    });

    return NextResponse.json(
      {
        success: true,
        bookingUrl,
      },
      { headers: corsHeaders(origin) },
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to submit lead' }, { status: 500, headers: corsHeaders(origin) });
  }
}
