---
description: Generate a PDF from a static HTML invoice using Puppeteer
---

# Invoice PDF Generation

// turbo-all

## When to Use
After creating or modifying a static HTML invoice and needing a PDF copy for the client's finance team.

## Prerequisites
- `puppeteer-core` installed in `Proposals/_Proposal-System/payments/`
- Google Chrome installed at `/Applications/Google Chrome.app/`
- `payment-pages.css` has mobile responsive styling restricted to `@media screen` to prevent the A4 print size from triggering mobile layouts.

## Steps

### 1. Ensure the HTML invoice is ready

Verify the invoice HTML at:
```
Proposals/{Client}/invoices/{AWI-YYYYMM-SEQ}/invoice.html
```

Confirm all line items, totals, savings, and recurring notes are correct.

### 2. Generate the PDF

Run the Puppeteer script with the absolute path to the invoice HTML:

```bash
node "Proposals/_Proposal-System/payments/scripts/generate-pdf.js" \
  "Proposals/{Client}/invoices/{AWI-YYYYMM-SEQ}/invoice.html"
```

This outputs `invoice.pdf` in the same directory as the HTML file.

Optionally specify a custom output path:
```bash
node "Proposals/_Proposal-System/payments/scripts/generate-pdf.js" \
  "Proposals/{Client}/invoices/{AWI-YYYYMM-SEQ}/invoice.html" \
  "/path/to/output.pdf"
```

### 3. Verify the PDF

Open the generated PDF and confirm:
- All line items appear correctly (descriptions, quantities, rates, amounts)
- FREE/WAIVED/DISCOUNT badges render with green/gold styling
- Strikethrough prices appear on promotional items
- Savings banner shows the correct total
- Total Due is accurate
- Payment details (InstaPay for Egypt / Stripe for international) are present
- Footer with Admireworks branding is intact

### 4. Share with the client

The PDF is ready. Share via email or WhatsApp as needed.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| puppeteer-core not found | Run `npm install puppeteer-core` in `Proposals/_Proposal-System/payments/` |
| Chrome not found | Update `CHROME_PATH` in `generate-pdf.js` to your Chrome installation path |
| CSS not rendering | Ensure relative CSS path in HTML (`../../../_Proposal-System/payments/payment-pages.css`) is resolvable from the HTML file location |
| Mobile layout (stacking) appears | Verify that `@media (max-width: 760px)` in the CSS has been correctly changed to `@media screen and (max-width: 760px)`. Print views must ignore mobile breakpoints. |
| Bad page breaks (elements split) | Ensure the `@media print` block in the CSS has `break-inside: avoid` applied to `.invoice-header`, `.invoice-items tr`, `.invoice-total`, etc. |
| Interactive elements (checkboxes) showing | These are hidden via `@media print` rules in the CSS |

## File Locations

| File | Path |
|------|------|
| PDF script | `Proposals/_Proposal-System/payments/scripts/generate-pdf.js` |
| Shared CSS | `Proposals/_Proposal-System/payments/payment-pages.css` |
| HTML template | `Proposals/_Proposal-System/payments/templates/invoice-template.html` |
| Invoice registry | `Proposals/_Proposal-System/payments/invoice-registry.csv` |
