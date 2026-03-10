export type OnboardingFieldType = 'text' | 'textarea' | 'email' | 'phone' | 'url';

export type OnboardingFieldState =
    | 'confirmed'
    | 'prefilled_verify'
    | 'missing'
    | 'deferred';

export interface OnboardingField {
    id: string;
    labelAr: string;
    labelEn: string;
    type: OnboardingFieldType;
    required: boolean;
    placeholderAr?: string;
    placeholderEn?: string;
    helperAr?: string;
    helperEn?: string;
}

export interface OnboardingSection {
    id: string;
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    fields: OnboardingField[];
}

export type ClientOnboardingResponses = Record<string, string>;
export type ClientOnboardingFieldStates = Record<string, OnboardingFieldState>;

export interface ClientOnboardingForm {
    id?: string;
    clientId: string;
    clientName: string;
    slug: string;
    accessKey: string;
    language: 'ar-en';
    platform: 'zid';
    status: 'draft' | 'submitted';
    notificationEmails?: string[];
    responses: ClientOnboardingResponses;
    fieldStates: ClientOnboardingFieldStates;
    submissionCount?: number;
    lastSavedAt?: string;
    submittedAt?: string;
    lastNotifiedAt?: string;
    createdAt?: unknown;
    updatedAt?: unknown;
}

export const onboardingStateLabels: Record<
    OnboardingFieldState,
    { ar: string; en: string; tone: 'green' | 'amber' | 'navy' | 'slate' }
> = {
    confirmed: {
        ar: 'مؤكد من الاجتماعات السابقة',
        en: 'Confirmed',
        tone: 'green',
    },
    prefilled_verify: {
        ar: 'معبأ مسبقاً من الاجتماعات السابقة',
        en: 'Pre-filled from previous meetings',
        tone: 'amber',
    },
    missing: {
        ar: 'مطلوب منكم',
        en: 'Required from you',
        tone: 'navy',
    },
    deferred: {
        ar: 'مؤجل حالياً',
        en: 'Deferred for kickoff',
        tone: 'slate',
    },
};

export const einAbayaOnboardingSections: OnboardingSection[] = [
    {
        id: 'brand_growth',
        titleAr: 'ملف البراند والنمو',
        titleEn: 'Brand & Growth Brief',
        descriptionAr: 'هذا الجزء يجمع ما نحتاجه لفهم البراند، الجمهور، والعرض الحالي قبل البدء.',
        descriptionEn: 'This section captures the brand, audience, and growth context we need before kickoff.',
        fields: [
            {
                id: 'primary_contact_name',
                labelAr: 'اسم جهة التواصل الأساسية',
                labelEn: 'Primary contact name',
                type: 'text',
                required: true,
            },
            {
                id: 'primary_contact_email',
                labelAr: 'البريد الإلكتروني لجهة التواصل الأساسية',
                labelEn: 'Primary contact email',
                type: 'email',
                required: true,
            },
            {
                id: 'primary_contact_whatsapp',
                labelAr: 'رقم الواتساب لجهة التواصل الأساسية',
                labelEn: 'Primary contact WhatsApp number',
                type: 'phone',
                required: true,
            },
            {
                id: 'daily_approver_name',
                labelAr: 'اسم الشخص المسؤول عن الموافقات اليومية',
                labelEn: 'Daily approver name',
                type: 'text',
                required: true,
                helperAr: 'إذا كان نفس الشخص الأساسي، اكتبي ذلك.',
                helperEn: 'If this is the same as the main contact, you can write that.',
            },
            {
                id: 'daily_approver_email',
                labelAr: 'بريد الشخص المسؤول عن الموافقات اليومية',
                labelEn: 'Daily approver email',
                type: 'email',
                required: true,
            },
            {
                id: 'daily_approver_whatsapp',
                labelAr: 'واتساب الشخص المسؤول عن الموافقات اليومية',
                labelEn: 'Daily approver WhatsApp',
                type: 'phone',
                required: true,
            },
            {
                id: 'brand_story_mission',
                labelAr: 'كيف بدأت عين عباية وما رسالتها اليوم؟',
                labelEn: 'How did Ein Abaya start and what is the mission today?',
                type: 'textarea',
                required: true,
            },
            {
                id: 'brand_positioning',
                labelAr: 'كيف تصفون تموضع البراند في السوق اليوم؟',
                labelEn: 'How do you describe the brand positioning today?',
                type: 'textarea',
                required: true,
            },
            {
                id: 'brand_ladder',
                labelAr: 'اشرحوا لنا علاقة Ein Abaya مع Maison Ein وأي خطوط أو توسعات أخرى',
                labelEn: 'Explain the relationship between Ein Abaya, Maison Ein, and any other lines',
                type: 'textarea',
                required: false,
            },
            {
                id: 'target_audience',
                labelAr: 'من هو الجمهور الأساسي المستهدف حالياً؟',
                labelEn: 'Who is the core target audience right now?',
                type: 'textarea',
                required: true,
            },
            {
                id: 'persona_notes',
                labelAr: 'هل توجد شرائح أو شخصيات مختلفة داخل الجمهور؟',
                labelEn: 'Are there distinct personas or segments within the audience?',
                type: 'textarea',
                required: false,
            },
            {
                id: 'best_sellers_collections',
                labelAr: 'ما هي أهم الكوليكشنز أو المنتجات الحالية والأكثر مبيعاً؟',
                labelEn: 'What are the main collections or best-selling products right now?',
                type: 'textarea',
                required: true,
            },
            {
                id: 'product_priorities',
                labelAr: 'ما الذي تريدون إبرازَه أكثر في الموقع الجديد؟',
                labelEn: 'What do you want to highlight most on the new site?',
                type: 'textarea',
                required: false,
            },
            {
                id: 'competitors_reference_brands',
                labelAr: 'من هي البراندات أو المواقع المرجعية التي تحبونها أو تريدون التفوق عليها؟',
                labelEn: 'Which competitor or reference brands do you admire or want to outperform?',
                type: 'textarea',
                required: false,
            },
            {
                id: 'tone_of_voice',
                labelAr: 'ما النبرة المناسبة لكتابة البراند والموقع؟',
                labelEn: 'What tone of voice should the brand and site use?',
                type: 'textarea',
                required: true,
            },
            {
                id: 'customer_journey_objections',
                labelAr: 'كيف يكتشف العميل البراند؟ وما أهم الاعتراضات أو نقاط التردد قبل الشراء؟',
                labelEn: 'How do customers discover the brand, and what objections or hesitations come up before purchase?',
                type: 'textarea',
                required: true,
            },
            {
                id: 'current_channels_performance',
                labelAr: 'ما القنوات الحالية المستخدمة؟ وما الذي يعمل جيداً وما الذي لا يعمل؟',
                labelEn: 'Which channels are in use now, and what is working vs. not working?',
                type: 'textarea',
                required: true,
            },
            {
                id: 'growth_notes_what_worked',
                labelAr: 'هل توجد حملات أو أفكار أو عروض سابقة أعطت نتائج جيدة؟',
                labelEn: 'Have any campaigns, ideas, or offers worked especially well before?',
                type: 'textarea',
                required: false,
            },
        ],
    },
    {
        id: 'zid_launch',
        titleAr: 'مدخلات الانطلاق على زد',
        titleEn: 'Launch Inputs For Zid Build',
        descriptionAr: 'هذا الجزء مخصص لكل ما نحتاجه لتجهيز الانتقال إلى زد وبناء الموقع بشكل سريع ومنظم.',
        descriptionEn: 'This section covers the operational inputs needed to launch the Zid build quickly and cleanly.',
        fields: [
            {
                id: 'platform_choice',
                labelAr: 'المنصة المعتمدة للمشروع',
                labelEn: 'Confirmed platform for this project',
                type: 'text',
                required: true,
            },
            {
                id: 'platform_transition_context',
                labelAr: 'ما هو وضع المتجر الحالي وما الذي يجب نقله أو الحفاظ عليه أثناء الانتقال؟',
                labelEn: 'What is the current store situation and what needs to be preserved during the move?',
                type: 'textarea',
                required: false,
            },
            {
                id: 'zid_access_details',
                labelAr: 'تفاصيل الوصول إلى زد',
                labelEn: 'Zid access details',
                type: 'textarea',
                required: true,
                helperAr: 'أرسلوا رابط المتجر أو اسم الحساب، وطريقة إضافة الفريق، وأي ملاحظات تخص API إذا لزم.',
                helperEn: 'Share the store/account details, how to invite the team, and any API notes if relevant.',
            },
            {
                id: 'domain_dns_owner',
                labelAr: 'من يملك الدومين ومن يدير الـ DNS حالياً؟',
                labelEn: 'Who owns the domain and manages DNS today?',
                type: 'textarea',
                required: true,
            },
            {
                id: 'payment_gateway_bnpl',
                labelAr: 'ما هي بوابات الدفع و BNPL المستخدمة أو المخطط استخدامها؟',
                labelEn: 'Which payment gateways and BNPL providers are active or planned?',
                type: 'textarea',
                required: true,
            },
            {
                id: 'shipping_logistics_setup',
                labelAr: 'ما هو وضع الشحن واللوجستيات حالياً؟',
                labelEn: 'What is the current shipping and logistics setup?',
                type: 'textarea',
                required: true,
            },
            {
                id: 'analytics_ads_access',
                labelAr: 'ما الحسابات التي يمكن منحنا الوصول لها الآن؟',
                labelEn: 'Which analytics and ads accounts can be shared now?',
                type: 'textarea',
                required: true,
                helperAr: 'مثال: Meta, TikTok, Google Ads, GA4, GTM.',
                helperEn: 'Example: Meta, TikTok, Google Ads, GA4, GTM.',
            },
            {
                id: 'policy_links_or_status',
                labelAr: 'روابط أو ملفات السياسات الرسمية',
                labelEn: 'Official policy links or files',
                type: 'textarea',
                required: true,
                helperAr: 'مثل: الشحن، الاسترجاع، الخصوصية، والشروط.',
                helperEn: 'For example: shipping, refund, privacy, and terms.',
            },
            {
                id: 'brand_assets_folder_link',
                labelAr: 'رابط مجلد ملفات الهوية البصرية',
                labelEn: 'Brand assets folder link',
                type: 'url',
                required: true,
            },
            {
                id: 'media_folder_link',
                labelAr: 'رابط مجلد الصور والفيديوهات',
                labelEn: 'Media folder link',
                type: 'url',
                required: true,
            },
            {
                id: 'catalog_export_link',
                labelAr: 'رابط ملف الكاتالوج أو التصدير الحالي للمنتجات',
                labelEn: 'Catalog export or current product file link',
                type: 'url',
                required: true,
            },
            {
                id: 'social_links_overview',
                labelAr: 'روابط السوشال ميديا أو الحسابات الحالية',
                labelEn: 'Current social links or account references',
                type: 'textarea',
                required: false,
            },
            {
                id: 'welcome_offer_and_promotions',
                labelAr: 'هل توجد عروض ترحيبية أو عروض ثابتة تريدون إبرازها؟',
                labelEn: 'Are there welcome offers or evergreen promotions to highlight?',
                type: 'textarea',
                required: false,
            },
            {
                id: 'review_social_proof_assets',
                labelAr: 'هل توجد تقييمات أو محتوى إثبات اجتماعي يمكن استخدامه؟',
                labelEn: 'Do you have reviews or social proof assets we can use?',
                type: 'textarea',
                required: false,
            },
            {
                id: 'extra_notes_for_launch',
                labelAr: 'أي ملاحظات إضافية مهمة لبدء التنفيذ بسرعة',
                labelEn: 'Any extra notes that would help us start fast',
                type: 'textarea',
                required: false,
            },
        ],
    },
];

export const einAbayaOnboardingFields = einAbayaOnboardingSections.flatMap((section) =>
    section.fields.map((field) => ({ ...field, sectionId: section.id }))
);

export const einAbayaRequiredFieldIds = einAbayaOnboardingFields
    .filter((field) => field.required)
    .map((field) => field.id);

export function getOnboardingFieldById(fieldId: string) {
    return einAbayaOnboardingFields.find((field) => field.id === fieldId) || null;
}

export function sanitizeOnboardingResponses(
    input: Record<string, unknown> | null | undefined
): ClientOnboardingResponses {
    const clean: ClientOnboardingResponses = {};

    for (const field of einAbayaOnboardingFields) {
        const raw = input?.[field.id];
        clean[field.id] = typeof raw === 'string' ? raw : '';
    }

    return clean;
}

export function sanitizeOnboardingResponsePatch(
    input: Record<string, unknown> | null | undefined
): Partial<ClientOnboardingResponses> {
    const clean: Partial<ClientOnboardingResponses> = {};

    if (!input) return clean;

    for (const field of einAbayaOnboardingFields) {
        if (!(field.id in input)) continue;
        const raw = input[field.id];
        clean[field.id] = typeof raw === 'string' ? raw : '';
    }

    return clean;
}

function hasValue(value: string) {
    return value.trim().length > 0;
}

function isEmail(value: string) {
    return value.includes('@') && value.includes('.');
}

function isPhone(value: string) {
    const digits = value.replace(/[^\d+]/g, '');
    return digits.length >= 7;
}

function isUrl(value: string) {
    return /^https?:\/\//i.test(value.trim());
}

export function validateOnboardingResponses(responses: ClientOnboardingResponses) {
    const missingFields: Array<{ id: string; labelAr: string; labelEn: string }> = [];
    const invalidFields: Array<{ id: string; labelAr: string; labelEn: string; reason: string }> = [];

    for (const field of einAbayaOnboardingFields) {
        const value = responses[field.id] || '';

        if (field.required && !hasValue(value)) {
            missingFields.push({
                id: field.id,
                labelAr: field.labelAr,
                labelEn: field.labelEn,
            });
            continue;
        }

        if (!hasValue(value)) continue;

        if (field.type === 'email' && !isEmail(value)) {
            invalidFields.push({
                id: field.id,
                labelAr: field.labelAr,
                labelEn: field.labelEn,
                reason: 'email',
            });
        }

        if (field.type === 'phone' && !isPhone(value)) {
            invalidFields.push({
                id: field.id,
                labelAr: field.labelAr,
                labelEn: field.labelEn,
                reason: 'phone',
            });
        }

        if (field.type === 'url' && !isUrl(value)) {
            invalidFields.push({
                id: field.id,
                labelAr: field.labelAr,
                labelEn: field.labelEn,
                reason: 'url',
            });
        }
    }

    return {
        valid: missingFields.length === 0 && invalidFields.length === 0,
        missingFields,
        invalidFields,
    };
}

export function countSectionCompletion(
    section: OnboardingSection,
    responses: ClientOnboardingResponses
) {
    const total = section.fields.length;
    const answered = section.fields.filter((field) => hasValue(responses[field.id] || '')).length;
    return { total, answered };
}
