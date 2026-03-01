/**
 * Fix Firestore Security Rules — update to properly handle admin claims
 * Run: cd firebase && node fix-rules.js
 */
import admin from 'firebase-admin';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ID = 'admireworks---internal-os';
const SA_PATH = join(__dirname, 'service-account.json');

const auth = new google.auth.GoogleAuth({
    keyFile: SA_PATH,
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
});

async function deployRules() {
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    // Updated rules: properly handle admin and client roles
    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && request.auth.token.role == 'admin';
    }
    
    function isClientOwner(clientId) {
      return isAuthenticated() 
        && request.auth.token.role == 'client' 
        && request.auth.token.clientId == clientId;
    }
    
    // Users — admins manage, users read own
    match /users/{userId} {
      allow read: if request.auth.uid == userId || isAdmin();
      allow write: if isAdmin();
    }
    
    // Clients — admins full, clients read own
    match /clients/{clientId} {
      allow read: if isAdmin() || isClientOwner(clientId);
      allow create, update, delete: if isAdmin();
      
      match /{subcollection}/{docId} {
        allow read: if isAdmin() || isClientOwner(clientId);
        allow write: if isAdmin();
      }
    }
    
    // Invoices — admins full, clients read own invoices
    match /invoices/{invoiceId} {
      allow read: if isAdmin() || 
        (isAuthenticated() && request.auth.token.role == 'client' && resource.data.clientId == request.auth.token.clientId);
      allow create, update, delete: if isAdmin();
    }
    
    // Payments — admins full, clients read own payments
    match /payments/{paymentId} {
      allow read: if isAdmin() ||
        (isAuthenticated() && request.auth.token.role == 'client' && resource.data.clientId == request.auth.token.clientId);
      allow create, update, delete: if isAdmin();
    }
    
    // Leads — admin only
    match /leads/{leadId} {
      allow read, write: if isAdmin();
    }
    
    // Proposals — admin only
    match /proposals/{proposalId} {
      allow read, write: if isAdmin();
    }
    
    // Strategies — admin only
    match /strategies/{strategyId} {
      allow read, write: if isAdmin();
    }
    
    // Payment links — public read, admin write
    match /paymentLinks/{linkId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // System config — authenticated read, admin write
    match /systemConfig/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}`;

    // Create ruleset
    const createRes = await fetch(
        `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: rules }] } }),
        }
    );

    if (!createRes.ok) {
        const err = await createRes.json();
        console.error('Failed to create ruleset:', err);
        return;
    }

    const ruleset = await createRes.json();
    console.log('✅ Ruleset created:', ruleset.name);

    // Update release
    const patchRes = await fetch(
        `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
        {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `projects/${PROJECT_ID}/releases/cloud.firestore`, rulesetName: ruleset.name }),
        }
    );

    if (patchRes.ok) {
        console.log('✅ Security rules updated on Firestore');
    } else {
        const err = await patchRes.json();
        console.error('Failed to update release:', err);
    }
}

deployRules().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
