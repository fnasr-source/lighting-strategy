# Campaign Flow Draft

## Overview
This document outlines the campaign flow architecture for Basseqat — from first ad impression to qualified conversation and sales handoff.

---

## Flow 1: Cold Traffic → WhatsApp Conversation Start

### Trigger
New user sees Facebook/Instagram ad

### Journey
```
[Facebook/Instagram Ad] 
    → [Landing Page]
        → [Click-to-WhatsApp CTA]
            → [WhatsApp: AI Welcome + Qualification]
                → [Qualified? → Human Handoff]
                → [Not Qualified? → FAQ + Nurture Sequence]
```

### Ad Types
- Founder authority video
- Problem-scenario UGC
- Educational/myth-busting
- Process/operations teaser

### Landing Page Conversion
- CTA: "ابدأ محادثة على الواتساب"
- Pre-filled WhatsApp message: "مرحبا — أنا عايز أعرف أكتر عن مشروع بَسّقات"

### WhatsApp Sequence (AI-Assisted)
**Message 1 (Immediate — AI):**
"أهلاً بيك! 👋 أنا هنا أجاوبك على أي سؤال عن مشروع بَسّقات — اسأل براحتك."

**Message 2 (After first question — AI):**
Contextual answer + "عايز تعرف أكتر عن [العملية / التوثيق / الزيارة]؟"

**Qualification Check (AI — after 2-3 exchanges):**
- Genuine interest assessment
- Not a guarantee-seeker
- Ready for deeper conversation
- → If qualified: handoff to human team member
- → If not: continue FAQ mode + add to nurture

**Human Handoff:**
"خلّيني أوصلك بـ [اسم] من فريقنا — هيقدر يشرحلك كل التفاصيل ويرتبلك زيارة لو عايز."

---

## Flow 2: Warm Traffic → Retargeting → Re-engagement

### Trigger
User visited landing page but did NOT start WhatsApp conversation (Meta Pixel event)

### Journey
```
[Landing Page Visitor (no conversion)]
    → [Retargeting Ad — 3-7 days later]
        → [Landing Page (same or variant)]
            → [WhatsApp CTA]
```

### Retargeting Ad Angles
- **Proof angle:** "شوف اللي بيحصل في المزرعة فعلاً" (See what's actually happening at the farm)
- **FAQ angle:** "أكتر سؤال بيتسألوه: [common question]..."
- **Founder angle:** Khaled addressing a specific objection
- **Social proof angle:** When testimonials are available

### Frequency Cap
Max 3 impressions per week per user. Respect the cautious audience — don't overwhelm.

---

## Flow 3: WhatsApp Conversation → Nurture → Conversion

### Trigger
WhatsApp conversation started but no MQL yet

### Journey (7-day nurture)
```
Day 0: Welcome + initial conversation (AI + human)
Day 1: Educational content — market context (WhatsApp)
Day 3: Process documentation share (WhatsApp)
Day 5: FAQ handling (WhatsApp)
Day 7: "عايز تسأل حاجة تانية؟" gentle reminder (WhatsApp)
Day 14: Virtual tour invitation or visit scheduling (WhatsApp)
```

### Email Supplement (if email provided)
```
Day 0: Welcome email — "شكراً — ده اللي ممكن تتوقعه"
Day 3: Process explanation email (more detail than WhatsApp)
Day 7: Market context email (Egypt #1 date producer, Medjool premium)
Day 14: Documentation/proof email
Day 21: Reminder + invitation for next step
```

---

## Flow 4: MQL → Sales Handoff → Visit/Tour

### Trigger
Lead qualified through WhatsApp conversation

### Journey
```
[MQL Confirmed]
    → [Assigned to Sales Team (CRM)]
        → [Deep process explanation call/WhatsApp]
            → [Documentation package sent]
                → [Farm visit or virtual tour scheduled]
                    → [Decision / Close]
```

### Sales Support Assets Needed
- Documentation package (PDF/digital) [PLACEHOLDER — needs creation]
- Virtual tour content [PLACEHOLDER — needs production]
- Farm visit logistics and scheduling process
- Sales script aligned to messaging bible

---

## Flow Summary

| Flow | Audience | Channel | Goal |
|---|---|---|---|
| Flow 1 | Cold traffic | Facebook → Landing Page → WhatsApp | Conversation start |
| Flow 2 | Warm traffic | Retargeting → Landing Page → WhatsApp | Re-engagement |
| Flow 3 | Engaged leads | WhatsApp + Email | Nurture to MQL |
| Flow 4 | MQLs | Human WhatsApp + CRM | Sales handoff + visit |

---

## Channel Cadence (Month 1)

| Day | Action |
|---|---|
| Mon-Fri | Ads running (awareness + conversion campaigns) |
| Daily | AI WhatsApp replies (immediate) |
| Same day | Human handoff for qualified conversations |
| Day 1, 3, 5, 7 | Nurture message sequence for engaged non-MQLs |
| Weekly | Performance review and ad optimization |
| End of Month | Full funnel review and Month 2 planning |

**Source:** Direct-response strategy (funnel design section), client brief, messaging bible
