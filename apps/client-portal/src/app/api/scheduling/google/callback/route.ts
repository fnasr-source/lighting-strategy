import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { exchangeGoogleCode, saveGoogleConnection, verifySignedState } from '@/lib/scheduling';

export async function GET(req: NextRequest) {
  const defaultRedirect = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard/scheduling`;

  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(`${defaultRedirect}?google=error&reason=missing_code_or_state`);
    }

    const parsed = verifySignedState<{ uid: string; email?: string; returnTo?: string; ts?: string }>(state);
    if (!parsed?.uid) {
      return NextResponse.redirect(`${defaultRedirect}?google=error&reason=invalid_state`);
    }

    const ts = Number(parsed.ts || 0);
    if (!ts || Date.now() - ts > 15 * 60_000) {
      return NextResponse.redirect(`${defaultRedirect}?google=error&reason=expired_state`);
    }

    const tokenSet = await exchangeGoogleCode(code);

    const profileSnap = await adminDb.collection('userProfiles').doc(parsed.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : {};

    await saveGoogleConnection({
      uid: parsed.uid,
      email: String(profile?.email || parsed.email || ''),
      displayName: String(profile?.displayName || parsed.email || 'Team Member'),
      timezone: String(profile?.timezone || 'Asia/Dubai'),
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresInSec: tokenSet.expires_in,
      scope: tokenSet.scope,
    });

    const targetPath = parsed.returnTo || '/dashboard/scheduling';
    const target = `${process.env.NEXT_PUBLIC_BASE_URL || ''}${targetPath}?google=connected`;
    return NextResponse.redirect(target);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    return NextResponse.redirect(`${defaultRedirect}?google=error&reason=${encodeURIComponent(message)}`);
  }
}
