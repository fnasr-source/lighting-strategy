/* ===== Simulations Labs — Client Report JS ===== */

document.addEventListener('DOMContentLoaded', () => {
    renderCampaignChart();
    renderLeadDonut();
    renderSourceChart();
    renderMeetingChart();
    renderWorkstreams();
    initNavigation();
    initScrollAnimations();
});

/* ===== CAMPAIGN BAR CHART ===== */
function renderCampaignChart() {
    const container = document.getElementById('campaign-chart');
    if (!container) return;
    const data = [
        { label: 'Emails Sent', sec: 844, ctf: 825 },
        { label: 'New Contacted', sec: 466, ctf: 361 },
        { label: 'Completed', sec: 106, ctf: 192 },
        { label: 'Replies', sec: 1, ctf: 1 }
    ];
    const maxVal = Math.max(...data.map(d => d.sec + d.ctf));

    let html = '<div style="display:flex;gap:8px;margin-bottom:16px;justify-content:flex-end"><span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted)"><span style="width:10px;height:10px;border-radius:2px;background:var(--aw-navy-light)"></span>Security Pros</span><span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted)"><span style="width:10px;height:10px;border-radius:2px;background:var(--aw-gold)"></span>CTF Organizers</span></div>';

    data.forEach(d => {
        const totalPct = ((d.sec + d.ctf) / maxVal * 100);
        const secPct = (d.sec / (d.sec + d.ctf) * totalPct);
        const ctfPct = (d.ctf / (d.sec + d.ctf) * totalPct);
        html += `<div class="bar-row">
      <div class="bar-label">${d.label}</div>
      <div class="bar-track">
        <div style="display:flex;width:${totalPct}%;height:100%">
          <div style="width:${secPct / (secPct + ctfPct) * 100}%;height:100%;background:var(--aw-navy-light);border-radius:4px 0 0 4px"></div>
          <div style="width:${ctfPct / (secPct + ctfPct) * 100}%;height:100%;background:var(--aw-gold);border-radius:0 4px 4px 0;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:10px;font-weight:600;color:var(--bg-primary)">${(d.sec + d.ctf).toLocaleString()}</div>
        </div>
      </div>
    </div>`;
    });
    container.innerHTML = html;
}

/* ===== LEAD PRIORITY DONUT ===== */
function renderLeadDonut() {
    const container = document.getElementById('lead-donut');
    if (!container) return;
    const data = [
        { label: 'Hot (Priority A)', value: 22, color: '#ef4444' },
        { label: 'Warm (Priority B)', value: 39, color: '#f59e0b' },
        { label: 'Low (Priority C)', value: 7, color: '#3b82f6' },
        { label: 'Unscored', value: 1, color: '#4b5563' }
    ];
    const total = data.reduce((s, d) => s + d.value, 0);
    const r = 54, cx = 70, cy = 70, stroke = 14;
    const circ = 2 * Math.PI * r;
    let offset = 0;

    let paths = '';
    data.forEach(d => {
        const pct = d.value / total;
        const dash = circ * pct;
        const gap = circ - dash;
        paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" opacity="0.85"/>`;
        offset += dash;
    });

    let legend = '';
    data.forEach(d => {
        legend += `<div class="legend-item"><div class="legend-dot" style="background:${d.color}"></div><span class="legend-label">${d.label}</span><span class="legend-value">${d.value}</span></div>`;
    });

    container.innerHTML = `
    <svg class="donut-svg" viewBox="0 0 140 140">${paths}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text-primary)" font-size="22" font-weight="800">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="var(--text-muted)" font-size="9">LEADS</text>
    </svg>
    <div class="donut-legend">${legend}</div>`;
}

/* ===== SOURCE BAR CHART ===== */
function renderSourceChart() {
    const container = document.getElementById('source-chart');
    if (!container) return;
    const data = [
        { label: 'AI Everything Event', value: 35 },
        { label: 'Cold Outreach', value: 21 },
        { label: 'Direct Outreach', value: 10 },
        { label: 'Demo Requests', value: 1 },
        { label: 'Referrals', value: 2 }
    ];
    const maxVal = Math.max(...data.map(d => d.value));
    let html = '';
    data.forEach(d => {
        const pct = (d.value / maxVal * 100);
        html += `<div class="bar-row">
      <div class="bar-label">${d.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%">${d.value}</div></div>
    </div>`;
    });
    container.innerHTML = html;
}

/* ===== MEETING CADENCE ===== */
function renderMeetingChart() {
    const container = document.getElementById('meeting-chart');
    if (!container) return;
    const data = [
        { month: 'May', count: 1 }, { month: 'Jun', count: 0 }, { month: 'Jul', count: 3 },
        { month: 'Aug', count: 1 }, { month: 'Sep', count: 1 }, { month: 'Oct', count: 3 },
        { month: 'Nov', count: 2 }, { month: 'Dec', count: 5 }, { month: 'Jan', count: 4 },
        { month: 'Feb', count: 2 }
    ];
    const maxVal = Math.max(...data.map(d => d.count));

    let html = '<div style="display:flex;gap:8px;align-items:flex-end;height:100px;padding-top:8px">';
    data.forEach(d => {
        const h = d.count > 0 ? (d.count / maxVal * 80) : 3;
        html += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
      <span style="font-size:10px;font-weight:600;color:var(--text-secondary)">${d.count || ''}</span>
      <div style="width:100%;height:${h}px;background:${d.count > 0 ? 'linear-gradient(180deg,var(--aw-gold),var(--aw-navy))' : 'rgba(255,255,255,0.03)'};border-radius:3px"></div>
      <span style="font-size:9px;color:var(--text-muted)">${d.month}</span>
    </div>`;
    });
    html += '</div><div style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center">22 SimLabs meetings (May 2025 – Feb 2026) · excluding non-SimLabs sessions</div>';
    container.innerHTML = html;
}

/* ===== WORKSTREAM PROGRESS ===== */
function renderWorkstreams() {
    const container = document.getElementById('workstream-grid');
    if (!container) return;
    const data = [
        { name: 'Cold Outreach', status: 'Active', progress: 75, detail: '2 campaigns live, sequences running' },
        { name: 'Lead Pipeline', status: 'Active', progress: 60, detail: '69 leads unified, 22 hot leads identified' },
        { name: 'Google Ads', status: 'Completed', progress: 100, detail: 'Campaign launched and running' },
        { name: 'SEO & Content', status: 'In Progress', progress: 45, detail: 'Audit done, blog calendar starting' },
        { name: 'Social Media', status: 'In Progress', progress: 35, detail: 'Creatives ready, campaign brief pending' },
        { name: 'Landing Pages', status: 'Completed', progress: 100, detail: 'Audience-specific variants live' },
        { name: 'Email Automation', status: 'In Progress', progress: 50, detail: '75 contacts in Systeme, 23 tagged' },
        { name: 'Analytics Setup', status: 'Pending', progress: 15, detail: 'GA/GSC connection needed' }
    ];

    let html = '';
    data.forEach(ws => {
        const statusClass = ws.status.toLowerCase().replace(/\s+/g, '-');
        const fillClass = ws.progress >= 70 ? 'high' : ws.progress >= 35 ? 'mid' : 'low';
        html += `<div class="ws-card">
      <div class="ws-header"><span class="ws-name">${ws.name}</span><span class="ws-status ${statusClass}">${ws.status}</span></div>
      <div class="ws-detail">${ws.detail}</div>
      <div class="ws-bar"><div class="ws-fill ${fillClass}" style="width:${ws.progress}%"></div></div>
    </div>`;
    });
    container.innerHTML = html;
}

/* ===== NAVIGATION ===== */
function initNavigation() {
    const links = document.querySelectorAll('.nav-links a');
    const sections = [];
    links.forEach(a => {
        const id = a.getAttribute('href')?.replace('#', '');
        if (id) sections.push({ id, el: document.getElementById(id), link: a });
    });

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY + 100;
        let active = sections[0];
        sections.forEach(s => {
            if (s.el && s.el.offsetTop <= scrollY) active = s;
        });
        links.forEach(a => a.classList.remove('active'));
        if (active) active.link.classList.add('active');

        // Nav shadow
        const nav = document.getElementById('nav');
        if (nav) nav.style.boxShadow = window.scrollY > 50 ? '0 4px 20px rgba(0,0,0,0.3)' : 'none';
    });
}

/* ===== SCROLL ANIMATIONS ===== */
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.style.opacity = '1';
                e.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.kpi-card, .work-card, .chart-card, .insight-card, .blocker-card, .ws-card, .plan-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
}
