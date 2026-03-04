import { createHash } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

export async function checkRateLimit(options: {
  key: string;
  maxRequests: number;
  windowMinutes: number;
}): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = options.windowMinutes * 60 * 1000;
  const id = createHash('sha256').update(options.key).digest('hex');
  const ref = adminDb.collection('apiRateLimits').doc(id);

  let allowed = true;
  let remaining = options.maxRequests - 1;
  let resetAt = new Date(now + windowMs).toISOString();

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      tx.set(ref, {
        keyHash: id,
        count: 1,
        windowStart: now,
        windowMs,
        resetAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const data = snap.data() as { count?: number; windowStart?: number; windowMs?: number };
    const windowStart = Number(data.windowStart || 0);
    const elapsed = now - windowStart;

    if (elapsed >= windowMs) {
      tx.update(ref, {
        count: 1,
        windowStart: now,
        windowMs,
        resetAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      remaining = options.maxRequests - 1;
      return;
    }

    const currentCount = Number(data.count || 0);
    const nextCount = currentCount + 1;
    resetAt = new Date(windowStart + windowMs).toISOString();

    if (nextCount > options.maxRequests) {
      allowed = false;
      remaining = 0;
      return;
    }

    remaining = options.maxRequests - nextCount;

    tx.update(ref, {
      count: nextCount,
      resetAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { allowed, remaining, resetAt };
}
