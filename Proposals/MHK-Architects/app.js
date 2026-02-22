/**
 * Basseqat Proposal Presentation Engine
 * v3.0 - Total Renovation
 */

const state = {
  data: null,
  slides: [],
  currentSlideIndex: 0,
  mode: 'client',
  bc: new BroadcastChannel('aw-strategy-sync')
};

function init() {
  const params = new URLSearchParams(window.location.search);
  state.mode = params.get('mode') === 'presenter' ? 'presenter' : 'client';

  const dataNode = document.getElementById('slide-data');
  if (dataNode) {
    state.data = JSON.parse(dataNode.textContent);
    state.slides = state.data.slides;
  }

  renderApp();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleResize);

  state.bc.onmessage = (event) => {
    if (event.data.type === 'navigate' && state.mode === 'client') {
      navigateTo(event.data.slideIndex, false);
    }
  };

  setTimeout(handleResize, 100);
}

function navigateTo(index, broadcast = true) {
  if (index < 0 || index >= state.slides.length) return;
  state.currentSlideIndex = index;
  renderSlide();
  if (broadcast) {
    state.bc.postMessage({ type: 'navigate', slideIndex: index });
  }
}

function handleKeyDown(e) {
  switch (e.code) {
    case 'ArrowRight':
    case 'Space': navigateTo(state.currentSlideIndex + 1); break;
    case 'ArrowLeft': navigateTo(state.currentSlideIndex - 1); break;
    case 'Home': navigateTo(0); break;
    case 'End': navigateTo(state.slides.length - 1); break;
    case 'KeyF':
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
      break;
  }
}

function handleResize() {
  const viewport = document.querySelector('.slide-viewport');
  const scaler = document.querySelector('.slide-scaler');
  if (!viewport || !scaler) return;
  const vWidth = viewport.clientWidth;
  const vHeight = viewport.clientHeight;
  const sWidth = 1920;
  const sHeight = 1080;
  const scale = Math.min(vWidth / sWidth, vHeight / sHeight) * 0.98;
  scaler.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function renderApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const isPrint = urlParams.get('print') === 'true';

  const app = document.getElementById('app');

  if (isPrint) {
    document.body.classList.add('print-mode');
    app.innerHTML = '<div id="print-container"></div>';
    const container = document.getElementById('print-container');

    // Render ALL slides
    state.slides.forEach((slide, index) => {
      const slideWrapper = document.createElement('div');
      slideWrapper.className = 'print-slide-wrapper';

      const slideEl = document.createElement('div');
      slideEl.className = `slide layout-${slide.layout} active`;
      slideEl.style.position = 'relative'; // Override absolute pos for print

      // Header logic (same as renderSlide)
      const showHeader = !['cover', 'closing', 'title-bullets'].includes(slide.layout);
      const headerHtml = showHeader ? `
        <div class="slide-header">
          <img src="assets/brand/brandmark.png" class="brand-mark-mini">
        </div>
      ` : '';

      slideEl.innerHTML = `
        <div class="brand-pattern"></div>
        ${headerHtml}
        <div class="slide-content">
          ${renderSlideContent(slide)}
        </div>
      `;

      slideWrapper.appendChild(slideEl);
      container.appendChild(slideWrapper);
    });
  } else {
    // Normal Interactive Mode
    app.innerHTML = `
      <div class="slide-viewport">
        <div class="slide-scaler" id="slide-container"></div>
      </div>
    `;
    renderSlide();
  }
}

function renderSlide() {
  const container = document.getElementById('slide-container');
  if (!container) return;
  const slideData = state.slides[state.currentSlideIndex];
  if (!slideData) return;

  container.innerHTML = '';
  const slideEl = document.createElement('div');
  slideEl.className = `slide layout-${slideData.layout}`;

  // Global Header (Brandmark) - except on cover/closing/title-bullets
  const showHeader = !['cover', 'closing', 'title-bullets'].includes(slideData.layout);
  const headerHtml = showHeader ? `
    <div class="slide-header">
      <img src="assets/brand/brandmark.png" class="brand-mark-mini">
    </div>
  ` : '';

  slideEl.innerHTML = `
    <div class="brand-pattern"></div>
    ${headerHtml}
    <div class="slide-content">
      ${renderSlideContent(slideData)}
    </div>
  `;

  container.appendChild(slideEl);
  requestAnimationFrame(() => slideEl.classList.add('active'));
}

function renderSlideContent(slide) {
  const { layout, content } = slide;

  switch (layout) {
    case 'cover':
      return `
        <img src="assets/brand/brandmark.png" class="brand-mark-large">
        <div class="slide-title">${content.title}</div>
        <div class="slide-subtitle">${content.subtitle}</div>
        <div class="client-info">
          <div>${content.client_name}</div>
          <div>${content.presenter}</div>
          <div>${content.period}</div>
        </div>
      `;

    case 'hero-split': // Renovated to Strategic Grid Layout
      return `
        <div class="layout-strategic-grid">
          <div class="strategic-intro">
            <div class="slide-title">${content.title}</div>
            <div class="slide-body">${content.body}</div>
          </div>
          <div class="strategic-grid-container">
            ${content.highlights.map(h => `
              <div class="strategic-card">
                <div class="strategic-icon">${h.icon}</div>
                <h3>${h.label}</h3>
                <p>${h.text}</p>
              </div>
            `).join('')}
          </div>
          <img src="assets/generated/exec-visual.png">
        </div>
      `;

    case 'title-bullets':
      return `
        ${content.badge ? `<div class="slide-badge">${content.badge}</div>` : ''}
        <div class="slide-title">${content.title}</div>
        ${content.subtitle ? `<div class="slide-subtitle">${content.subtitle}</div>` : ''}
        <div class="slide-content">
          <ul>
            ${content.bullets.map(b => `<li>${b}</li>`).join('')}
          </ul>
          <div class="investment-row">
            <div class="investment-box">
              <div class="investment-price">${content.investment.amount}</div>
              <div>${content.investment.type} · ${content.investment.timeline}</div>
              ${content.optional ? `<div style="color:var(--aw-gold);">Optional: ${content.optional}</div>` : ''}
              ${content.note ? `<div style="opacity:0.6;">${content.note}</div>` : ''}
            </div>
            <div class="investment-brand">
              <img src="assets/brand/brandmark.png" class="brand-mark-investment">
            </div>
          </div>
        </div>
      `;

    case 'pricing-cards':
      return `
        <div class="slide-title" style="text-align:center;">${content.title}</div>
        <div class="cards-container">
          ${content.cards.map(card => `
            <div class="pricing-card ${card.featured ? 'featured' : ''}">
              <div class="card-name">${card.name}</div>
              <div class="card-subtitle">${card.subtitle}</div>
              <div class="card-price">${card.price}</div>
              <div class="card-price-note">${card.price_note}</div>
              <ul class="card-features">
                ${card.features.map(f => `<li>${f}</li>`).join('')}
              </ul>
              <div class="card-monthly">${card.monthly}</div>
            </div>
          `).join('')}
        </div>
      `;

    case 'grid-3':
      return `
        <div class="slide-title">${content.title}</div>
        <div class="grid-3-container">
          ${content.items.map(item => `
            <div class="grid-card">
              <div>
                <h3>${item.title}</h3>
                <h4>${item.subtitle}</h4>
                <div class="slide-body" style="font-size:18px;">${item.body}</div>
              </div>
              <div>
                <div class="price">${item.price}</div>
                ${item.note ? `<div style="font-size:12px; opacity:0.5;">${item.note}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;

    case 'closing':
      return `
        <img src="assets/generated/closing-bg.png" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; opacity:0.3; z-index:0;">
        <div style="position:relative; z-index:1; display:flex; flex-direction:column; align-items:center;">
          <div class="slide-title">${content.title}</div>
          <div class="slide-subtitle">${content.subtitle}</div>
          <div class="contact-info">
            <div>${content.contact.email}</div>
            <div>${content.contact.website}</div>
          </div>
          <img src="assets/brand/logo.png" class="logo-closing">
        </div>
      `;

    default:
      return `<div class="slide-title">Layout ${layout} not implemented</div>`;
  }
}

window.onload = init;
