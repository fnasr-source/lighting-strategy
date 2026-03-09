/* ============================================
   LEADING UNDER PRESSURE 2026 — Interactivity
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const schedulingBaseUrl = window.__SCHEDULING_BASE_URL || 'https://my.admireworks.com';
  const analyticsBaseUrl = window.__LUP_ANALYTICS_BASE_URL || `${schedulingBaseUrl}/api/campaigns/lup-2026/analytics`;

  // ---- UTM Tracking & Lead Attribution ----
  const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'ref', 'gclid', 'fbclid'];
  const startedForms = new Set();

  function stableId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function getVisitorId() {
    let visitorId = localStorage.getItem('lup_visitor_id');
    if (!visitorId) {
      visitorId = stableId('visitor');
      localStorage.setItem('lup_visitor_id', visitorId);
    }
    return visitorId;
  }

  function getSessionId() {
    let sessionId = sessionStorage.getItem('lup_session_id');
    if (!sessionId) {
      sessionId = stableId('session');
      sessionStorage.setItem('lup_session_id', sessionId);
    }
    return sessionId;
  }

  function captureUTM() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    UTM_PARAMS.forEach(key => {
      const val = params.get(key);
      if (val) utm[key] = val;
    });

    // Persist across page navigation within the session
    if (Object.keys(utm).length > 0) {
      sessionStorage.setItem('lup_utm', JSON.stringify(utm));
    }

    // Also capture landing metadata
    const meta = {
      landing_url: window.location.href,
      landing_page: window.location.pathname,
      referrer: document.referrer || '(direct)',
      first_visit: new Date().toISOString(),
      user_agent: navigator.userAgent
    };
    if (!sessionStorage.getItem('lup_meta')) {
      sessionStorage.setItem('lup_meta', JSON.stringify(meta));
    }
  }

  function getUTMData() {
    try {
      return JSON.parse(sessionStorage.getItem('lup_utm') || '{}');
    } catch (e) { return {}; }
  }

  function getLandingMeta() {
    try {
      return JSON.parse(sessionStorage.getItem('lup_meta') || '{}');
    } catch (e) { return {}; }
  }

  function sendAnalytics(payload) {
    const body = JSON.stringify({
      campaign: 'lup-2026',
      client_id: 'aspire-hr',
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      page_url: window.location.href,
      path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer || '(direct)',
      utm: getUTMData(),
      meta: getLandingMeta(),
      submitted_at: new Date().toISOString(),
      ...payload
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(analyticsBaseUrl, blob)) return;
    }

    fetch(analyticsBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {});
  }

  function trackEvent(eventName, extra = {}) {
    sendAnalytics({ event_name: eventName, ...extra });
  }

  function generateLeadId() {
    // Compact unique ID: timestamp + random
    return 'LUP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // Capture UTM on page load
  captureUTM();
  getVisitorId();
  getSessionId();
  trackEvent('page_view');

  // Inject hidden UTM fields into all forms
  document.querySelectorAll('form').forEach(form => {
    const utm = getUTMData();
    Object.entries(utm).forEach(([key, val]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = val;
      form.appendChild(input);
    });
    // Add lead_id
    const leadInput = document.createElement('input');
    leadInput.type = 'hidden';
    leadInput.name = 'lead_id';
    leadInput.value = generateLeadId();
    form.appendChild(leadInput);
  });

  // ---- Navbar scroll effect ----
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });

  // ---- Countdown Timer ----
  const eventDate = new Date('2026-04-20T09:00:00+04:00').getTime();

  function updateCountdown() {
    const now = Date.now();
    const diff = eventDate - now;

    if (diff <= 0) {
      document.querySelectorAll('.countdown-number').forEach(el => el.textContent = '0');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.querySelectorAll('[data-countdown="days"]').forEach(el => el.textContent = days);
    document.querySelectorAll('[data-countdown="hours"]').forEach(el => el.textContent = String(hours).padStart(2, '0'));
    document.querySelectorAll('[data-countdown="minutes"]').forEach(el => el.textContent = String(minutes).padStart(2, '0'));
    document.querySelectorAll('[data-countdown="seconds"]').forEach(el => el.textContent = String(seconds).padStart(2, '0'));
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ---- FAQ Accordion ----
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const faqItem = btn.parentElement;
      const answer = faqItem.querySelector('.faq-answer');
      const isOpen = faqItem.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('open');
        item.querySelector('.faq-answer').style.maxHeight = '0';
      });

      // Toggle current
      if (!isOpen) {
        faqItem.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // ---- Application Modal ----
  const applyModal = document.getElementById('apply-modal');
  const inquiryModal = document.getElementById('inquiry-modal');
  const brochureModal = document.getElementById('brochure-modal');
  const defaultBrochureUrl = window.__LUP_BROCHURE_URL
    || 'https://storage.googleapis.com/admireworks-internal-os-brochures-2026/campaigns/lup-2026/Leading%20Under%20Pressure%20Program%202026%20(1).pdf';

  function openModal(modal) {
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      trackEvent('modal_open', { modal_id: modal.id || '' });
    }
  }
  function closeModal(modal) {
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      trackEvent('modal_close', { modal_id: modal.id || '' });
    }
  }

  // Primary CTA → full application
  document.querySelectorAll('[data-action="apply"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      trackEvent('cta_click', { cta_type: 'apply', cta_label: btn.textContent.trim() });
      openModal(applyModal);
    });
  });

  // Secondary CTA → quick inquiry
  document.querySelectorAll('[data-action="inquiry"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      trackEvent('cta_click', { cta_type: 'inquiry', cta_label: btn.textContent.trim() });
      openModal(inquiryModal);
    });
  });

  // Brochure CTA → brochure capture
  document.querySelectorAll('[data-action="brochure"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      trackEvent('cta_click', { cta_type: 'brochure', cta_label: btn.textContent.trim() });
      openModal(brochureModal);
    });
  });

  // Close buttons
  applyModal?.querySelector('.close-modal')?.addEventListener('click', () => closeModal(applyModal));
  inquiryModal?.querySelector('.close-modal')?.addEventListener('click', () => closeModal(inquiryModal));
  brochureModal?.querySelector('.close-modal')?.addEventListener('click', () => closeModal(brochureModal));

  // Close on backdrop click
  [applyModal, inquiryModal, brochureModal].forEach(m => {
    m?.addEventListener('click', (e) => { if (e.target === m) closeModal(m); });
  });

  // ---- Form submission helper ----
  function handleFormSubmit(formId, modalId, formType) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('focusin', () => {
      if (startedForms.has(formId)) return;
      startedForms.add(formId);
      trackEvent('form_start', { form_id: formId, form_type: formType });
    }, { once: false });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      trackEvent('form_submit_attempt', { form_id: formId, form_type: formType });
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      const utmData = getUTMData();
      const landingMeta = getLandingMeta();
      const leadPayload = {
        ...data,
        utm: utmData,
        meta: landingMeta,
        submitted_at: new Date().toISOString(),
        campaign: 'leading-under-pressure-2026',
        form_type: formType,
        status: 'new'
      };
      const container = form.closest('.apply-form-container');
      const fallbackBookingUrl = `${schedulingBaseUrl}/book/discovery-call?name=${encodeURIComponent(data.firstName || '')}&email=${encodeURIComponent(data.email || '')}`;
      const submitBtn = form.querySelector('.form-submit');
      const originalBtnText = submitBtn ? submitBtn.textContent : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      try {
        const res = await fetch(`${schedulingBaseUrl}/api/campaigns/lup-2026/lead`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...leadPayload, client_id: 'aspire-hr' }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || 'Failed to submit your details. Please try again.');
        }

        const bookingUrlRaw = payload.bookingUrl || fallbackBookingUrl;
        const bookingUrl = bookingUrlRaw && /^https?:\/\//i.test(bookingUrlRaw)
          ? bookingUrlRaw
          : `${schedulingBaseUrl.replace(/\/$/, '')}${String(bookingUrlRaw || '').startsWith('/') ? '' : '/'}${bookingUrlRaw || ''}`;
        const brochureUrl = payload.brochureUrl || defaultBrochureUrl;
        const isBrochure = formType === 'brochure_download';
        const successTitle = isBrochure
          ? 'Brochure Ready!'
          : formType === 'application'
            ? 'Application Received!'
            : 'Inquiry Sent!';
        const successMsg = isBrochure
          ? `Thank you, <strong>${data.firstName}</strong>. Your brochure link is ready below and we’ve also sent it to your email.`
          : formType === 'application'
            ? `Thank you, <strong>${data.firstName}</strong>. Our program team will review your application and contact you within 24 hours.`
            : `Thank you, <strong>${data.firstName}</strong>. Our team will reach out to you shortly to discuss the program.`;
        const primaryLabel = isBrochure ? 'Download Brochure' : 'Book Your Private Briefing';
        const primaryUrl = isBrochure ? brochureUrl : bookingUrl;

        container.innerHTML = `
          <div style="text-align:center; padding: 40px 0;">
            <div style="font-size: 3rem; margin-bottom: 16px;">✓</div>
            <h2 style="margin-bottom: 12px; color: var(--gold-400);">${successTitle}</h2>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">${successMsg}</p>
            ${primaryUrl ? `<a href="${primaryUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" data-analytics-event="success_primary_click" data-analytics-form="${formType}" data-analytics-label="${primaryLabel}" style="display:inline-block;margin-bottom:12px;">${primaryLabel}</a>` : ''}
            <a href="${bookingUrl}" class="btn btn-secondary" data-analytics-event="success_secondary_click" data-analytics-form="${formType}" data-analytics-label="Book a Private Briefing" style="display:inline-block;margin-left:${primaryUrl ? '8px' : '0'};margin-bottom:12px;">
              Book a Private Briefing
            </a>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">You can proceed instantly using the buttons above.</p>
            <button class="btn btn-secondary" style="margin-top: 24px;"
              onclick="document.getElementById('${modalId}').classList.remove('open'); document.body.style.overflow='';">
              Close
            </button>
          </div>
        `;
        trackEvent('form_submit_success', {
          form_id: formId,
          form_type: formType,
          extra: {
            primary_url_present: Boolean(primaryUrl),
            booking_url_present: Boolean(bookingUrl),
            brochure_url_present: Boolean(brochureUrl)
          }
        });
      } catch (err) {
        console.error('Lead API failed:', err);
        trackEvent('form_submit_error', {
          form_id: formId,
          form_type: formType,
          error_message: err instanceof Error ? err.message : 'Submission failed'
        });
        const errorEl = form.querySelector('[data-form-error]') || document.createElement('p');
        errorEl.setAttribute('data-form-error', '1');
        errorEl.style.color = '#ffb4b4';
        errorEl.style.fontSize = '0.82rem';
        errorEl.style.marginTop = '10px';
        errorEl.textContent = err instanceof Error ? err.message : 'Submission failed. Please try again.';
        if (!errorEl.parentElement) form.appendChild(errorEl);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    });
  }

  handleFormSubmit('application-form', 'apply-modal', 'application');
  handleFormSubmit('inquiry-form', 'inquiry-modal', 'inquiry');
  handleFormSubmit('brochure-form', 'brochure-modal', 'brochure_download');

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-analytics-event]');
    if (!el) return;
    trackEvent(el.getAttribute('data-analytics-event'), {
      form_type: el.getAttribute('data-analytics-form') || '',
      cta_label: el.getAttribute('data-analytics-label') || el.textContent.trim()
    });
  });

  // ---- Scroll animations (Intersection Observer) ----
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  // ---- Smooth scroll for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const navHeight = navbar.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });

  // ---- Mobile menu toggle (placeholder) ----
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      const navLinks = document.querySelector('.nav-links');
      navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '100%';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = 'rgba(6,13,24,0.98)';
      navLinks.style.padding = '20px 24px';
      navLinks.style.gap = '16px';
      navLinks.style.borderBottom = '1px solid rgba(212,160,23,0.2)';
    });
  }

});
