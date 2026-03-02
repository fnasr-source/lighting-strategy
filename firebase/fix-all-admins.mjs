import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
if (!getApps().length) {
    const sa = JSON.parse(readFileSync(join(__dirname, 'service-account.json'), 'utf8'));
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();
const auth = getAuth();

const OWNER_PERMS = [
    'clients:read', 'clients:write', 'invoices:read', 'invoices:write',
    'payments:read', 'payments:write', 'leads:read', 'leads:write',
    'proposals:read', 'proposals:write', 'reports:read', 'reports:write',
    'campaigns:read', 'campaigns:write', 'communications:read', 'communications:write',
    'settings:read', 'settings:write', 'team:read', 'team:write',
    'billing:read', 'billing:write',
];

(async () => {
    const users = await auth.listUsers(20);
    for (const u of users.users) {
        const email = u.email || '';
        if (!email.endsWith('@admireworks.com')) continue;

        console.log(`\nFixing: ${email} (${u.uid})`);

        // Set profile to owner
        await db.collection('userProfiles').doc(u.uid).set({
            uid: u.uid,
            email,
            displayName: u.displayName || email.split('@')[0],
            role: 'owner',
            permissions: OWNER_PERMS,
            isActive: true,
            lastLoginAt: new Date().toISOString(),
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`  ✅ UserProfile → owner (${OWNER_PERMS.length} permissions)`);

        // Set custom claims
        await auth.setCustomUserClaims(u.uid, { role: 'owner' });
        console.log(`  ✅ Custom claims → { role: 'owner' }`);
    }

    // Verify
    console.log('\n=== Verification ===');
    const profiles = await db.collection('userProfiles').get();
    profiles.docs.forEach(d => {
        const data = d.data();
        console.log(`  ${data.email}: role=${data.role}, perms=${(data.permissions || []).length}`);
    });

    console.log('\n✨ Done! Sign out and back in to see all sections.');
})();
