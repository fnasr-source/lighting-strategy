/* ============================================
   LEADING UNDER PRESSURE 2026 — Interactivity
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const schedulingBaseUrl = window.__SCHEDULING_BASE_URL || 'https://my.admireworks.com';

  // ---- UTM Tracking & Lead Attribution ----
  const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'ref', 'gclid', 'fbclid'];

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

  function generateLeadId() {
    // Compact unique ID: timestamp + random
    return 'LUP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // Capture UTM on page load
  captureUTM();

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

  function openModal(modal) {
    if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
  }
  function closeModal(modal) {
    if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
  }

  // Primary CTA → full application
  document.querySelectorAll('[data-action="apply"]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); openModal(applyModal); });
  });

  // Secondary CTA → quick inquiry
  document.querySelectorAll('[data-action="inquiry"]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); openModal(inquiryModal); });
  });

  // Close buttons
  applyModal?.querySelector('.close-modal')?.addEventListener('click', () => closeModal(applyModal));
  inquiryModal?.querySelector('.close-modal')?.addEventListener('click', () => closeModal(inquiryModal));

  // Close on backdrop click
  [applyModal, inquiryModal].forEach(m => {
    m?.addEventListener('click', (e) => { if (e.target === m) closeModal(m); });
  });

  // ---- Form submission helper ----
  function handleFormSubmit(formId, modalId, formType) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
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

      // Show success
      const container = form.closest('.apply-form-container');
      const successTitle = formType === 'application' ? 'Application Received!' : 'Inquiry Sent!';
      const successMsg = formType === 'application'
        ? `Thank you, <strong>${data.firstName}</strong>. Our program team will review your application and contact you within 24 hours.`
        : `Thank you, <strong>${data.firstName}</strong>. Our team will reach out to you shortly to discuss the program.`;

      const fallbackBookingUrl = `${schedulingBaseUrl}/book/discovery-call?name=${encodeURIComponent(data.firstName || '')}&email=${encodeURIComponent(data.email || '')}`;

      container.innerHTML = `
        <div style="text-align:center; padding: 40px 0;">
          <div style="font-size: 3rem; margin-bottom: 16px;">✓</div>
          <h2 style="margin-bottom: 12px; color: var(--gold-400);">${successTitle}</h2>
          <p style="color: var(--text-secondary); margin-bottom: 24px;">${successMsg}</p>
          <a href="${fallbackBookingUrl}" class="btn btn-primary" style="display:inline-block;margin-bottom:12px;">
            Book Your Private Briefing
          </a>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">You can book immediately using the button above.</p>
          <button class="btn btn-secondary" style="margin-top: 24px;"
            onclick="document.getElementById('${modalId}').classList.remove('open'); document.body.style.overflow='';">
            Close
          </button>
        </div>
      `;

      // Send through API bridge (stores lead + sends booking follow-up email)
      (async () => {
        try {
          const res = await fetch(`${schedulingBaseUrl}/api/campaigns/lup-2026/lead`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...leadPayload, client_id: 'aspire-hr' }),
          });
          const payload = await res.json().catch(() => ({}));
          const bookingUrl = payload.bookingUrl || fallbackBookingUrl;
          const bookingAnchor = container.querySelector('a.btn.btn-primary');
          if (bookingAnchor) bookingAnchor.href = bookingUrl;
          if (!res.ok) console.error('Lead API failed:', payload.error || res.statusText);
        } catch (err) {
          console.error('Failed to submit lead via API:', err);
        }
      })();
    });
  }

  handleFormSubmit('application-form', 'apply-modal', 'application');
  handleFormSubmit('inquiry-form', 'inquiry-modal', 'inquiry');

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
