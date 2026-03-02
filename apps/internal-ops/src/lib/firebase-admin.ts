import admin from 'firebase-admin';

function initAdmin(): admin.app.App {
    if (admin.apps.length > 0) return admin.apps[0]!;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        try {
            const fs = require('fs');
            const path = require('path');
            const saPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
            const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            return admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
        } catch { /* fall through */ }
    }
    return admin.initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'admireworks---internal-os' });
}

export function getAdminAuth() { return admin.auth(initAdmin()); }
export function getAdminDb() { return admin.firestore(initAdmin()); }

export const adminAuth = new Proxy({} as ReturnType<typeof admin.auth>, { get: (_, p) => (getAdminAuth() as any)[p] });
export const adminDb = new Proxy({} as ReturnType<typeof admin.firestore>, { get: (_, p) => (getAdminDb() as any)[p] });
