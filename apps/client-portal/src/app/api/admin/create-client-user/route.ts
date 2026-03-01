import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin API — Create client user accounts
 * POST /api/admin/create-client-user
 * Body: { email, password, displayName, clientId }
 */
export async function POST(req: NextRequest) {
    try {
        const admin = (await import('firebase-admin')).default;
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');

        if (admin.apps.length === 0) {
            const saPath = resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../../firebase/service-account.json');
            const sa = JSON.parse(readFileSync(saPath, 'utf8'));
            admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
        }

        // Verify the caller is admin via their ID token
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        if (decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { email, password, displayName, clientId } = await req.json();
        if (!email || !password || !clientId) {
            return NextResponse.json({ error: 'Missing email, password, or clientId' }, { status: 400 });
        }

        // Create user
        const user = await admin.auth().createUser({
            email,
            password,
            displayName: displayName || email,
            emailVerified: true,
        });

        // Set custom claims for client role
        await admin.auth().setCustomUserClaims(user.uid, {
            role: 'client',
            clientId,
        });

        // Create user record in Firestore
        await admin.firestore().collection('users').doc(user.uid).set({
            email,
            displayName: displayName || email,
            role: 'client',
            clientId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ uid: user.uid, email, clientId });
    } catch (err: any) {
        console.error('Create client user error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
