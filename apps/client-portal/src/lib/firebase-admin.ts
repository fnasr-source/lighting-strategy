/**
 * Firebase Admin SDK — lazy initialization
 * 
 * CRITICAL: Must NOT initialize at module load time because during `next build`
 * Application Default Credentials (ADC) are not available. Instead, we use
 * lazy getters that only initialize when first accessed at runtime.
 */
import admin from 'firebase-admin';

function initAdmin(): admin.app.App {
    if (admin.apps.length > 0) return admin.apps[0]!;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        try {
            const fs = require('fs');
            const path = require('path');
            const saPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
            const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            return admin.initializeApp({
                credential: admin.credential.cert(sa),
                projectId: sa.project_id,
            });
        } catch { /* fall through to ADC */ }
    }

    return admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'admireworks---internal-os',
    });
}

// Lazy getters — only init on first runtime access, NOT at build time
export function getAdminAuth() {
    return admin.auth(initAdmin());
}

export function getAdminDb() {
    return admin.firestore(initAdmin());
}

// Legacy exports for compatibility (lazy)
export const adminAuth = new Proxy({} as ReturnType<typeof admin.auth>, {
    get: (_, prop) => (getAdminAuth() as any)[prop],
});

export const adminDb = new Proxy({} as ReturnType<typeof admin.firestore>, {
    get: (_, prop) => (getAdminDb() as any)[prop],
});
