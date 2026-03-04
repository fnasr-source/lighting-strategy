import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const channelId = req.headers.get('x-goog-channel-id') || '';
    const resourceId = req.headers.get('x-goog-resource-id') || '';
    const state = req.headers.get('x-goog-resource-state') || '';
    const messageNumber = req.headers.get('x-goog-message-number') || '';

    const configuredToken = process.env.GOOGLE_WEBHOOK_SECRET || '';
    const receivedToken = req.headers.get('x-goog-channel-token') || '';

    if (configuredToken && configuredToken !== receivedToken) {
      return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 });
    }

    if (!channelId) {
      return NextResponse.json({ received: true, ignored: 'missing channel id' });
    }

    const hosts = await adminDb
      .collection('schedulingHosts')
      .where('google.channelId', '==', channelId)
      .get();

    if (!hosts.empty) {
      await Promise.all(
        hosts.docs.map((doc) =>
          doc.ref.set(
            {
              google: {
                ...(doc.data().google || {}),
                resourceId: resourceId || doc.data().google?.resourceId || '',
                lastSyncAt: new Date().toISOString(),
                lastWebhookState: state,
                lastWebhookMessageNumber: messageNumber,
              },
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
        ),
      );
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
