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
        const actorProfile = await adminDb.collection('userProfiles').doc(decoded.uid).get();
        const actorRole = actorProfile.data()?.role || decoded.role;
        if (!['owner', 'admin'].includes(actorRole)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { email, password, displayName, clientId, clientIds } = await req.json();
        const linkedClientIds = Array.isArray(clientIds)
            ? clientIds.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
            : (typeof clientId === 'string' && clientId ? [clientId] : []);
        if (!email || !password || linkedClientIds.length === 0) {
            return NextResponse.json({ error: 'Missing email, password, or client access list' }, { status: 400 });
        }

        const user = await adminAuth.createUser({
            email, password, displayName: displayName || email, emailVerified: true,
        });

        await adminAuth.setCustomUserClaims(user.uid, { role: 'client', clientId: linkedClientIds[0] });

        await adminDb.collection('userProfiles').doc(user.uid).set({
            uid: user.uid,
            email,
            displayName: displayName || email,
            role: 'client',
            permissions: ['invoices:read', 'payments:read', 'reports:read', 'campaigns:read', 'communications:read', 'performance:read'],
            linkedClientId: linkedClientIds[0],
            linkedClientIds,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ uid: user.uid, email, clientIds: linkedClientIds });
    } catch (err: unknown) {
        console.error('Create client user error:', err);
        const message = err instanceof Error ? err.message : 'Failed to create client user';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
