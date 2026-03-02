/**
 * Firebase Admin SDK — used ONLY in server-side code (API routes, server components)
 * 
 * In production (App Hosting): Uses Application Default Credentials (ADC)
 * In local dev: Falls back to service account file
 */
import admin from 'firebase-admin';

function getAdminApp() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    // In App Hosting, ADC works automatically — no service account file needed
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        // Local development — load from file
        const { readFileSync } = require('fs');
        const { resolve } = require('path');
        const saPath = resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
    }

    // Cloud environment — use Application Default Credentials
    return admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'admireworks---internal-os',
    });
}

const adminApp = getAdminApp();
const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);

export { adminApp, adminAuth, adminDb };
