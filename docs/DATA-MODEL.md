# Admireworks Platform — Data Model

All data is stored in **Firebase Firestore**. Collections and their schemas are defined in `apps/client-portal/src/lib/firestore.ts`.

---

## Collections

### `clients`
Client company records.

| Field | Type | Description |
|---|---|---|
| `name` | string | Company name |
| `email` | string? | Primary contact email |
| `phone` | string? | Primary contact phone |
| `company` | string? | Legal/brand name |
| `contacts` | Contact[] | Multiple contacts (primary + CC) |
| `region` | string | Country code (EG, SA, AE, US) |
| `baseCurrency` | string | AED, SAR, EGP, USD |
| `status` | enum | lead, prospect, proposal_sent, active, churned |
| `ga4PropertyId` | string? | Google Analytics property |
| `notes` | string? | Internal notes |

### `invoices`
One-time and auto-generated invoices.

| Field | Type | Description |
|---|---|---|
| `invoiceNumber` | string | e.g. AWI-202603-001 |
| `clientId` | string | Reference to client |
| `clientName` | string | Denormalized name |
| `lineItems` | array | [{description, qty, rate, amount}] |
| `subtotal` | number | Before discounts/tax |
| `discount` | number? | Discount amount |
| `discountLabel` | string? | e.g. "Ramadan Special" |
| `tax` | number | Tax amount |
| `totalDue` | number | Final amount |
| `currency` | string | AED, SAR, EGP, USD |
| `status` | enum | draft, pending, paid, overdue |
| `issuedAt` | string | YYYY-MM-DD |
| `dueDate` | string | YYYY-MM-DD |
| `paidAt` | string? | When payment was received |
| `legacyUrl` | string? | Link to old HTML invoice |

### `recurringInvoices`
Templates for automated billing.

| Field | Type | Description |
|---|---|---|
| `templateName` | string | e.g. "Monthly Marketing Retainer" |
| `clientId` | string | Client reference |
| `lineItems` | array | Same as invoice |
| `totalDue` | number | Amount per cycle |
| `currency` | string | Billing currency |
| `frequency` | enum | monthly, quarterly, annual |
| `billingDay` | number | Day of month (1-28) |
| `nextDueDate` | string | YYYY-MM-DD |
| `active` | boolean | Can be paused/resumed |
| `autoSendEmail` | boolean | Auto-send on generation |
| `paymentMethods` | array | ['stripe', 'instapay', 'bank_transfer'] |

### `payments`
Payment records (from Stripe or manual).

| Field | Type | Description |
|---|---|---|
| `clientId` | string | Client reference |
| `invoiceId` | string? | Linked invoice |
| `amount` | number | Payment amount |
| `currency` | string | Payment currency |
| `method` | enum | stripe, instapay, bank_transfer |
| `status` | enum | succeeded, pending, failed |
| `stripePaymentIntentId` | string? | Stripe reference |
| `instapayRef` | string? | InstaPay transaction ref |
| `proofUrl` | string? | Screenshot proof (Storage URL) |

### `userProfiles`
User accounts with role-based access. Doc ID = Firebase Auth UID.

| Field | Type | Description |
|---|---|---|
| `uid` | string | Firebase Auth UID |
| `email` | string | User email |
| `displayName` | string | Full name |
| `role` | enum | owner, admin, team, client |
| `permissions` | string[] | Granular permission list |
| `assignedClients` | string[]? | Team: which clients they manage |
| `linkedClientId` | string? | Client: their company record |
| `isActive` | boolean | Account status |
| `lastLoginAt` | string? | Last login timestamp |

### `leads`
Sales pipeline tracking.

| Field | Type | Description |
|---|---|---|
| `name` | string | Lead name |
| `company` | string? | Company |
| `source` | enum | apollo, referral, inbound, event, other |
| `priority` | enum | A, B, C |
| `status` | enum | new, contacted, qualified, proposal_sent, converted |

### `proposals`
Proposal tracking.

| Field | Type | Description |
|---|---|---|
| `proposalNumber` | string | e.g. AWP-2026-001 |
| `clientId` | string? | Linked client |
| `status` | enum | draft, ready, sent, accepted, declined, expired |
| `documentUrl` | string? | PDF in Firebase Storage |
| `totalValue` | number? | Proposal value |

### `invoiceReminders`
Automated reminder tracking.

| Field | Type | Description |
|---|---|---|
| `invoiceId` | string | Reference to invoice |
| `type` | enum | upcoming, due_today, overdue_3d, overdue_7d, overdue_14d |
| `status` | enum | pending, sent, failed |

---

## Permissions

22 granular permissions in format `resource:action`:

```
clients:read, clients:write, invoices:read, invoices:write,
payments:read, payments:write, leads:read, leads:write,
proposals:read, proposals:write, reports:read, reports:write,
campaigns:read, campaigns:write, communications:read, communications:write,
settings:read, settings:write, team:read, team:write,
billing:read, billing:write
```
