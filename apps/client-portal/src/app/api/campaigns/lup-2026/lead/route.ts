import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { sendCampaignBookingFollowupEmail, sendCampaignBrochureFollowupEmail } from '@/lib/scheduling/emails';

const BOOKING_SLUG = 'discovery-call';
const CAMPAIGN_NAME = 'Leading Under Pressure 2026';
const DEFAULT_BROCHURE_OBJECT_PATH = 'campaigns/lup-2026/Leading Under Pressure Program 2026 (1).pdf';
const DEFAULT_BUCKET = process.env.LUP_BROCHURE_BUCKET || 'admireworks-internal-os-brochures-2026';
const DEFAULT_BROCHURE_PUBLIC_URL = 'https://storage.googleapis.com/admireworks-internal-os-brochures-2026/campaigns/lup-2026/Leading%20Under%20Pressure%20Program%202026%20(1).pdf';
const DEFAULT_PUBLIC_BASE_URL = 'https://my.admireworks.com';

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

async function getBrochureUrl(): Promise<string> {
  const publicUrl = process.env.LUP_BROCHURE_PUBLIC_URL;
  if (publicUrl) return publicUrl;

  const objectPath = process.env.LUP_BROCHURE_STORAGE_PATH || DEFAULT_BROCHURE_OBJECT_PATH;
  try {
    const file = admin.storage().bucket(DEFAULT_BUCKET).file(objectPath);
    const [exists] = await file.exists();
    if (!exists) return DEFAULT_BROCHURE_PUBLIC_URL;
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 180, // 180 days
    });
    return signedUrl || DEFAULT_BROCHURE_PUBLIC_URL;
  } catch {
    return DEFAULT_BROCHURE_PUBLIC_URL;
  }
}

function isPublicBaseUrl(url: string): boolean {
  return !/\/\/(0\.0\.0\.0|127\.0\.0\.1|localhost)(:\d+)?/i.test(url);
}

function resolveBookingBaseUrl(req: NextRequest): string {
  const envBase = String(process.env.NEXT_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (envBase && isPublicBaseUrl(envBase)) return envBase;

  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const requestOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}`.replace(/\/$/, '') : '';
  if (requestOrigin && isPublicBaseUrl(requestOrigin)) return requestOrigin;

  return DEFAULT_PUBLIC_BASE_URL;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';

  try {
    const body = await req.json();
    const firstName = String(body?.firstName || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const formType = String(body?.form_type || 'application');

    if (!firstName || !email) {
      return NextResponse.json({ error: 'firstName and email are required' }, { status: 400, headers: corsHeaders(origin) });
    }

    const leadPayload = {
      ...body,
      email,
      status: String(body?.status || 'new'),
      campaign: String(body?.campaign || 'leading-under-pressure-2026'),
      form_type: formType,
      lead_intent: formType === 'brochure_download' ? 'nurture' : formType,
      nurture_eligible: formType === 'brochure_download',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      submitted_at: String(body?.submitted_at || new Date().toISOString()),
      client_id: String(body?.client_id || 'aspire-hr'),
      source: 'campaign_api',
    };

    await adminDb.collection('campaigns').doc('lup-2026').collection('leads').add(leadPayload);

    const bookingBaseUrl = resolveBookingBaseUrl(req);
    const bookingUrl = `${bookingBaseUrl}/book/${BOOKING_SLUG}?email=${encodeURIComponent(email)}&name=${encodeURIComponent(firstName)}`;
    const brochureUrl = formType === 'brochure_download' ? await getBrochureUrl() : '';

    if (formType === 'brochure_download') {
      await sendCampaignBrochureFollowupEmail({
        to: email,
        firstName,
        campaignName: CAMPAIGN_NAME,
        brochureUrl,
        bookingUrl,
      });
    } else {
      await sendCampaignBookingFollowupEmail({
        to: email,
        firstName,
        bookingUrl,
        campaignName: CAMPAIGN_NAME,
      });
    }

    return NextResponse.json(
      {
        success: true,
        bookingUrl,
        brochureUrl,
      },
      { headers: corsHeaders(origin) },
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to submit lead' }, { status: 500, headers: corsHeaders(origin) });
  }
}
