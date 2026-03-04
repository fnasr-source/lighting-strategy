import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleOAuthUrl, createSignedState } from '@/lib/scheduling';
import { isSchedulingManager, verifyApiUser } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiUser(req.headers.get('authorization'));
    if (!user || !isSchedulingManager(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const returnTo = String(body?.returnTo || '/dashboard/scheduling');

    const state = createSignedState({
      uid: user.uid,
      email: user.email || '',
      role: user.role || '',
      returnTo,
      ts: Date.now().toString(),
    });

    const url = buildGoogleOAuthUrl(state);
    return NextResponse.json({ success: true, url });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to initialize Google OAuth' }, { status: 500 });
  }
}
