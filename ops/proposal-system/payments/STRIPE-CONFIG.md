# Stripe Integration Configuration

> **Status:** Awaiting API keys from Fouad
> **Last Updated:** March 1, 2026

---

## Account Details

- **Stripe Account Name:** _(to be filled — different from Admireworks)_
- **Display Name (Branding):** Admireworks
- **Mode:** Test → Live (start in test mode)

---

## Branding Setup (Stripe Dashboard → Settings → Branding)

Configure these so clients see "Admireworks" on all checkout pages and receipts:

| Setting | Value |
|---------|-------|
| Business Name | `Admireworks` |
| Statement Descriptor | `ADMIREWORKS` (max 22 chars) |
| Brand Color | `#001a70` (Primary Navy) |
| Accent Color | `#cc9f53` (Primary Gold) |
| Logo | Upload `Strategies/Logo.png` |
| Icon | Upload `Strategies/Brandmark.png` |

---

## API Keys

### Live Mode (Active)
```
Publishable: pk_live_51SzHgPLwkCBtjbi1ZmHjbpsv1GzqN0btoNN5GDvNiBnOnm8hWEgqDbl7HQGBufJkn1ZLvkGT4D93MVxHJMTSIvCS00X4OggVam
Secret:      → Stored in payments/.env (gitignored)
```

> ⚠️ **The Secret Key is stored in `payments/.env` and must NEVER be committed to Git.**
> The Publishable Key is safe to use in client-side pages.

---

## Products & Prices (Stripe Dashboard)

Create these products in Stripe to generate Payment Links:

### Ad Campaign Management
| Product | Price ID | Amount | Currency | Billing |
|---------|----------|--------|----------|---------|
| Ad Campaign — Egypt | `price_xxx` | 12,500 | EGP | Monthly |
| Ad Campaign — UAE | `price_xxx` | 1,200 | AED | Monthly |
| Ad Campaign — KSA | `price_xxx` | 1,200 | SAR | Monthly |
| Ad Campaign — International | `price_xxx` | 330 | USD | Monthly |

### Growth System
| Product | Price ID | Amount | Currency | Billing |
|---------|----------|--------|----------|---------|
| Growth Assets — Bulk | `price_xxx` | 45,000 | EGP | One-time |
| Growth System — Subscription | `price_xxx` | 5,500 | EGP | Monthly |

### Growth Packages
| Product | Price ID | Amount | Currency | Billing |
|---------|----------|--------|----------|---------|
| Funnel Engine Only — Setup | `price_xxx` | 45,000 | EGP | One-time |
| Funnel Engine — Retainer | `price_xxx` | 7,500 | EGP | Monthly |
| Engine + Optimization — Setup | `price_xxx` | 35,000 | EGP | One-time |
| Engine + Optimization — Monthly | `price_xxx` | 17,500 | EGP | Monthly |
| Full Growth Partnership — Setup | `price_xxx` | 35,000 | EGP | One-time |
| Full Growth Partnership — Monthly | `price_xxx` | 32,500 | EGP | Monthly |

### Add-Ons
| Product | Price ID | Amount | Currency | Billing |
|---------|----------|--------|----------|---------|
| Reply Management — Setup | `price_xxx` | 12,500 | EGP | One-time |
| Reply Management — Monthly | `price_xxx` | 5,000 | EGP | Monthly |
| Creative Pack — Quarterly | `price_xxx` | 22,000 | EGP | One-time |

---

## Payment Links Registry

All generated payment links are tracked in `payment-links.csv` alongside this file.

---

## Integration Notes

- **Approach:** Stripe Payment Links (no backend required)
- **Hosting:** Static pages on `ops.admireworks.com` link out to Stripe-hosted checkout
- **Receipts:** Stripe sends automatic receipts (enable in Dashboard → Settings → Emails)
- **Refund Policy:** Handle refunds manually through Stripe Dashboard
