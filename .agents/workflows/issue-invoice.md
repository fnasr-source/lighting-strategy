---
description: Create and send an invoice for a client
---

# Issue Invoice Workflow

## When to Use
When you need to create a new invoice — one-time or as part of a recurring billing setup.

## Prerequisites
- Client exists in `my.admireworks.com/dashboard/clients`
- Payment terms agreed (amount, currency, due date)

## Steps

1. **Create the invoice in the Portal**:
   - Navigate to `my.admireworks.com/dashboard/invoices`
   - Fill in: client, line items, amounts, currency, due date
   - Invoice number auto-generated: `AWI-{YYYYMM}-{SEQ}`

2. **Optionally create a static HTML invoice**:
   - Copy template from `ops/proposal-system/payments/templates/invoice-template.html`
   - Save to `clients/{Client-Name}/invoices/{invoice-number}.html`
   - Include interactive add-ons if applicable

3. **Configure payment method**:

| Region | Method | Action |
|---|---|---|
| Egypt (EGP) | InstaPay | Include account: `admireworks@instapay` (Fouad Nasseredin) |
| Egypt (Cards) | Paymob | Configure via Paymob dashboard |
| International | Stripe | Auto-handled by Portal |

4. **Register payment link** (if static):
   - Add entry to `ops/proposal-system/payments/payment-links.csv`
   - Log pattern in `ops/proposal-system/payments/INVOICE-PATTERNS.md`

5. **Send invoice email**:
   - Subject: `Admireworks x {Client Name} — Invoice {Number}`
   - Primary link: Portal invoice URL `my.admireworks.com/invoice/{id}`
   - Optional: Static HTML invoice link

6. **For recurring billing**:
   - Set up `recurringInvoices` template in Portal
   - Configure: frequency, billingDay, nextDueDate, autoSendEmail
   - Cron job handles auto-generation: `POST /api/cron/invoices`

## Payment Confirmation Flow
- **Step 1:** Client clicks "I Have Made Payment" → triggers "Payment Submitted" email
- **Step 2:** Admin verifies and marks paid → triggers "Payment Confirmed" receipt email
- **Stripe:** Automated receipt via webhook

## Generating Invoice PDF
```bash
# Use the generate-invoice-pdf workflow
# See: .agents/workflows/generate-invoice-pdf.md
```
