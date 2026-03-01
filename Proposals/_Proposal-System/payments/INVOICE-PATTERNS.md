# Invoice Patterns — Self-Learning Reference

> This document is automatically updated as invoices are created. It captures patterns
> to ensure consistency across all future invoices.

---

## Pattern Rules (Extracted from Existing Work)

### Structure
Every invoice follows this structure:
1. **Header** — Invoice label + proposal number + Admireworks branding
2. **Details Grid** — Bill To (client info) + Invoice Details (date, due, currency, status)
3. **Line Items Table** — Description, Qty, Rate, Amount
4. **Totals** — Subtotal, optional tax, grand total
5. **Payment CTA** — Stripe payment button
6. **Alternative Payment** — Instapay for Egypt clients (omit for international)
7. **Terms** — Standard terms & conditions

### Currency Rules
| Client Region | Primary Currency | Display |
|---------------|-----------------|---------|
| Egypt | EGP | Amount in EGP, note USD equivalent |
| UAE | AED | Amount in AED |
| KSA | SAR | Amount in SAR |
| International | USD | Amount in USD |

### Line Item Patterns

#### Ad Campaign Management (Monthly)
```
Service: Ad Campaign Management — {MARKET}
Rate: {MONTHLY_RATE}
Qty: {MONTHS} (typically 3 for upfront)
Amount: Rate × Qty
```

#### Growth System Bulk
```
Service: Growth System — Full Asset Package
Rate: 45,000 EGP (one-time)
Qty: 1
Amount: 45,000 EGP
```

#### Growth System Subscription
```
Service: Growth System Subscription
Rate: 5,500 EGP/mo
Qty: 3 (upfront months)
Amount: 16,500 EGP
```

#### Growth Package — Funnel Engine
```
Service: Funnel Engine Only — Setup
Rate: 45,000 EGP
Qty: 1
Amount: 45,000 EGP
```

#### Growth Package — Engine + Optimization
```
Line 1: Engine + Optimization — Setup Fee | 35,000 EGP
Line 2: Engine + Optimization — Month 1 Retainer | 17,500 EGP
Total to start: 52,500 EGP
```

#### Growth Package — Full Growth Partnership
```
Line 1: Full Growth Partnership — Setup Fee | 35,000 EGP
Line 2: Full Growth Partnership — Month 1 Retainer | 32,500 EGP
Total to start: 67,500 EGP
```

#### Full Marketing Retainer (Custom)
```
Service: Full Marketing Retainer for {CLIENT_NAME}
Description: Monthly service covering direct response marketing, social media, email campaigns, funnels, and multi-platform ad management.
Rate: {MONTHLY_RATE}
Qty: 1
Amount: {MONTHLY_RATE}
Billing: Monthly retainer
```

---

## Invoice Log

| # | Date | Client | Proposal | Package | Amount | Currency | Notes |
|---|------|--------|----------|---------|--------|----------|-------|
| 1 | 2026-03-01 | RQM Group (QYD, RQM & Ceyaj) | AWP-SA-01JV-VWJ | Full Marketing Retainer | 5,500 | AED | Monthly retainer, Saudi Arabia |

> When creating a new invoice, add a row here and follow the patterns above.
