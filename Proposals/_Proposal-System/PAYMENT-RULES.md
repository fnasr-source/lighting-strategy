# Payment Rules By Client Region

## Egypt Clients
Use Instapay details in proposal email and in the one-page proposal footer:
- Account Name: Fouad Nasseredin
- Instapay Account: admireworks@instapay
- Instapay Link: `https://ipn.eg/S/admireworks/instapay/5A1jri`

One-page placement standard:
- Add a subtle payment block at the lower section (`Decision & Kickoff` area).
- Keep it concise (single line or short two-line note).
- Include both account details and action link text: `👉 [Pay via Instapay](https://ipn.eg/S/admireworks/instapay/5A1jri)`.

## Non-Egypt Clients
Do not include Instapay section.
Include a Stripe payment link in the email body instead.

One-page placement standard:
- Add a subtle payment note indicating payment is processed through a provided payment link.

Link format:
- `👉 [Open Payment Link](PAYMENT_URL)`

---

## Stripe Payment Integration (All Markets)

### Overview
Stripe is used for international payment collection and as an option for all markets. Branded checkout pages display "Admireworks" to clients.

### Configuration
- Full Stripe setup reference: `payments/STRIPE-CONFIG.md`
- Invoice patterns & log: `payments/INVOICE-PATTERNS.md`
- Payment links registry: `payments/payment-links.csv`

### Package Pages (Shareable)
| Page | Path | Use |
|------|------|-----|
| Ad Campaign Management | `payments/packages/ad-campaign-management.html` | All 4 market tiers |
| Growth System | `payments/packages/growth-system.html` | Bulk vs Subscription |
| Growth & Funnel Packages | `payments/packages/growth-packages.html` | 3-tier + add-ons |

### Templates
| Template | Path | Use |
|----------|------|-----|
| Invoice | `payments/templates/invoice-template.html` | Per-client invoices |
| Payment Link Page | `payments/templates/payment-link-page.html` | Branded payment landing |

### Workflow for Creating a Payment Link
1. Create the product/price in Stripe Dashboard (if not already exists)
2. Generate a Payment Link in Stripe Dashboard
3. Copy the template from `payments/templates/`
4. Replace placeholders with client/invoice details
5. Place the file in `payments/invoices/{PROPOSAL-NUMBER}/`
6. Register the link in `payments/payment-links.csv`
7. Update `payments/INVOICE-PATTERNS.md` with the new entry
