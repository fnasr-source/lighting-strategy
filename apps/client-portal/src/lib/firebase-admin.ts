/**
 * Firebase Admin SDK — used ONLY in server-side code (API routes, server components)
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function getAdminApp() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    // Load service account from path relative to project root
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        ? resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        : resolve(process.cwd(), '../../firebase/service-account.json');

    const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));

    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
    });
}

const adminApp = getAdminApp();
const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);

export { adminApp, adminAuth, adminDb };
