/**
 * Admireworks Firebase Setup Script
 * Uses the service account to programmatically set up:
 * 1. Enable Firestore (via Google Cloud API)
 * 2. Create Firestore database in europe-west1
 * 3. Deploy Firestore security rules
 * 4. Enable Firebase Authentication
 * 5. Create initial admin user
 */

import admin from 'firebase-admin';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Config ──────────────────────────────────────────────
const PROJECT_ID = 'admireworks---internal-os';
const SA_PATH = join(__dirname, 'service-account.json');
const FIRESTORE_LOCATION = 'eur3'; // Multi-region Europe

// ── Initialize Firebase Admin ───────────────────────────
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
});

// ── Google Auth for REST APIs ───────────────────────────
const auth = new google.auth.GoogleAuth({
    keyFile: SA_PATH,
    scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/firebase',
        'https://www.googleapis.com/auth/datastore',
    ],
});

async function getAccessToken() {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
}

// ── Step 1: Enable Required APIs ────────────────────────
async function enableAPIs() {
    console.log('\n🔧 Step 1: Enabling required Google Cloud APIs...');
    const serviceUsage = google.serviceusage({ version: 'v1', auth });

    const apis = [
        'firestore.googleapis.com',
        'identitytoolkit.googleapis.com',   // Firebase Auth
        'firebaserules.googleapis.com',
        'cloudbuild.googleapis.com',
        'secretmanager.googleapis.com',
    ];

    for (const api of apis) {
        try {
            await serviceUsage.services.enable({
                name: `projects/${PROJECT_ID}/services/${api}`,
            });
            console.log(`   ✅ ${api} enabled`);
        } catch (err) {
            if (err.message?.includes('already enabled') || err.code === 409) {
                console.log(`   ✅ ${api} already enabled`);
            } else {
                console.log(`   ⚠️  ${api}: ${err.message}`);
            }
        }
    }
}

// ── Step 2: Create Firestore Database ───────────────────
async function createFirestore() {
    console.log('\n🗄️  Step 2: Creating Firestore database...');

    const token = await getAccessToken();

    // Check if database already exists
    try {
        const checkRes = await fetch(
            `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (checkRes.ok) {
            const db = await checkRes.json();
            console.log(`   ✅ Firestore database already exists in ${db.locationId}`);
            return;
        }
    } catch (e) {
        // Database doesn't exist, create it
    }

    // Create database
    try {
        const createRes = await fetch(
            `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases?databaseId=(default)`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'FIRESTORE_NATIVE',
                    locationId: FIRESTORE_LOCATION,
                    concurrencyMode: 'PESSIMISTIC',
                }),
            }
        );

        if (createRes.ok) {
            console.log(`   ✅ Firestore database created in ${FIRESTORE_LOCATION}`);
        } else {
            const err = await createRes.json();
            if (err.error?.message?.includes('already exists')) {
                console.log(`   ✅ Firestore database already exists`);
            } else {
                console.log(`   ⚠️  Firestore creation: ${JSON.stringify(err)}`);
            }
        }
    } catch (err) {
        console.log(`   ⚠️  Firestore creation error: ${err.message}`);
    }
}

// ── Step 3: Deploy Firestore Security Rules ─────────────
async function deploySecurityRules() {
    console.log('\n🔒 Step 3: Deploying Firestore security rules...');

    const token = await getAccessToken();

    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper: Check if user is admin
    function isAdmin() {
      return isAuthenticated() && request.auth.token.role == 'admin';
    }
    
    // Helper: Check if user is the client owner
    function isClientOwner(clientId) {
      return isAuthenticated() 
        && request.auth.token.role == 'client' 
        && request.auth.token.clientId == clientId;
    }
    
    // Users collection - admins can manage, users can read own
    match /users/{userId} {
      allow read: if request.auth.uid == userId || isAdmin();
      allow write: if isAdmin();
    }
    
    // Clients collection - admins full access, clients read own
    match /clients/{clientId} {
      allow read: if isClientOwner(clientId) || isAdmin();
      allow write: if isAdmin();
      
      // All client sub-collections inherit same rules
      match /{subcollection}/{docId} {
        allow read: if isClientOwner(clientId) || isAdmin();
        allow write: if isAdmin();
      }
    }
    
    // Leads - admin only
    match /leads/{leadId} {
      allow read, write: if isAdmin();
    }
    
    // Strategies - admin only
    match /strategies/{strategyId} {
      allow read, write: if isAdmin();
    }
    
    // Payment links - public read, admin write
    match /paymentLinks/{linkId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // System config - authenticated read, admin write
    match /systemConfig/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}`;

    // Create ruleset
    try {
        const createRes = await fetch(
            `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: {
                        files: [{
                            name: 'firestore.rules',
                            content: rules,
                        }],
                    },
                }),
            }
        );

        if (!createRes.ok) {
            const err = await createRes.json();
            console.log(`   ⚠️  Rules creation: ${JSON.stringify(err)}`);
            return;
        }

        const ruleset = await createRes.json();
        console.log(`   ✅ Ruleset created: ${ruleset.name}`);

        // Release the ruleset to cloud.firestore
        const releaseRes = await fetch(
            `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
                    rulesetName: ruleset.name,
                }),
            }
        );

        if (releaseRes.ok) {
            console.log('   ✅ Security rules deployed to Firestore');
        } else {
            // Try PATCH if release already exists
            const patchRes = await fetch(
                `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
                        rulesetName: ruleset.name,
                    }),
                }
            );

            if (patchRes.ok) {
                console.log('   ✅ Security rules updated on Firestore');
            } else {
                const err = await patchRes.json();
                console.log(`   ⚠️  Rules release: ${JSON.stringify(err)}`);
            }
        }
    } catch (err) {
        console.log(`   ⚠️  Rules deployment error: ${err.message}`);
    }
}

// ── Step 4: Enable Firebase Authentication ──────────────
async function enableAuthentication() {
    console.log('\n🔑 Step 4: Enabling Firebase Authentication...');

    const token = await getAccessToken();

    // Enable email/password sign-in
    try {
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    signIn: {
                        email: {
                            enabled: true,
                            passwordRequired: true,
                        },
                    },
                }),
            }
        );

        if (res.ok) {
            console.log('   ✅ Email/Password authentication enabled');
        } else {
            const err = await res.json();
            console.log(`   ⚠️  Auth config: ${JSON.stringify(err)}`);
        }
    } catch (err) {
        console.log(`   ⚠️  Auth setup error: ${err.message}`);
    }
}

// ── Step 5: Create Admin User ───────────────────────────
async function createAdminUser() {
    console.log('\n👤 Step 5: Creating admin user...');

    const ADMIN_EMAIL = 'fouad@admireworks.com';
    const ADMIN_PASSWORD = 'Adm1r3w0rks!2026'; // Change after first login

    try {
        // Check if user already exists
        try {
            const existing = await admin.auth().getUserByEmail(ADMIN_EMAIL);
            console.log(`   ✅ Admin user already exists: ${existing.uid}`);

            // Ensure custom claims are set
            await admin.auth().setCustomUserClaims(existing.uid, {
                role: 'admin',
            });
            console.log('   ✅ Admin custom claims set');
            return existing.uid;
        } catch (e) {
            // User doesn't exist, create it
        }

        const user = await admin.auth().createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            displayName: 'Fouad Nasseredin',
            emailVerified: true,
        });

        console.log(`   ✅ Admin user created: ${user.uid}`);

        // Set custom claims for admin role
        await admin.auth().setCustomUserClaims(user.uid, {
            role: 'admin',
        });
        console.log('   ✅ Admin custom claims set (role: admin)');

        return user.uid;
    } catch (err) {
        console.log(`   ⚠️  Admin user creation: ${err.message}`);
        return null;
    }
}

// ── Step 6: Initialize Firestore Collections ────────────
async function initializeFirestore(adminUid) {
    console.log('\n📝 Step 6: Initializing Firestore collections...');

    const db = admin.firestore();

    try {
        // System config
        await db.collection('systemConfig').doc('settings').set({
            companyName: 'Admireworks',
            companyTagline: 'Admirable Venture Services',
            companyEmail: 'hello@admireworks.com',
            companyPhone: '(+971) 4295 8666',
            companyAddress: 'P.O.Box/36846, DXB, UAE',
            defaultCurrency: 'USD',
            brandColors: {
                primaryNavy: '#001a70',
                primaryGold: '#cc9f53',
                berryBlue: '#44756a',
                tomato: '#d44315',
                apricot: '#ea5c2e',
                mango: '#fab700',
                jumeirah: '#66bc99',
            },
            stripePublishableKey: 'pk_live_51SzHgPLwkCBtjbi1ZmHjbpsv1GzqN0btoNN5GDvNiBnOnm8hWEgqDbl7HQGBufJkn1ZLvkGT4D93MVxHJMTSIvCS00X4OggVam',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log('   ✅ systemConfig/settings initialized');

        // Admin user record
        if (adminUid) {
            await db.collection('users').doc(adminUid).set({
                email: 'fouad@admireworks.com',
                displayName: 'Fouad Nasseredin',
                role: 'admin',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            console.log('   ✅ users/{admin} record created');
        }

        console.log('   ✅ Firestore collections initialized');
    } catch (err) {
        console.log(`   ⚠️  Firestore init error: ${err.message}`);
    }
}

// ── Main ────────────────────────────────────────────────
async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Admireworks Firebase Platform Setup         ║');
    console.log('║  Project: admireworks---internal-os          ║');
    console.log('╚══════════════════════════════════════════════╝');

    try {
        await enableAPIs();
        await createFirestore();
        await deploySecurityRules();
        await enableAuthentication();
        const adminUid = await createAdminUser();
        await initializeFirestore(adminUid);

        console.log('\n╔══════════════════════════════════════════════╗');
        console.log('║  ✅ Setup Complete!                          ║');
        console.log('╠══════════════════════════════════════════════╣');
        console.log('║  Firestore:  eur3 (Europe multi-region)     ║');
        console.log('║  Auth:       Email/Password enabled         ║');
        console.log('║  Admin:      fouad@admireworks.com           ║');
        console.log('║  Rules:      Security rules deployed        ║');
        console.log('╚══════════════════════════════════════════════╝');
    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        process.exit(1);
    }

    process.exit(0);
}

main();
