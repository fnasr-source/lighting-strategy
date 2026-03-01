/* ===== Simulations Labs — Client Report JS ===== */
document.addEventListener('DOMContentLoaded', () => {
    renderApolloPipeline();
    renderLeadDonut();
    renderRoleChart();
    renderSourceChart();
    renderStatusChart();
    renderCampaignChart();
    initNavigation();
    initScrollAnimations();
});

/* ===== APOLLO PIPELINE ===== */
function renderApolloPipeline() {
    const container = document.getElementById('apollo-pipeline');
    if (!container) return;
    const data = [
        { label: 'Security Engineers', count: 1100, status: 'Ready for outreach' },
        { label: 'CTF Organizers', count: 521, status: 'Ready for outreach' },
        { label: 'Security Consultants', count: 300, status: 'Ready for outreach' }
    ];
    const maxVal = Math.max(...data.map(d => d.count));

    let html = '';
    data.forEach(d => {
        const pct = (d.count / maxVal * 100);
        html += `<div class="apollo-bar-row">
      <div class="apollo-label">${d.label}</div>
      <div class="apollo-bar-track"><div class="apollo-bar-fill" style="width:${pct}%">${d.count.toLocaleString()}</div></div>
      <div class="apollo-status">${d.status}</div>
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
        const pctLabel = Math.round(d.value / total * 100);
        legend += `<div class="legend-item"><div class="legend-dot" style="background:${d.color}"></div><span class="legend-label">${d.label}</span><span class="legend-value">${d.value} (${pctLabel}%)</span></div>`;
    });
    container.innerHTML = `
    <svg class="donut-svg" viewBox="0 0 140 140">${paths}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text-primary)" font-size="22" font-weight="800">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="var(--text-muted)" font-size="9">LEADS</text>
    </svg>
    <div class="donut-legend">${legend}</div>`;
}

/* ===== ROLE CHART ===== */
function renderRoleChart() {
    const container = document.getElementById('role-chart');
    if (!container) return;
    const data = [
        { label: 'Demo Interest', value: 22, color: '#3b82f6' },
        { label: 'Education', value: 18, color: '#22c55e' },
        { label: 'Security Team', value: 11, color: '#ef4444' },
        { label: 'Other / General', value: 10, color: '#6b7280' },
        { label: 'Security Services', value: 6, color: '#f59e0b' },
        { label: 'Hiring', value: 1, color: '#8b5cf6' }
    ];
    const maxVal = Math.max(...data.map(d => d.value));
    let html = '';
    data.forEach(d => {
        const pct = (d.value / maxVal * 100);
        html += `<div class="bar-row">
      <div class="bar-label">${d.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${d.color}">${d.value}</div></div>
    </div>`;
    });
    container.innerHTML = html;
}

/* ===== SOURCE CHART ===== */
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

/* ===== STATUS CHART ===== */
function renderStatusChart() {
    const container = document.getElementById('status-chart');
    if (!container) return;
    const data = [
        { label: 'New', value: 39, color: '#22c55e', desc: 'Not yet contacted' },
        { label: 'Outreach Sent', value: 25, color: '#3b82f6', desc: 'First email sent' },
        { label: 'Follow-up Needed', value: 4, color: '#f59e0b', desc: 'Requires action' },
        { label: 'Other', value: 1, color: '#6b7280', desc: '' }
    ];
    const total = data.reduce((s, d) => s + d.value, 0);

    let html = '<div style="display:flex;flex-direction:column;gap:12px">';
    data.forEach(d => {
        const pct = Math.round(d.value / total * 100);
        html += `<div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;font-weight:600;color:var(--text-primary)">${d.label} <span style="font-weight:400;color:var(--text-muted)">${d.desc ? '· ' + d.desc : ''}</span></span>
        <span style="font-size:12px;font-weight:700;color:var(--text-primary)">${d.value} (${pct}%)</span>
      </div>
      <div style="height:8px;border-radius:4px;background:rgba(255,255,255,0.04);overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${d.color};border-radius:4px;transition:width 1s ease"></div>
      </div>
    </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

/* ===== CAMPAIGN CHART ===== */
function renderCampaignChart() {
    const container = document.getElementById('campaign-chart');
    if (!container) return;
    const data = [
        { label: 'Emails Sent', sec: 844, ctf: 825 },
        { label: 'Unique Contacted', sec: 466, ctf: 361 },
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
        sections.forEach(s => { if (s.el && s.el.offsetTop <= scrollY) active = s; });
        links.forEach(a => a.classList.remove('active'));
        if (active) active.link.classList.add('active');
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
    document.querySelectorAll('.kpi-card, .work-card, .chart-card, .blocker-card, .plan-card, .apollo-bar-row').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
}
