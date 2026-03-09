# Question Catalog

This is the documented structure of the live Tally form `Project Briefing Questionnaire`.

## 1. Basic Information

Page 2

1. `Brand Name`
Type: short text
Required: yes

2. `Website URL`
Type: URL
Required: yes

3. `Instagram Handle`
Type: URL
Required: yes

4. `Main Contact Person`
Type: short text
Required: yes

5. `Email Address`
Type: email
Required: yes

6. `Phone Number (WhatsApp preferred)`
Type: phone
Required: yes

7. `Business Location`
Type: country selector
Required: yes
Note: rendered as a separate field directly after phone number.

## 2. Brand Background

Page 3

8. `How did your company start? What’s your mission?`
Type: long text
Required: yes
Arabic helper: `كيف بدأت شركتكم؟ وما هي رسالتكم؟`

## 3. Marketing Objectives

Page 4

9. `What are your current marketing goals and challenges?`
Type: long text
Required: yes
Arabic helper: `ما هي أهدافكم التسويقية الحالية، وما التحديات التي تواجهونها؟`

## 4. Unique Selling Proposition

Page 5

10. `What makes your brand unique? What problems do your products solve?`
Type: long text
Required: yes
Arabic helper: `ما الذي يميز علامتكم التجارية؟ وما المشاكل التي تحلها منتجاتكم؟`

11. `Why do customers choose your brand over others?`
Type: long text
Required: yes
Arabic helper: `لماذا يختار العملاء علامتكم التجارية بدلاً من غيرها؟`

12. `Do you have any testimonials or success stories to share?`
Type: file upload
Required: no
Note: multiple files allowed.

13. `Or share a link to testimonials on Google Drive`
Type: URL
Required: no

## 5. Target Market

Page 6

14. `Describe your target audience (age, location, lifestyle, values)`
Type: long text
Required: yes
Arabic helper: `صِف جمهوركم المستهدف (العمر، الموقع، أسلوب الحياة، القيم).`

15. `How many personas do you want to describe?`
Type: single select
Required: yes
Options:
- `1`
- `2`
Hint: `Would be shown next`

Page 7

16. `Persona A details`
Type: grouped short text fields
Required: no
Fields:
- `Name`
- `Age`
- `Interests`
- `Main challenges`
- `Why your product fits`
Note: this page is shown after the persona count question.

Page 8

17. `Persona B details`
Type: grouped short text fields
Required: no
Fields:
- `Name`
- `Age`
- `Interests`
- `Main challenges`
- `Why your product fits`
Condition: shown only when persona count = `2`

Page 9

18. `What motivates your customers to buy? What stops them from buying?`
Type: long text
Required: yes
Arabic helper: `ما الذي يدفعهم للشراء؟ وما الذي يمنعهم من الشراء؟`

19. `Which channels do they use and trust most?`
Type: long text
Required: yes
Arabic helper: `ما هي القنوات التي يستخدمونها ويثقون بها أكثر؟`

## 6. Brand Communication

Page 10

20. `How is your brand positioned in the market?`
Type: long text
Required: yes
Arabic helper: `ما هو موقع علامتكم التجارية في السوق؟`

21. `Do you have a slogan in English or Arabic?`
Type: short text
Required: no
Arabic helper: `هل لديكم شعار (سلوغان) بالإنجليزية أو العربية؟`

22. `What tone and voice best describe your brand?`
Type: multi-select
Required: yes
Arabic helper: `ما النبرة والصوت الأنسب لوصف علامتكم التجارية؟`
Options:
- `Friendly`
- `Bold`
- `Professional`
- `Fun`
- `Emotional`
- `Other`

## 7. Customer Journey

Page 11

23. `How do customers typically discover, evaluate, and buy from you? What are the key touchpoints and objections they raise?`
Type: long text
Required: yes
Arabic helper: `كيف يتعرّف العملاء عادةً على علامتكم، ويقيّمونها، ويتخذون قرار الشراء؟ وما هي النقاط الأساسية في رحلتهم؟ وما الاعتراضات أو الحواجز التي يواجهونها؟`

## 8. Brand Offering & Competition

Page 12

24. `List your product categories`
Type: long text
Required: yes
Arabic helper: `ما هي فئات المنتجات التي تقدمونها؟`

25. `Which products are most popular and why?`
Type: long text
Required: yes
Arabic helper: `ما هي أكثر منتجاتكم شهرةً ولماذا؟`

26. `Who are your competitors?`
Type: long text
Required: yes
Arabic helper: `من هم منافسوكم الرئيسيون؟`

## 9. Digital Marketing & Metrics

Page 13

27. `Which digital channels are you focused on?`
Type: option set
Required: yes
Arabic helper: `ما هي القنوات الرقمية التي تركزون عليها؟`
Hint: `Select all that apply`
Options:
- `Facebook/Instagram`
- `Google`
- `TikTok`
- `YouTube`
- `WhatsApp`
- `Email`
- `Snapchat`
- `Other`
Note: the hint says multi-select, but the payload should be verified because it does not expose the same `allowMultiple` flag seen on other multi-select questions.

28. `What are your KPIs or campaign targets?`
Type: short text
Required: yes
Arabic helper: `ما هي مؤشرات الأداء الرئيسية أو الأهداف التي تعملون عليها؟`

29. `Do you have a fixed or flexible marketing budget?`
Type: long text
Required: yes
Arabic helper: `وهل ميزانيتكم الدعائية مرنة؟`

## 10. Brand Identity & Experience

Page 14

30. `Describe your brand’s identity (e.g., minimal, bold, premium)`
Type: short text
Required: yes
Arabic helper: `كيف تصف هوية علامتكم التجارية؟ (مثل: بسيطة، جريئة، فاخرة)`

31. `What kind of experience should customers have with your brand?`
Type: long text
Required: yes
Arabic helper: `ما المشاعر التي ترغبون في أن يشعر بها جمهوركم عند التفاعل مع علامتكم؟`

32. `Do you have a brand manual or visual guidelines?`
Type: file upload
Required: no

33. `Or link to brand manual files on Google Drive`
Type: URL
Required: no

## 11. Other

Page 15

34. `What incentives do you offer your customers?`
Type: multi-select
Required: yes
Arabic helper: `ما الحوافز أو العروض التي تقدمونها لعملائكم؟`
Options:
- `Discounts`
- `Free shipping`
- `Referral program`
- `Loyalty points`
- `Limited-time offers`
- `Other`

35. `List your social media accounts or other online presence`
Type: long text
Required: yes
Arabic helper: `اذكروا حساباتكم على مواقع التواصل الاجتماعي أو أي حضور رقمي آخر.`

36. `What tools/platforms do you currently use?`
Type: multi-select
Required: yes
Arabic helper: `ما هي الأدوات أو المنصات التي تستخدمونها في التسويق والمبيعات؟`
Options:
- `Google Ads`
- `Meta Ads Manager (Facebook/Instagram)`
- `Google Ads`
- `TikTok Ads`
- `Shopify`
- `WooCommerce`
- `Google Analytics`
- `Klaviyo`
- `Mailchimp`
- `WhatsApp Business / API`
- `CRM (e.g. HubSpot, Zoho, Pipedrive)`
- `Other`
Note: `Google Ads` appears twice in the current live payload.

## 12. Strategy & Expectations

Page 16

37. `What marketing strategies have worked well for you in the past?`
Type: long text
Required: yes
Arabic helper: `ما الاستراتيجيات التسويقية التي نجحت معكم في السابق؟`

38. `What are your expectations from our performance marketing work together?`
Type: long text
Required: yes
Arabic helper: `ما توقعاتكم من العمل معنا في التسويق؟`

## 13. Final Upload

Page 17

39. `Upload any additional files such as product catalogs, photos, brand guidelines, or past campaigns`
Type: file upload
Required: yes

## Conditional Summary

- The form starts with an intro page before the first answer page.
- Persona count drives one branch:
  - If the client selects `1`, the form shows `Persona A` and then skips `Persona B`.
  - If the client selects `2`, the form shows both `Persona A` and `Persona B`.
- The form ends with a thank-you page after submission.
