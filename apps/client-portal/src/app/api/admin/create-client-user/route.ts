import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

/**
 * Admin API — Create client user accounts
 * POST /api/admin/create-client-user
 */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const decoded = await adminAuth.verifyIdToken(token);
        if (decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { email, password, displayName, clientId } = await req.json();
        if (!email || !password || !clientId) {
            return NextResponse.json({ error: 'Missing email, password, or clientId' }, { status: 400 });
        }

        const user = await adminAuth.createUser({
            email, password, displayName: displayName || email, emailVerified: true,
        });

        await adminAuth.setCustomUserClaims(user.uid, { role: 'client', clientId });

        await adminDb.collection('users').doc(user.uid).set({
            email, displayName: displayName || email, role: 'client', clientId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ uid: user.uid, email, clientId });
    } catch (err: any) {
        console.error('Create client user error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
