---
description: Onboard a new client after proposal acceptance
---

# Client Onboarding Workflow

## When to Use
When a client has accepted a proposal and made their first payment.

## Prerequisites
- Proposal accepted
- Payment received (or first installment)
- Client contact details confirmed

## Steps

### Portal Setup

1. **Create client record** at `my.admireworks.com/dashboard/clients`:
   - Name, email, phone, company
   - Region and base currency
   - Status: `active`

2. **Create client user account** (for portal access):
   - Use `POST /api/admin/create-client-user`
   - Set role: `client`
   - Link to client record via `linkedClientId`

3. **Set up recurring billing** at `my.admireworks.com/dashboard/billing`:
   - Create recurring invoice template
   - Set frequency, billing day, amounts
   - Enable auto-send email

4. **Assign team member(s)**:
   - Update team user profiles with `assignedClients`

### Repo Setup

5. **Update client index** at `clients/{Client-Name}/00-Client-Index.md`:
   - Stage → `Active`
   - Add Portal Client ID (Firestore doc ID)
   - Add invoice numbers
   - Add assigned team members
   - Add scope of work

6. **Process client brief** (if submitted):
   - Follow `ops/briefing/Kickoff-Follow-Up-SOP.md`
   - Compare brief against `ops/briefing/Project-Briefing-Questionnaire/question-catalog.md`
   - Save gap analysis to `clients/{Client-Name}/briefing/gap-analysis.md`
   - Draft kickoff scheduling email

7. **Prepare kickoff meeting**:
   - Share scheduling link from Portal (`/book/{slug}`)
   - Review research and proposal for talking points

### Full-Funnel Clients (Separate Firebase Project)

If the client needs their own landing pages, admin, and payment system:

8. **Create new Firebase project**
9. **Use transfer SOP** at `docs/stripe-transfer-sop-prompt.md` to replicate payment architecture
10. **Copy client-portal patterns** as needed
11. **Configure domain and deployment**

## Checklist
- [ ] Client record created in Portal
- [ ] Client user account created
- [ ] Recurring billing configured
- [ ] Team assigned
- [ ] Client index updated
- [ ] Brief processed and gap analysis done
- [ ] Kickoff meeting scheduled
- [ ] (If full-funnel) Firebase project created
