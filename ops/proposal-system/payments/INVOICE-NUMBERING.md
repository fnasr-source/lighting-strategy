# Invoice Numbering System

## Format

**`AWI-{YYYYMM}-{SEQ}`**

- `AWI` = Admireworks Invoice prefix (distinct from `AWP` proposals)
- `YYYYMM` = Year and month of the invoice
- `SEQ` = 3-digit zero-padded sequence number within that month

### Examples
- `AWI-202603-001` — First invoice of March 2026
- `AWI-202603-002` — Second invoice of March 2026
- `AWI-202604-001` — First invoice of April 2026

## Source of Truth

- **Invoice Registry:** `invoice-registry.csv`
- **Client Directory:** `client-directory.csv`

## Proposals vs Invoices

| Type | Prefix | Purpose | Used For |
|------|--------|---------|----------|
| `AWP-*` | Proposal | One-time client pitches | New clients, upsells |
| `AWI-*` | Invoice | Recurring billing | Current clients, retainers |

## Recurring Invoice Rules

1. **Invoices for retainers are generated on the 1st of each month**
2. Each invoice gets a unique `AWI-*` number
3. The invoice date = 1st of the billing month
4. Payment terms = due upon receipt (or as agreed)
5. Invoice email is sent automatically via Resend on the 1st

## Monthly Billing Workflow

1. On the 1st of the month, generate invoices for all active recurring clients
2. Each invoice is created from the template with client-specific data
3. Register each invoice in `invoice-registry.csv`
4. Send invoice email via Resend to client
5. If unpaid after 7 days, send reminder email
6. Log payment receipt when confirmed
