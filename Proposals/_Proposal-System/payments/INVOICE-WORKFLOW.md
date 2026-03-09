# Invoice Workflow — IDE Process Guide

> **Purpose:** Step-by-step guide for creating, hosting, and managing client invoices.  
> Any IDE tool working on this project should follow this workflow.

---

## Overview

Admireworks has **two invoice systems** that work together:

| System | Location | Purpose | URL Pattern |
|--------|----------|---------|-------------|
| **Static HTML Invoices** | `Proposals/{Client}/invoices/{INVOICE_NUM}/invoice.html` | Self-contained invoice pages with CSS, hosted on ops.admireworks.com | `ops.admireworks.com/Proposals/{Client}/invoices/{NUM}/invoice.html` |
| **Client Portal Invoices** | `apps/client-portal/` (Firestore-backed) | Dynamic invoices with built-in payment (Stripe + InstaPay), hosted on my.admireworks.com | `my.admireworks.com/invoice/{FIRESTORE_DOC_ID}` |

### When to Use Which

- **Static HTML** → For proposals and initial offers (self-contained, no backend needed)
- **Client Portal** → For recurring invoices, payment processing, and admin tracking

**Best practice:** Create BOTH. The static HTML serves as the proposal invoice, and the Firestore invoice enables payment processing via the client portal.

---

## Step 1: Determine Invoice Number

Format: `AWI-{YYYYMM}-{SEQ}`

1. Check `Proposals/_Proposal-System/payments/invoice-registry.csv` for the latest sequence
2. Increment the sequence number (e.g., if last is `AWI-202603-002`, next is `AWI-202603-003`)
3. Reference: `Proposals/_Proposal-System/payments/INVOICE-NUMBERING.md`

---

## Step 2: Determine Pricing

1. Reference `Proposals/_Proposal-System/PRICING-STRUCTURE.md` for standard rates
2. Apply any promotional pricing (free months, discounts, waived setup fees)
3. If a later meeting changed the commercial structure, invoice the **agreed meeting terms**, not the older proposal anchors
4. When the client accepted because of a safer launch structure:
   - show the original commercial anchor where useful,
   - show the agreed price,
   - make the amount due now obvious
3. **UGC Video pricing:**
   - Inside package (Creative Pack): 22,000 EGP / 8 = **2,750 EGP per video**
   - Outside package (standalone): **5,500 EGP per video** (2× in-package rate)
4. Check client's country to determine currency (Egypt = EGP, Saudi = SAR, UAE = AED)

---

## Step 3: Determine Payment Method

| Client Country | Payment Method | Details |
|----------------|---------------|---------|
| **Egypt** | InstaPay primary, card fallback in portal | Static invoice/email should lead with InstaPay. Client portal may default to InstaPay while keeping card available. |
| **Saudi Arabia / UAE / International** | Stripe + optional InstaPay | Create Stripe payment link via dashboard or API |

### Creating Stripe Payment Links (non-Egypt clients)

1. Go to Stripe Dashboard → Products → Create Product
2. Set the product name, price, and currency
3. Generate a Payment Link from the product
4. Update `Proposals/_Proposal-System/payments/payment-links.csv` with the new link
5. Reference: `Proposals/_Proposal-System/payments/STRIPE-CONFIG.md`

> **Important:** For Egypt clients, static invoice artifacts should emphasize InstaPay. In the client portal, default the payment method to InstaPay and only keep card as a fallback when explicitly allowed.

---

## Step 4: Create Static HTML Invoice

1. Copy the template: `Proposals/_Proposal-System/payments/templates/invoice-template.html`
2. Save to: `Proposals/{Client}/invoices/{INVOICE_NUM}/invoice.html`
3. Link CSS: `../../../_Proposal-System/payments/payment-pages.css`
4. Fill in all placeholders:
   - Client name, company, country
   - Invoice number, dates
   - Line items with descriptions, quantities, rates, amounts
5. For promotional items:
   - Add class `line-free` to `<tr>` for FREE items
   - Add class `line-discount` for discounted items
   - Use `<span class="promo-badge">FREE</span>` or `<span class="promo-badge discount">40% OFF</span>`
   - Show original price with `<span class="original-price">X EGP</span>`
6. Add optional extras section with JavaScript for dynamic total recalculation
7. Add appropriate payment CTA (InstaPay for Egypt, Stripe for others)

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.line-free` | Row with FREE item (greyed out) |
| `.line-discount` | Row with discounted price |
| `.promo-badge` | Green badge (FREE/BONUS/WAIVED) |
| `.promo-badge.discount` | Gold badge (% OFF) |
| `.original-price` | Strikethrough original price |
| `.free-label` | Green "FREE" text |
| `.savings-row` | Green banner showing total savings |
| `.extra-item` | Optional add-on with checkbox |

---

## Step 5: Create Firestore Invoice (Client Portal)

The client portal at `my.admireworks.com` uses Firestore for invoice data. Create the invoice via:

### Option A: Admin Dashboard UI
1. Go to `my.admireworks.com/dashboard/invoices`
2. Click "New Invoice" button
3. Fill in client, service, amount, currency, due date
4. The system auto-generates a shareable link: `my.admireworks.com/invoice/{DOC_ID}`

### Option B: Direct Firestore Write
Create a document in the `invoices` collection with this schema:

```json
{
  "invoiceNumber": "AWI-202603-003",
  "clientId": "BSQ-001",
  "clientName": "Basseqat — Eng. Khaled Nasseredin",
  "lineItems": [
    { "description": "Full Growth Partnership — Setup Fee", "qty": 1, "rate": 35000, "amount": 35000 },
    { "description": "Full Growth Partnership — Month 1 Retainer", "qty": 1, "rate": 32500, "amount": 32500 },
    { "description": "Reply Management — Setup & Integration (WAIVED)", "qty": 1, "rate": 12500, "amount": 0 },
    { "description": "Reply Management — Month 1 (FREE)", "qty": 1, "rate": 5000, "amount": 0 },
    { "description": "Reply Management — Month 2 (FREE)", "qty": 1, "rate": 5000, "amount": 0 },
    { "description": "CRM System — Setup & Integration (40% OFF)", "qty": 1, "rate": 7500, "amount": 4500 },
    { "description": "CRM System — Month 1 (FREE)", "qty": 1, "rate": 3500, "amount": 0 },
    { "description": "1× UGC Video — Welcome Bonus (FREE)", "qty": 1, "rate": 5500, "amount": 0 }
  ],
  "subtotal": 106500,
  "discount": 34500,
  "discountLabel": "Launch Promotion Savings",
  "tax": 0,
  "totalDue": 72000,
  "currency": "EGP",
  "status": "pending",
  "issuedAt": "2026-03-03",
  "dueDate": "2026-03-10",
  "notes": "Option 3 + Reply Mgmt (setup waived + 2mo free) + CRM (40% off + 1mo free) + 1 UGC bonus"
}
```

### Client Portal Invoice Features
- **`amount: 0` with `rate > 0`** → Renders as strikethrough price + "FREE" badge
- **`amount < rate × qty`** → Use for agreed discounted pricing while keeping the original anchor visible in the UI
- **`discount > 0`** → Shows discount row in totals
- **EGP currency** → Shows InstaPay + Card payment toggle
- **Non-EGP** → Shows Card payment only
- Public URL: `my.admireworks.com/invoice/{FIRESTORE_DOC_ID}`

### Recommended Client Portal Pattern For Revised Commercials

When the final agreement changed pricing after the proposal:

1. Set each revised line item with:
   - `rate = original anchor`
   - `amount = agreed payable amount`
2. Use invoice-level `discount` and `discountLabel` when the total is intentionally reduced.
3. Add one informational `0 amount` line for future schedule or review language when needed.
4. Use `billingClarity` to answer:
   - what is due now,
   - what this payment covers,
   - what happens next,
   - what is excluded from this amount.

---

## Step 6: Update Registries

After creating the invoice, update these files:

### `Proposals/_Proposal-System/payments/invoice-registry.csv`
Add a row with: invoice_number, date, due_date, client_id, client_name, service, amount, currency, status, notes

### `Proposals/_Proposal-System/payments/client-directory.csv`
Add/update client entry with: client_id, name, company, country, contact details, service, amount, currency, billing

### `Proposals/_Proposal-System/payments/INVOICE-PATTERNS.md`
Add any new line item patterns (e.g., CRM add-on, promotional pricing)

---

## Step 7: Create Follow-Up Email

1. Create at: `Proposals/{Client}/communications/{DATE}-recommended-follow-up-email.md`
2. Follow the simple, direct style — reference existing emails:
   - `Proposals/MHK-Architects/communications/` for examples
3. Include:
   - Invoice link (client portal URL preferred: `my.admireworks.com/invoice/{ID}`)
   - Agreement link when using a one-page final-terms summary
   - Payment instructions only as needed (InstaPay for Egypt, Stripe for others)
   - Clear next step (payment → kickoff)

### Lean Email Rule

If the invoice and agreement already explain the commercials clearly:
- do not restate every pricing detail in the email,
- send a short operational email with the links only,
- let the invoice carry the detail.

---

## File Structure Example

```
Proposals/
  {Client}/
    meetings/
      {DATE}-meeting-transcript.md
    invoices/
      AWI-{YYYYMM}-{SEQ}/
        invoice.html            ← Static HTML invoice
    communications/
      {DATE}-recommended-follow-up-email.md
    v1/
      index.html                ← Original proposal
  _Proposal-System/
    payments/
      invoice-registry.csv      ← All invoices
      client-directory.csv      ← All clients
      payment-links.csv         ← Stripe payment links
      INVOICE-NUMBERING.md      ← Numbering rules
      INVOICE-PATTERNS.md       ← Line item patterns
      STRIPE-CONFIG.md          ← Stripe setup
      PRICING-STRUCTURE.md      ← Standard pricing
      payment-pages.css         ← Shared CSS
      templates/
        invoice-template.html   ← HTML template
```

---

## Quick Reference: Pricing Rules

| Rule | Details |
|------|---------|
| UGC in-package | 2,750 EGP per video (22,000 ÷ 8) |
| UGC standalone | 5,500 EGP per video (2× in-package) |
| CRM Setup | 7,500 EGP standard |
| CRM Monthly | 3,500 EGP/mo standard |
| Reply Mgmt Setup | 12,500 EGP standard |
| Reply Mgmt Monthly | 5,000 EGP/mo standard |
| Egypt payment | InstaPay ONLY |
| Non-Egypt payment | Stripe (create payment link first) |
