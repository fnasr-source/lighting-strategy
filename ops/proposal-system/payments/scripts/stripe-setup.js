#!/usr/bin/env node
/**
 * One-time setup script: Update Stripe branding + create all package payment links
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function main() {
    // 1. Update branding
    console.log('=== Updating Stripe Branding ===');
    try {
        const acct = await stripe.accounts.update('', {
            business_profile: { name: 'Admireworks' },
            settings: { payments: { statement_descriptor: 'ADMIREWORKS' } }
        });
        console.log('Business Name:', acct.business_profile?.name);
        console.log('Descriptor:', acct.settings?.payments?.statement_descriptor);
    } catch (e) {
        // Self-serve accounts can't use accounts.update — try direct API
        console.log('Branding update via API not available for this account type.');
        console.log('→ Please update manually: Stripe Dashboard → Settings → Public details → Business name → "Admireworks"');
    }

    // 2. Create products, prices, and payment links
    const packages = [
        { name: 'Ad Campaign Management — Egypt', desc: 'Professional ad management for the Egyptian market. 3-month minimum.', amount: 3750000, currency: 'egp', interval: 'month', interval_count: 3, placeholder: '#STRIPE_PAYMENT_LINK_EG_CAMPAIGN' },
        { name: 'Ad Campaign Management — UAE', desc: 'Professional ad management for the UAE market.', amount: 120000, currency: 'aed', interval: 'month', interval_count: 1, placeholder: '#STRIPE_PAYMENT_LINK_UAE_CAMPAIGN' },
        { name: 'Ad Campaign Management — KSA', desc: 'Professional ad management for the Saudi Arabia market.', amount: 120000, currency: 'sar', interval: 'month', interval_count: 1, placeholder: '#STRIPE_PAYMENT_LINK_KSA_CAMPAIGN' },
        { name: 'Ad Campaign Management — International', desc: 'Professional ad management for international markets.', amount: 33000, currency: 'usd', interval: 'month', interval_count: 1, placeholder: '#STRIPE_PAYMENT_LINK_INTL_CAMPAIGN' },
        { name: 'Growth System — Own Your Assets (Bulk)', desc: 'Complete growth system with full asset ownership from day one.', amount: 4500000, currency: 'egp', interval: null, placeholder: '#STRIPE_PAYMENT_LINK_GROWTH_BULK' },
        { name: 'Growth System — Subscription', desc: 'Growth system on monthly subscription. Assets transfer after 12 months.', amount: 550000, currency: 'egp', interval: 'month', interval_count: 1, placeholder: '#STRIPE_PAYMENT_LINK_GROWTH_SUB' },
        { name: 'Growth Package — Funnel Engine', desc: 'Funnel engine one-time setup.', amount: 4500000, currency: 'egp', interval: null, placeholder: '#STRIPE_PAYMENT_LINK_FUNNEL_ENGINE' },
        { name: 'Growth Package — Engine + Optimization', desc: 'Funnel engine setup plus monthly optimization.', amount: 3500000, currency: 'egp', interval: null, placeholder: '#STRIPE_PAYMENT_LINK_ENGINE_OPT' },
        { name: 'Growth Package — Full Partnership', desc: 'Full growth partnership with comprehensive services.', amount: 3500000, currency: 'egp', interval: null, placeholder: '#STRIPE_PAYMENT_LINK_FULL_PARTNER' },
    ];

    const results = [];
    for (const pkg of packages) {
        console.log(`\n=== ${pkg.name} ===`);
        try {
            const product = await stripe.products.create({ name: pkg.name, description: pkg.desc });
            console.log('Product:', product.id);

            const priceData = { product: product.id, unit_amount: pkg.amount, currency: pkg.currency };
            if (pkg.interval) {
                priceData.recurring = { interval: pkg.interval };
                if (pkg.interval_count && pkg.interval_count > 1) {
                    priceData.recurring.interval_count = pkg.interval_count;
                }
            }
            const price = await stripe.prices.create(priceData);
            console.log('Price:', price.id);

            const link = await stripe.paymentLinks.create({
                line_items: [{ price: price.id, quantity: 1 }]
            });
            console.log('Link:', link.url);

            results.push({ ...pkg, product_id: product.id, price_id: price.id, link_url: link.url, link_id: link.id });
        } catch (e) {
            console.log('ERROR:', e.message);
            results.push({ ...pkg, error: e.message });
        }
    }

    // 3. Output JSON for easy consumption
    console.log('\n\n=== RESULTS JSON ===');
    console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
