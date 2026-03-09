import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

const CAMPAIGN_ID = 'lup-2026';
const MAX_RECENT_EVENTS = 25;

type AnalyticsRow = Record<string, unknown> & { id: string };

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin') || '*'),
  });
}

function safeString(value: unknown, fallback = ''): string {
  const text = String(value || '').trim();
  return text || fallback;
}

function countBy<T>(rows: T[], getter: (row: T) => string) {
  const out: Record<string, number> = {};
  rows.forEach((row) => {
    const key = getter(row);
    out[key] = (out[key] || 0) + 1;
  });
  return out;
}

function topEntries(map: Record<string, number>, limit = 10) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';

  try {
    const body = await req.json();
    const eventName = safeString(body?.event_name);
    const sessionId = safeString(body?.session_id);

    if (!eventName || !sessionId) {
      return NextResponse.json(
        { error: 'event_name and session_id are required' },
        { status: 400, headers: corsHeaders(origin) },
      );
    }

    const payload = {
      campaign: CAMPAIGN_ID,
      client_id: safeString(body?.client_id, 'aspire-hr'),
      event_name: eventName,
      session_id: sessionId,
      visitor_id: safeString(body?.visitor_id),
      path: safeString(body?.path),
      href: safeString(body?.href),
      page_title: safeString(body?.page_title),
      referrer: safeString(body?.referrer, '(direct)'),
      page_url: safeString(body?.page_url),
      cta_type: safeString(body?.cta_type),
      cta_label: safeString(body?.cta_label),
      modal_id: safeString(body?.modal_id),
      form_id: safeString(body?.form_id),
      form_type: safeString(body?.form_type),
      error_message: safeString(body?.error_message),
      event_source: safeString(body?.event_source, 'landing_page'),
      utm: typeof body?.utm === 'object' && body?.utm ? body.utm : {},
      meta: typeof body?.meta === 'object' && body?.meta ? body.meta : {},
      extra: typeof body?.extra === 'object' && body?.extra ? body.extra : {},
      user_agent: req.headers.get('user-agent') || '',
      submitted_at: safeString(body?.submitted_at, new Date().toISOString()),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await adminDb.collection('campaigns').doc(CAMPAIGN_ID).collection('analytics_events').add(payload);

    return NextResponse.json({ success: true }, { headers: corsHeaders(origin) });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to track analytics event' },
      { status: 500, headers: corsHeaders(origin) },
    );
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';

  try {
    const snap = await adminDb
      .collection('campaigns')
      .doc(CAMPAIGN_ID)
      .collection('analytics_events')
      .orderBy('created_at', 'desc')
      .limit(1000)
      .get();

    const rows: AnalyticsRow[] = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
    const uniqueSessions = new Set(rows.map((row) => safeString(row.session_id)).filter(Boolean)).size;
    const uniqueVisitors = new Set(rows.map((row) => safeString(row.visitor_id)).filter(Boolean)).size;

    const byEvent = countBy(rows, (row) => safeString(row.event_name, 'unknown'));
    const byPath = countBy(rows, (row) => safeString(row.path, '(unknown)'));
    const byReferrer = countBy(rows, (row) => safeString(row.referrer, '(direct)'));
    const byCta = countBy(rows, (row) => safeString(row.cta_type, '(none)'));
    const byForm = countBy(rows, (row) => safeString(row.form_type, '(none)'));

    return NextResponse.json(
      {
        total_events: rows.length,
        unique_sessions: uniqueSessions,
        unique_visitors: uniqueVisitors,
        pageviews: byEvent.page_view || 0,
        cta_clicks: byEvent.cta_click || 0,
        modal_opens: byEvent.modal_open || 0,
        form_starts: byEvent.form_start || 0,
        submit_attempts: byEvent.form_submit_attempt || 0,
        submit_successes: byEvent.form_submit_success || 0,
        submit_errors: byEvent.form_submit_error || 0,
        by_event: byEvent,
        top_pages: topEntries(byPath),
        top_referrers: topEntries(byReferrer),
        top_ctas: topEntries(byCta),
        top_forms: topEntries(byForm),
        recent: rows.slice(0, MAX_RECENT_EVENTS).map((row) => ({
          id: row.id,
          event_name: safeString(row.event_name),
          session_id: safeString(row.session_id),
          visitor_id: safeString(row.visitor_id),
          form_type: safeString(row.form_type),
          cta_type: safeString(row.cta_type),
          path: safeString(row.path),
          page_url: safeString(row.page_url),
          referrer: safeString(row.referrer),
          submitted_at: safeString(row.submitted_at),
        })),
      },
      { headers: corsHeaders(origin) },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load analytics summary' },
      { status: 500, headers: corsHeaders(origin) },
    );
  }
}
