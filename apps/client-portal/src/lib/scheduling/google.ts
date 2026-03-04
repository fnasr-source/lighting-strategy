import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { decryptSensitive, encryptSensitive } from '@/lib/scheduling/security';
import type { SchedulingHost } from '@/lib/scheduling/types';

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${baseUrl}/api/scheduling/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials');
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildGoogleOAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleOAuthConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  return await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google access token refresh failed: ${err}`);
  }

  return await res.json() as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };
}

async function googleApiRequest<T = Record<string, unknown>>(args: {
  accessToken: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
}): Promise<T> {
  const res = await fetch(`${GOOGLE_CALENDAR_BASE}${args.path}`, {
    method: args.method || 'GET',
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(typeof args.body !== 'undefined' ? { body: JSON.stringify(args.body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar request failed (${res.status}): ${text}`);
  }

  if (res.status === 204) return {} as T;
  return await res.json() as T;
}

export async function saveGoogleConnection(args: {
  uid: string;
  email: string;
  displayName: string;
  timezone?: string;
  accessToken: string;
  refreshToken?: string;
  expiresInSec: number;
  scope?: string;
}) {
  const hostRef = adminDb.collection('schedulingHosts').doc(args.uid);
  const snap = await hostRef.get();
  const existing = snap.exists ? (snap.data() as SchedulingHost) : null;

  const expiresAt = new Date(Date.now() + args.expiresInSec * 1000).toISOString();

  await hostRef.set({
    uid: args.uid,
    email: args.email,
    displayName: args.displayName,
    timezone: args.timezone || existing?.timezone || 'Asia/Dubai',
    active: true,
    defaultAvailability: existing?.defaultAvailability || [
      { weekday: 1, startTime: '09:00', endTime: '17:00' },
      { weekday: 2, startTime: '09:00', endTime: '17:00' },
      { weekday: 3, startTime: '09:00', endTime: '17:00' },
      { weekday: 4, startTime: '09:00', endTime: '17:00' },
      { weekday: 5, startTime: '09:00', endTime: '17:00' },
    ],
    google: {
      connected: true,
      calendarId: existing?.google?.calendarId || 'primary',
      accessTokenEnc: encryptSensitive(args.accessToken),
      refreshTokenEnc: args.refreshToken
        ? encryptSensitive(args.refreshToken)
        : existing?.google?.refreshTokenEnc,
      expiryDate: expiresAt,
      scope: args.scope || existing?.google?.scope,
      lastSyncAt: new Date().toISOString(),
      lastError: '',
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(snap.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
  }, { merge: true });
}

export async function getHostAccessToken(host: SchedulingHost): Promise<string | null> {
  if (!host.google?.connected || !host.google.accessTokenEnc) return null;

  try {
    const currentAccessToken = decryptSensitive(host.google.accessTokenEnc);
    const expiry = host.google.expiryDate ? new Date(host.google.expiryDate).getTime() : 0;

    if (expiry > Date.now() + 30_000) {
      return currentAccessToken;
    }

    if (!host.google.refreshTokenEnc) return currentAccessToken;

    const refreshToken = decryptSensitive(host.google.refreshTokenEnc);
    const refreshed = await refreshGoogleAccessToken(refreshToken);

    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    await adminDb.collection('schedulingHosts').doc(host.uid).set({
      google: {
        ...(host.google || {}),
        connected: true,
        accessTokenEnc: encryptSensitive(refreshed.access_token),
        expiryDate: newExpiry,
        scope: refreshed.scope || host.google.scope,
        lastSyncAt: new Date().toISOString(),
        lastError: '',
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return refreshed.access_token;
  } catch (err: unknown) {
    await adminDb.collection('schedulingHosts').doc(host.uid).set({
      google: {
        ...(host.google || {}),
        lastError: err instanceof Error ? err.message : 'Google token refresh failed',
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return null;
  }
}

export async function getGoogleBusyRanges(args: {
  host: SchedulingHost;
  timeMin: string;
  timeMax: string;
}): Promise<Array<{ start: string; end: string }>> {
  const accessToken = await getHostAccessToken(args.host);
  if (!accessToken) return [];

  const calendarId = args.host.google?.calendarId || 'primary';

  const result = await googleApiRequest<{
    calendars: Record<string, { busy?: Array<{ start: string; end: string }> }>;
  }>({
    accessToken,
    method: 'POST',
    path: '/freeBusy',
    body: {
      timeMin: args.timeMin,
      timeMax: args.timeMax,
      items: [{ id: calendarId }],
    },
  });

  return result.calendars?.[calendarId]?.busy || [];
}

export async function createGoogleCalendarEvent(args: {
  host: SchedulingHost;
  summary: string;
  description: string;
  startAt: string;
  endAt: string;
  inviteeEmail: string;
  inviteeName: string;
  timezone: string;
}): Promise<{ eventId: string; meetLink?: string } | null> {
  const accessToken = await getHostAccessToken(args.host);
  if (!accessToken) return null;

  const calendarId = args.host.google?.calendarId || 'primary';
  const requestId = `aw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const event = await googleApiRequest<{
    id: string;
    hangoutLink?: string;
  }>({
    accessToken,
    method: 'POST',
    path: `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    body: {
      summary: args.summary,
      description: args.description,
      start: { dateTime: args.startAt, timeZone: args.timezone },
      end: { dateTime: args.endAt, timeZone: args.timezone },
      attendees: [{ email: args.inviteeEmail, displayName: args.inviteeName }],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  });

  return {
    eventId: event.id,
    meetLink: event.hangoutLink,
  };
}

export async function patchGoogleCalendarEvent(args: {
  host: SchedulingHost;
  eventId: string;
  startAt: string;
  endAt: string;
  timezone: string;
}): Promise<void> {
  const accessToken = await getHostAccessToken(args.host);
  if (!accessToken) return;

  const calendarId = args.host.google?.calendarId || 'primary';

  await googleApiRequest({
    accessToken,
    method: 'PATCH',
    path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(args.eventId)}`,
    body: {
      start: { dateTime: args.startAt, timeZone: args.timezone },
      end: { dateTime: args.endAt, timeZone: args.timezone },
    },
  });
}

export async function cancelGoogleCalendarEvent(args: {
  host: SchedulingHost;
  eventId: string;
}): Promise<void> {
  const accessToken = await getHostAccessToken(args.host);
  if (!accessToken) return;

  const calendarId = args.host.google?.calendarId || 'primary';

  try {
    await googleApiRequest({
      accessToken,
      method: 'DELETE',
      path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(args.eventId)}`,
    });
  } catch {
    // Ignore not found/deleted events
  }
}
