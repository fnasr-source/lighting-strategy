/**
 * Server-side secrets resolver
 * Reads from env vars first, falls back to Firestore systemConfig/secrets
 */

let cachedSecrets: Record<string, string> | null = null;

export async function getSecret(key: string): Promise<string> {
    // 1. Check environment variables first
    if (process.env[key]) return process.env[key]!;

    // 2. Check cache
    if (cachedSecrets && cachedSecrets[key]) return cachedSecrets[key];

    // 3. Fall back to Firestore
    try {
        const { getAdminDb } = await import('@/lib/firebase-admin');
        const db = getAdminDb();
        const doc = await db.collection('systemConfig').doc('secrets').get();
        if (doc.exists) {
            cachedSecrets = doc.data() as Record<string, string>;
            if (cachedSecrets[key]) return cachedSecrets[key];
        }
    } catch (err) {
        console.error('Failed to read secrets from Firestore:', err);
    }

    return '';
}
