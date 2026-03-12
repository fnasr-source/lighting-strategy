/**
 * Admireworks Strategy Presentation Engine
 * Built for "The Slim Game" by Dr. Kareem Gamal
 * v2.0 - Premium Refinement
 */

// --- State Management ---
const state = {
  data: null,
  slides: [],
  currentSlideIndex: 0,
  mode: 'client', // 'client' or 'presenter'
  comments: JSON.parse(localStorage.getItem('aw_presentation_comments') || '{}'),
  versions: JSON.parse(localStorage.getItem('aw_presentation_versions') || '[]'),
  bc: new BroadcastChannel('aw-strategy-sync')
};

// --- Initialization ---
function init() {
  const params = new URLSearchParams(window.location.search);
  state.mode = params.get('mode') === 'presenter' ? 'presenter' : 'client';

  if (state.mode === 'presenter') {
    document.body.classList.add('mode-presenter');
    document.body.classList.remove('mode-client');
  } else {
    document.body.classList.add('mode-client');
    document.body.classList.remove('mode-presenter');
  }

  // Load Data
  const dataNode = document.getElementById('slide-data');
  if (dataNode) {
    state.data = JSON.parse(dataNode.textContent);
    state.slides = state.data.slides;
  }

  // Initial Render
  renderApp();

  // Navigation Event Listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleResize);

  // Sync Listeners
  state.bc.onmessage = (event) => {
    if (event.data.type === 'navigate' && state.mode === 'client') {
      navigateTo(event.data.slideIndex, false);
    }
  };

  // Initial Scale
  setTimeout(handleResize, 100);
}

// --- Navigation ---
function navigateTo(index, broadcast = true) {
  if (index < 0 || index >= state.slides.length) return;

  const oldSlide = document.querySelector('.slide.active');
  if (oldSlide) {
    oldSlide.classList.remove('active');
    setTimeout(() => renderSlide(), 50); // Small delay for transition
  } else {
    renderSlide();
  }

  state.currentSlideIndex = index;

  if (state.mode === 'presenter') {
    updatePresenterSidebar();
    updateNotesAndComments();
    renderNextPreview();
    updateProgressBar();
  }

  if (broadcast) {
    state.bc.postMessage({ type: 'navigate', slideIndex: index });
  }
}

function handleKeyDown(e) {
  switch (e.code) {
    case 'ArrowRight':
    case 'Space':
      navigateTo(state.currentSlideIndex + 1);
      break;
    case 'ArrowLeft':
      navigateTo(state.currentSlideIndex - 1);
      break;
    case 'Home':
      navigateTo(0);
      break;
    case 'End':
      navigateTo(state.slides.length - 1);
      break;
    case 'KeyF':
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
      break;
    case 'KeyC':
      if (state.mode === 'presenter') document.getElementById('comment-input').focus();
      break;
  }
}

// --- UI Updates ---
function updateProgressBar() {
  const progress = ((state.currentSlideIndex + 1) / state.slides.length) * 100;
  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = `${progress}%`;
}

// --- Scaling ---
function handleResize() {
  const viewport = document.querySelector('.slide-viewport');
  const scaler = document.querySelector('.slide-scaler');
  if (!viewport || !scaler) return;

  const vWidth = viewport.clientWidth;
  const vHeight = viewport.clientHeight;
  const sWidth = 1920;
  const sHeight = 1080;

  const scale = Math.min(vWidth / sWidth, vHeight / sHeight) * 0.96;
  // Use absolute centering with translation to prevent flexbox layout glitches
  scaler.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// --- Rendering Engine ---
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (state.mode === 'presenter') {
    const ui = document.createElement('div');
    ui.className = 'presenter-ui';
    ui.innerHTML = `
      <header class="presenter-header">
        <div style="display:flex; align-items:center; gap:20px;">
          <img src="assets/brand/brandmark.png" style="height:30px;">
          <div class="brand" style="font-weight:700; letter-spacing:1px;">ADMIREWORKS PRESENTATION — ${state.data.meta.client_name}</div>
        </div>
        <div class="version-control">
          V: <select class="version-select">
            <option value="1.0">v1.0 (Current)</option>
          </select>
        </div>
      </header>
      <div class="sidebar" id="sidebar"></div>
      <main class="slide-viewport">
        <div class="progress-container"><div class="progress-bar" id="progress-bar"></div></div>
        <div class="slide-scaler" id="slide-container"></div>
      </main>
      <aside class="right-panel">
        <section class="panel-section" style="flex: 0 0 auto;">
          <h3>مخطط السلايد القادم</h3>
          <div class="slide-viewport" style="background: #111; height: 180px; border-radius:10px; margin-bottom:10px;">
             <div class="slide-scaler" id="next-preview" style="transform: scale(0.08); transform-origin: top left;"></div>
          </div>
        </section>
        <section class="panel-section">
          <h3>ملاحظات العرض</h3>
          <div class="scroll-area" id="notes-view" style="font-family: var(--font-arabic);"></div>
        </section>
        <section class="panel-section">
          <h3>التعليقات</h3>
          <div class="scroll-area" id="comments-view"></div>
          <div class="comment-form" style="margin-top:15px; display:flex; gap:10px;">
            <input type="text" id="comment-input" placeholder="أضف تعليق..." style="flex:1; padding:10px; background:#222; border:1px solid #333; color:white; border-radius:5px;">
            <button onclick="addComment()" style="background:var(--aw-gold); color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;">إرسال</button>
          </div>
        </section>
      </aside>
      <footer class="presenter-footer">
        <div class="slide-counter" id="footer-counter" style="font-weight:700; color:var(--aw-gold);"></div>
        <div class="nav-buttons">
          <button onclick="navigateTo(state.currentSlideIndex - 1)">السابق</button>
          <button onclick="navigateTo(state.currentSlideIndex + 1)">التالي</button>
        </div>
        <div class="shortcuts" style="font-size:12px; color:#666;">F: Fullscreen | Space: Next | C: Comment</div>
      </footer>
    `;
    app.appendChild(ui);
    updatePresenterSidebar();
    updateProgressBar();
  } else {
    const viewport = document.createElement('div');
    viewport.className = 'slide-viewport';
    viewport.innerHTML = '<div class="slide-scaler" id="slide-container"></div>';
    app.appendChild(viewport);
  }

  renderSlide();
}

function renderSlide(targetId = 'slide-container', index = state.currentSlideIndex) {
  const container = document.getElementById(targetId);
  if (!container) return;

  const slideData = state.slides[index];
  if (!slideData) return;

  container.innerHTML = '';

  const slideEl = document.createElement('div');
  slideEl.className = `slide layout-${slideData.layout}`;

  // Custom Background for Section Dividers (NOT Cover)
  let bgHtml = '<div class="brand-pattern"></div>';
  if (slideData.layout === 'section-divider') {
    const imgSrc = `assets/generated/${slideData.id}.png`;
    bgHtml += `<img src="${imgSrc}" class="bg-image" onerror="this.style.display='none'">`;
  }

  slideEl.innerHTML = `
    ${bgHtml}
    <div class="slide-header" ${['cover', 'section-divider'].includes(slideData.layout) ? 'style="display:none;"' : ''}>
      <img src="assets/brand/brandmark.png" style="width: 80px;" onerror="this.style.display='none'">
      ${slideData.content.badge ? `<div class="slide-badge">${slideData.content.badge}</div>` : ''}
    </div>
    <div class="slide-content" style="flex:1; display:flex; flex-direction:column; justify-content:center;">
      ${renderSlideContent(slideData)}
    </div>
    <div class="slide-footer" style="position: absolute; bottom: 100px; left: 100px; z-index: 10; ${['cover', 'section-divider'].includes(slideData.layout) ? 'display:none;' : ''}">
       <img src="assets/brand/logo.png" style="height: 40px;" onerror="this.style.display='none'">
    </div>
  `;

  container.appendChild(slideEl);

  // Trigger entry animation
  requestAnimationFrame(() => {
    slideEl.classList.add('active');
  });

  if (state.mode === 'presenter' && targetId === 'slide-container') {
    const counter = document.getElementById('footer-counter');
    if (counter) counter.textContent = `السلايد ${index + 1} / ${state.slides.length}`;
  }
}

function renderNextPreview() {
  if (state.currentSlideIndex + 1 < state.slides.length) {
    renderSlide('next-preview', state.currentSlideIndex + 1);
  } else {
    document.getElementById('next-preview').innerHTML = '<div class="slide" style="background:#000; color:white; justify-content:center; align-items:center;">النهاية</div>';
  }
}

function renderSlideContent(slide) {
  const { layout, content } = slide;

  switch (layout) {
    case 'cover':
      return `
        <div class="brand-mark">
          <img src="assets/brand/brandmark.png" style="width: 240px; margin-bottom:40px;">
        </div>
        <div class="slide-title">${content.title}</div>
        <div class="slide-subtitle">${content.subtitle || ''}</div>
        <div class="client-info">
          <div style="font-size: 56px; margin-bottom: 20px; color:var(--aw-navy);">${content.client_name}</div>
          <div style="font-size: 32px; opacity: 0.8; color:var(--aw-navy);">${content.presenter}</div>
          <div style="font-size: 24px; color: var(--aw-gold); margin-top: 20px;">${content.period}</div>
        </div>
      `;

    case 'section-divider':
      return `
        <div class="slide-title" style="color:white; z-index:10;">${content.section_title}</div>
        <div class="slide-badge" style="z-index:10; margin-top:40px;">${content.badge || 'ADMIRE8 BY ADMIREWORKS'}</div>
      `;

    case 'grid-6':
      return `
        <div class="grid-6-container">
          ${content.boxes.map(box => `
            <div class="grid-6-item">
              <div class="grid-6-number" style="font-family:var(--font-headline); font-size:48px; opacity:0.2; color:var(--aw-navy);">${box.number}</div>
              <div class="grid-6-title" style="font-size:36px; font-weight:700; color:var(--aw-navy);">${box.title}</div>
            </div>
          `).join('')}
        </div>
      `;

    case 'title-image':
    case 'image-title':
      const isReverse = layout === 'image-title';
      return `
        <div class="layout-split" style="grid-template-areas: '${isReverse ? 'img txt' : 'txt img'}';">
          <div class="text-side" style="grid-area: txt;">
            <div class="slide-title">${content.title}</div>
            <div class="slide-body">${content.body ? content.body.replace(/\n/g, '<br>') : ''}</div>
            ${content.stats ? `
              <div style="margin-top: 60px; display:grid; gap:30px;">
                 ${content.stats.map(s => `
                   <div style="display:flex; align-items:center; gap:30px; font-size:32px; background:var(--aw-off-white); padding:20px 30px; border-radius:15px; border-right:10px solid var(--aw-gold);">
                     <span style="font-size:48px;">${s.icon}</span>
                     <span style="font-weight:700; color:var(--aw-navy);">${s.text}</span>
                   </div>
                 `).join('')}
              </div>
            ` : ''}
          </div>
          <div class="image-side" style="grid-area: img;">
            <div class="slide-image-container">
              <img src="${content.image_src || `assets/generated/${slide.id}.png`}" onerror="this.src='data:image/svg+xml,%3Csvg width=%22800%22 height=%22600%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23001a70%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2224%22 fill=%22%23cc9f53%22 text-anchor=%22middle%22%3EIMAGE: ${slide.id}%3C/text%3E%3C/svg%3E'">
            </div>
          </div>
        </div>
      `;

    case 'grid-3':
      return `
        <div class="slide-title">${content.title}</div>
        <div class="grid-3-container" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:40px; margin-top:40px;">
          ${content.items.map(item => `
            <div class="grid-3-item" style="background:var(--aw-off-white); padding:50px; border-radius:30px; border:1px solid var(--aw-light-gray);">
              <div class="grid-3-icon" style="font-size:80px; margin-bottom:30px;">${item.icon}</div>
              <div class="grid-3-title" style="font-size:40px; margin-bottom:20px; color:var(--aw-navy);">${item.title}</div>
              <div class="grid-3-body" style="font-size:24px;">${item.body}</div>
            </div>
          `).join('')}
        </div>
      `;

    case 'title-bullets':
      return `
        <div class="slide-title">${content.title}</div>
        <div class="scrollable-content" style="margin-top: 40px;">
          <ul style="padding: 0;">
            ${content.bullets.map(b => `
              <li>
                <span>•</span>
                <span>${b}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;

    case 'stat-highlight':
      return `
        <div class="layout-stat-highlight">
          <div class="stat-number">${content.stat_number || (content.stats ? content.stats[0].number : '')}</div>
          <div class="stat-label">${content.stat_label || (content.stats ? content.stats[0].label : '')}</div>
          ${content.context ? `<div class="stat-context" style="font-size:36px; margin-top:60px; max-width:1400px; color:var(--aw-medium-gray);">${content.context}</div>` : ''}
          ${content.stats && content.stats.length > 1 ? `
            <div class="grid-3-container" style="display:grid; grid-template-columns: repeat(${content.stats.length}, 1fr); margin-top: 100px; gap:60px;">
              ${content.stats.map(s => `
                <div class="grid-3-item">
                  <div class="stat-number" style="font-size: 100px;">${s.number}</div>
                  <div class="stat-label" style="font-size: 32px; color:var(--aw-navy);">${s.label}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;

    case 'comparison-table':
      return `
        <div class="slide-title">${content.title}</div>
        <div class="comparison-table-container">
          <table>
            <thead>
              <tr>
                ${content.headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${content.rows.map(row => `
                <tr>
                  ${row.map(cell => `<td>${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${content.footnote ? `<div style="margin-top: 40px; opacity: 0.6; font-size: 24px; font-style:italic;">* ${content.footnote}</div>` : ''}
      `;

    case 'persona':
      return `
        <div class="slide-title">${content.name}</div>
        <div class="persona-container" style="display:grid; grid-template-columns: 500px 1fr; gap:80px; margin-top:40px;">
          <div class="persona-avatar" style="height:600px; border-radius:30px; overflow:hidden; border:8px solid var(--aw-gold); box-shadow:0 30px 60px rgba(0,0,0,0.2);">
            <img src="assets/generated/${slide.id}.png" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='data:image/svg+xml,%3Csvg width=%22500%22 height=%22600%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23e8e6e1%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2224%22 fill=%22%23001a70%22 text-anchor=%22middle%22%3EAVATAR%3C/text%3E%3C/svg%3E'">
          </div>
          <div class="persona-details" style="display:flex; flex-direction:column; gap:40px;">
            <div class="persona-section">
              <h4 style="font-size:28px; color:var(--aw-gold); border-bottom:3px solid var(--aw-gold); display:inline-block; margin-bottom:20px; padding-bottom:5px;">البيانات الديموغرافية</h4>
              <div class="slide-body" style="font-size:30px; display:grid; gap:10px;">
                ${Object.entries(content.demographics).map(([k, v]) => `<div><strong style="color:var(--aw-navy);">${k}:</strong> ${v}</div>`).join('')}
              </div>
            </div>
            <div class="persona-section">
              <h4 style="font-size:28px; color:var(--aw-gold); border-bottom:3px solid var(--aw-gold); display:inline-block; margin-bottom:20px; padding-bottom:5px;">البيانات السيكوغرافية</h4>
              <div class="slide-body" style="font-size:30px; display:grid; gap:20px;">
                ${content.psychographics.goals ? `<div><strong style="color:var(--aw-navy);">الأهداف:</strong> ${content.psychographics.goals.join(', ')}</div>` : ''}
                ${content.psychographics.pain_points ? `<div><strong style="color:var(--aw-navy);">نقاط الألم:</strong> ${content.psychographics.pain_points.join(', ')}</div>` : ''}
                ${content.psychographics.discovery ? `<div><strong style="color:var(--aw-navy);">كيف تكتشفنا:</strong> ${content.psychographics.discovery.join(', ')}</div>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;

    case 'persona-samples':
      return `
        <div class="grid-3-container" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:30px; margin-top:40px;">
          ${content.personas.map(p => `
            <div class="grid-3-item" style="background: white; padding: 40px; border-radius:30px; border: 2px solid var(--aw-light-gray); text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.05);">
              <div style="font-size: 100px; margin-bottom:20px;">👩</div>
              <div class="grid-3-title" style="font-size: 36px; margin-bottom:15px; color:var(--aw-navy);">${p.name}</div>
              <div style="font-size: 24px; color:var(--aw-medium-gray); margin-bottom:25px;">${p.age} سنة | ${p.location}</div>
              <div style="font-size: 24px; font-style: italic; color:var(--aw-dark-gray); line-height:1.4;">"${p.motivation}"</div>
            </div>
          `).join('')}
        </div>
      `;

    case 'funnel':
      return `
        <div class="slide-title">${content.title}</div>
        <div class="funnel-container" style="display:flex; flex-direction:column; align-items:center; margin-top:40px; gap:15px;">
          ${content.steps ? content.steps.map((step, i) => `
            <div class="funnel-step" style="width:80%; background:white; padding:30px 45px; border-radius:20px; display:flex; align-items:center; gap:40px; box-shadow:0 15px 35px rgba(0,0,0,0.05); border-right:15px solid var(--aw-navy);">
              <div class="funnel-step-number" style="background:var(--aw-gold); color:white; width:70px; height:70px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:40px; font-weight:700;">${step.number}</div>
              <div class="slide-body" style="font-weight:700; font-size:40px;">${step.label}</div>
            </div>
            ${i < content.steps.length - 1 ? '<div style="color:var(--aw-gold); font-size:40px;">▼</div>' : ''}
          `).join('') : ''}
        </div>
      `;

    case 'ad-copy':
      const hasFullText = content.ads && content.ads.some(a => a.primary_text);
      const adCols = content.ads && content.ads.length > 4 ? 'repeat(3, 1fr)' : content.ads && content.ads.length <= 3 ? 'repeat(1, 1fr)' : 'repeat(2, 1fr)';
      return `
        <div class="slide-title" style="font-size:44px;">${content.title}</div>
        <div class="ad-copy-container" style="display:grid; grid-template-columns: ${hasFullText ? 'repeat(auto-fit, minmax(400px, 1fr))' : adCols}; gap:${hasFullText ? '24px' : '40px'}; margin-top:30px; overflow-y:auto; max-height:720px;">
          ${content.ads ? content.ads.map(ad => `
            <div class="ad-card" style="background:white; padding:${hasFullText ? '24px 28px' : '45px'}; border-radius:${hasFullText ? '20px' : '30px'}; border-right:${hasFullText ? '8px' : '12px'} solid var(--aw-gold); box-shadow:0 20px 50px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:${hasFullText ? '10px' : '20px'};">
              <h4 style="font-size:${hasFullText ? '22px' : '32px'}; color:var(--aw-navy); font-weight:700;">${ad.angle || ad.headline}</h4>
              <div style="color: var(--aw-gold); font-weight: 700; font-size:${hasFullText ? '18px' : '24px'};">العنوان: ${ad.headline || ''}</div>
              <div style="font-size:${hasFullText ? '16px' : '28px'}; line-height:1.4; opacity:0.7;">${ad.hook || ''}</div>
              ${ad.primary_text ? `<div style="font-size:16px; line-height:1.6; white-space:pre-line; border-top:1px solid #eee; padding-top:10px; color:#333;">${ad.primary_text}</div>` : ''}
              ${ad.description ? `<div style="font-size:14px; opacity:0.6; border-top:1px solid #f0f0f0; padding-top:8px;">📝 ${ad.description}</div>` : ''}
            </div>
          `).join('') : ''}
        </div>
        ${content.cta ? `<div class="slide-badge" style="margin-top: 30px; align-self:center; font-size:28px; padding:16px 40px;">CTA: ${content.cta}</div>` : ''}
      `;

    case 'closing':
      return `
        <div class="slide-title" style="font-size:120px; color:var(--aw-gold);">${content.title}</div>
        <div class="slide-subtitle" style="font-size:60px; color:white; opacity:0.8;">${content.subtitle}</div>
        <div class="contact-info" style="margin-top:80px; display:grid; gap:20px; color:white;">
          <div style="font-size:36px; font-weight:700;">${content.contact.phone}</div>
          <div style="font-size:36px; opacity:0.9;">${content.contact.email}</div>
          <div style="font-size:36px; color:var(--aw-gold);">${content.contact.website}</div>
          <div style="opacity: 0.5; font-size: 24px;">${content.contact.address}</div>
        </div>
        <div style="margin-top: 100px;">
          <img src="assets/brand/logo.png" style="height: 100px;">
        </div>
      `;

    default:
      return `<div class="slide-title">Layout ${layout} not implemented</div>`;
  }
}

// --- Presenter Logic ---
function updatePresenterSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = '';
  state.slides.forEach((slide, i) => {
    const thumb = document.createElement('div');
    thumb.className = `thumbnail ${state.currentSlideIndex === i ? 'active' : ''}`;
    thumb.style.marginBottom = '20px';
    thumb.style.cursor = 'pointer';
    thumb.style.padding = '10px';

    thumb.innerHTML = `
      <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">${i + 1}. ${slide.section}</div>
      <div style="background: #111; height: 100px; display: flex; align-items: center; justify-content: center; font-size: 10px; border-radius:8px; overflow:hidden;">
        ${slide.layout.toUpperCase()}
      </div>
    `;
    thumb.onclick = () => navigateTo(i);
    sidebar.appendChild(thumb);
  });
}

function updateNotesAndComments() {
  const notesView = document.getElementById('notes-view');
  const slide = state.slides[state.currentSlideIndex];
  if (notesView) notesView.textContent = slide.presenter_notes || 'لا توجد ملاحظات لهذا العرض.';

  const commentsView = document.getElementById('comments-view');
  if (commentsView) {
    const slideComments = state.comments[slide.id] || [];
    commentsView.innerHTML = slideComments.map(c => `
      <div class="comment-item" style="background:#1a1a1f; padding:15px; margin-bottom:10px; border-radius:10px; border-right:4px solid var(--aw-gold);">
        <div class="comment-meta" style="font-size:12px; color:#666; margin-bottom:5px;">${c.author} • ${new Date(c.date).toLocaleString('ar-EG')}</div>
        <div style="font-size:14px;">${c.text}</div>
      </div>
    `).join('') || '<div style="opacity:0.3; text-align:center; padding:20px;">لا توجد تعليقات.</div>';
  }
}

function addComment() {
  const input = document.getElementById('comment-input');
  const text = input.value.trim();
  if (!text) return;

  const slideId = state.slides[state.currentSlideIndex].id;
  if (!state.comments[slideId]) state.comments[slideId] = [];

  state.comments[slideId].push({
    author: 'المحاضر',
    date: new Date().toISOString(),
    text: text,
    resolved: false
  });

  localStorage.setItem('aw_presentation_comments', JSON.stringify(state.comments));
  input.value = '';
  updateNotesAndComments();
}

// Kickoff
window.onload = init;
