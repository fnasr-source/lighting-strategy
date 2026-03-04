import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'admireworks-cron-2026';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hostsSnap = await adminDb.collection('schedulingHosts').where('google.connected', '==', true).get();

    let processed = 0;
    let flagged = 0;

    for (const doc of hostsSnap.docs) {
      processed += 1;
      const host = doc.data() as any;
      const watchExpiration = host?.google?.watchExpiration ? new Date(host.google.watchExpiration).getTime() : 0;

      if (!watchExpiration || watchExpiration < Date.now() + 12 * 60 * 60 * 1000) {
        flagged += 1;
        await doc.ref.set(
          {
            google: {
              ...(host.google || {}),
              syncNeedsRenewal: true,
              lastSyncAt: new Date().toISOString(),
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      renewalFlagged: flagged,
      executedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync job failed' }, { status: 500 });
  }
}
