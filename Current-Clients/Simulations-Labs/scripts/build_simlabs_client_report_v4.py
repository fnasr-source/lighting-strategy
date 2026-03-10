#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('/Users/user/Documents/IDE Projects/Internal AW SOP/Current-Clients/Simulations-Labs')
RAW = ROOT / 'Data-Sources' / 'Raw'
CLIENT_REPORT_ROOT = ROOT / 'Client-Report'
V4_DIR = CLIENT_REPORT_ROOT / 'v4-growth-reset'
ASSETS_DIR = CLIENT_REPORT_ROOT / 'assets'
BRAND_DIR = Path('/Users/user/Documents/IDE Projects/Internal AW SOP/Proposals/_Proposal-System/templates/growth-packages-assets')

BRANDMARK_SRC = BRAND_DIR / 'brand' / 'brandmark.png'
LOGO_SRC = BRAND_DIR / 'brand' / 'logo.png'
JAYMONT_MEDIUM_SRC = BRAND_DIR / 'fonts' / 'jaymont' / 'Jaymont Medium.otf'
JAYMONT_BOLD_SRC = BRAND_DIR / 'fonts' / 'jaymont' / 'Jaymont Bold.otf'
AKKURAT_REGULAR_SRC = BRAND_DIR / 'fonts' / 'akkurat-pro' / 'Akkurat Pro-Regular.otf'
AKKURAT_BOLD_SRC = BRAND_DIR / 'fonts' / 'akkurat-pro' / 'Akkurat Pro-Bold.otf'


def read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text())


def fmt_int(value):
    try:
        return f"{int(value):,}"
    except Exception:
        return '0'


def pct(numerator, denominator):
    if not denominator:
        return '0.0%'
    return f"{(numerator / denominator) * 100:.1f}%"


def ensure_assets():
    (ASSETS_DIR / 'brand').mkdir(parents=True, exist_ok=True)
    (ASSETS_DIR / 'fonts' / 'jaymont').mkdir(parents=True, exist_ok=True)
    (ASSETS_DIR / 'fonts' / 'akkurat-pro').mkdir(parents=True, exist_ok=True)
    shutil.copy2(BRANDMARK_SRC, ASSETS_DIR / 'brand' / 'brandmark.png')
    shutil.copy2(LOGO_SRC, ASSETS_DIR / 'brand' / 'logo.png')
    shutil.copy2(JAYMONT_MEDIUM_SRC, ASSETS_DIR / 'fonts' / 'jaymont' / 'Jaymont-Medium.otf')
    shutil.copy2(JAYMONT_BOLD_SRC, ASSETS_DIR / 'fonts' / 'jaymont' / 'Jaymont-Bold.otf')
    shutil.copy2(AKKURAT_REGULAR_SRC, ASSETS_DIR / 'fonts' / 'akkurat-pro' / 'AkkuratPro-Regular.otf')
    shutil.copy2(AKKURAT_BOLD_SRC, ASSETS_DIR / 'fonts' / 'akkurat-pro' / 'AkkuratPro-Bold.otf')


def campaign_metrics():
    analytics = read_json(RAW / 'instantly_campaign_analytics_live_direct_2026-03-10.json', [])
    campaigns = read_json(RAW / 'instantly_campaigns_live_direct_2026-03-10.json', {}).get('items', [])
    return {item.get('campaign_name'): item for item in analytics}, {item.get('name'): item for item in campaigns}


def asana_summary():
    tasks = read_json(RAW / 'asana_growth_reset_live_tasks.json', {}).get('data', [])
    counts = {}
    focus = []
    for task in tasks:
        section = task.get('memberships', [{}])[0].get('section', {}).get('name', 'Unmapped')
        counts[section] = counts.get(section, 0) + 1
        if section in {'🟨 03 Follow-up Needed', '🟧 04 Discovery Call Pending'}:
            custom = {f.get('name'): f.get('display_value') or f.get('text_value') or (f.get('enum_value') or {}).get('name') or '' for f in task.get('custom_fields', [])}
            focus.append({
                'name': task.get('name', ''),
                'section': section,
                'owner': custom.get('Owner', ''),
                'company': custom.get('Company', ''),
                'next_action': custom.get('Next Action', ''),
            })
    return counts, focus


def css(asset_prefix: str) -> str:
    return f"""
@font-face {{
  font-family: 'Jaymont';
  src: url('{asset_prefix}/fonts/jaymont/Jaymont-Medium.otf') format('opentype');
  font-weight: 500;
}}
@font-face {{
  font-family: 'Jaymont';
  src: url('{asset_prefix}/fonts/jaymont/Jaymont-Bold.otf') format('opentype');
  font-weight: 700;
}}
@font-face {{
  font-family: 'Akkurat Pro';
  src: url('{asset_prefix}/fonts/akkurat-pro/AkkuratPro-Regular.otf') format('opentype');
  font-weight: 400;
}}
@font-face {{
  font-family: 'Akkurat Pro';
  src: url('{asset_prefix}/fonts/akkurat-pro/AkkuratPro-Bold.otf') format('opentype');
  font-weight: 700;
}}
:root {{
  --aw-navy: #001a70;
  --aw-navy-light: #1039aa;
  --aw-gold: #cc9f53;
  --aw-gold-light: #eed39d;
  --aw-ink: #172033;
  --aw-muted: #667085;
  --aw-paper: #ffffff;
  --aw-bg: #f7f5ef;
  --aw-border: #e3ddd2;
  --aw-soft: #f2eee4;
  --aw-green: #25624a;
  --aw-red: #9f4132;
  --radius: 18px;
}}
* {{ box-sizing: border-box; }}
html {{ scroll-behavior: smooth; }}
body {{
  margin: 0;
  font-family: 'Akkurat Pro', Arial, sans-serif;
  color: var(--aw-ink);
  background:
    radial-gradient(circle at top right, rgba(204,159,83,0.18), transparent 26%),
    linear-gradient(180deg, #fbfaf7 0%, #f3f0e8 100%);
  line-height: 1.6;
}}
.nav {{
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(18px);
  background: rgba(247,245,239,0.92);
  border-bottom: 1px solid rgba(227,221,210,0.9);
}}
.nav-inner {{
  max-width: 1240px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}}
.nav-brand {{ display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; }}
.nav-brand img {{ height: 30px; width: auto; }}
.nav-brand-text {{ font-size: 14px; font-weight: 700; color: var(--aw-navy); }}
.nav-brand-text span {{ color: var(--aw-muted); font-weight: 400; }}
.nav-links {{ display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 0; padding: 0; }}
.nav-links a {{ text-decoration: none; color: var(--aw-muted); font-size: 13px; padding: 8px 10px; border-radius: 999px; }}
.nav-links a:hover {{ background: rgba(204,159,83,0.12); color: var(--aw-navy); }}
.nav-meta {{ font-size: 12px; color: var(--aw-muted); }}
.main {{ max-width: 1240px; margin: 0 auto; padding: 22px 24px 72px; }}
.hero {{
  position: relative;
  overflow: hidden;
  margin-top: 10px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(0,16,74,0.98), rgba(0,26,112,0.94));
  color: white;
  padding: 46px 44px 40px;
  box-shadow: 0 24px 60px rgba(0, 26, 112, 0.16);
}}
.hero::after {{
  content: '';
  position: absolute;
  right: -90px;
  top: -120px;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(238,199,128,0.28), rgba(238,199,128,0) 68%);
}}
.hero-logo {{ width: 96px; filter: brightness(0) invert(1); }}
.eyebrow {{ margin-top: 18px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.72); }}
h1, h2, h3, h4 {{ font-family: 'Jaymont', Georgia, serif; margin: 0; line-height: 1.08; }}
h1 {{ font-size: 54px; margin-top: 12px; max-width: 760px; }}
h2 {{ font-size: 30px; color: var(--aw-navy); margin-bottom: 14px; }}
h3 {{ font-size: 21px; color: var(--aw-navy); margin-bottom: 10px; }}
h4 {{ font-size: 15px; color: var(--aw-navy); margin-bottom: 8px; }}
.hero-sub {{ margin-top: 18px; max-width: 760px; font-size: 18px; color: rgba(255,255,255,0.88); }}
.meta-grid, .kpi-grid, .grid {{ display: grid; gap: 16px; }}
.meta-grid {{ grid-template-columns: repeat(4, 1fr); margin-top: 26px; }}
.kpi-grid {{ grid-template-columns: repeat(4, 1fr); margin-top: 20px; }}
.grid {{ grid-template-columns: repeat(12, 1fr); }}
.span-3 {{ grid-column: span 3; }}
.span-4 {{ grid-column: span 4; }}
.span-5 {{ grid-column: span 5; }}
.span-6 {{ grid-column: span 6; }}
.span-7 {{ grid-column: span 7; }}
.span-8 {{ grid-column: span 8; }}
.span-12 {{ grid-column: span 12; }}
.meta-card, .kpi-card, .panel, .chart-card, .step-card, .signal-card {{
  background: rgba(255,255,255,0.9);
  border: 1px solid var(--aw-border);
  border-radius: var(--radius);
  padding: 18px;
}}
.meta-card {{ background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.12); }}
.meta-label {{ font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.68); }}
.meta-value {{ margin-top: 6px; font-size: 21px; font-weight: 700; }}
.section {{ margin-top: 22px; }}
.section-shell {{ background: rgba(255,255,255,0.72); border: 1px solid rgba(227,221,210,0.9); border-radius: 24px; padding: 28px; box-shadow: 0 12px 28px rgba(20,31,50,0.05); }}
.kpi-card {{ background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(245,242,236,0.92)); }}
.kpi-label {{ font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--aw-muted); }}
.kpi-value {{ font-size: 38px; margin-top: 8px; font-weight: 700; color: var(--aw-navy); }}
.kpi-note, .small {{ font-size: 13px; color: var(--aw-muted); }}
.chart-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }}
.chart-head {{ display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 14px; }}
.chart-title {{ font-size: 17px; font-weight: 700; color: var(--aw-navy); }}
.badge {{ display: inline-block; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }}
.badge.live {{ background: rgba(37,98,74,0.12); color: var(--aw-green); }}
.badge.warn {{ background: rgba(204,159,83,0.18); color: #855f1c; }}
.badge.risk {{ background: rgba(159,65,50,0.12); color: var(--aw-red); }}
.badge.info {{ background: rgba(0,26,112,0.08); color: var(--aw-navy); }}
.bar-list {{ display: flex; flex-direction: column; gap: 12px; }}
.bar-row {{ display: grid; grid-template-columns: 180px 1fr 56px; gap: 12px; align-items: center; }}
.bar-label {{ font-size: 13px; color: var(--aw-ink); font-weight: 600; }}
.bar-track {{ height: 12px; background: #ece7da; border-radius: 999px; overflow: hidden; position: relative; }}
.bar-fill {{ height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--aw-navy), var(--aw-gold)); }}
.bar-value {{ font-size: 12px; color: var(--aw-muted); text-align: right; font-weight: 700; }}
.dual-bars {{ display: flex; flex-direction: column; gap: 14px; }}
.dual-row {{ display: flex; flex-direction: column; gap: 6px; }}
.dual-name {{ font-size: 13px; font-weight: 700; color: var(--aw-ink); }}
.dual-stack {{ display: flex; height: 14px; border-radius: 999px; overflow: hidden; background: #ebe6d9; }}
.dual-primary {{ background: var(--aw-navy); }}
.dual-secondary {{ background: var(--aw-gold); }}
.dual-meta {{ display: flex; justify-content: space-between; font-size: 12px; color: var(--aw-muted); }}
.funnel {{ display: grid; gap: 10px; }}
.funnel-step {{ background: linear-gradient(135deg, rgba(0,26,112,0.06), rgba(204,159,83,0.12)); border: 1px solid var(--aw-border); border-radius: 16px; padding: 14px 16px; }}
.funnel-top {{ display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }}
.funnel-name {{ font-size: 14px; font-weight: 700; color: var(--aw-navy); }}
.funnel-number {{ font-size: 24px; font-weight: 700; color: var(--aw-navy); }}
.pill-row {{ margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }}
.pill {{ display: inline-block; padding: 7px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }}
.pill.live {{ background: rgba(37,98,74,0.12); color: var(--aw-green); }}
.pill.next {{ background: rgba(204,159,83,0.18); color: #855f1c; }}
.pill.risk {{ background: rgba(159,65,50,0.12); color: var(--aw-red); }}
.quote {{ margin-top: 14px; border-left: 3px solid var(--aw-gold); padding-left: 14px; color: var(--aw-muted); }}
.text-list li {{ margin: 8px 0; }}
table {{ width: 100%; border-collapse: collapse; }}
th, td {{ text-align: left; padding: 11px 10px; border-bottom: 1px solid var(--aw-border); vertical-align: top; }}
th {{ font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--aw-muted); }}
.seq-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }}
.step-flow {{ display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }}
.step-card {{ background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,240,232,0.92)); }}
.step-top {{ display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px; }}
.step-day {{ font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--aw-gold); font-weight: 700; }}
.step-channel {{ font-size: 11px; padding: 5px 8px; border-radius: 999px; background: rgba(0,26,112,0.08); color: var(--aw-navy); font-weight: 700; }}
.blueprint {{ display: grid; gap: 10px; margin-top: 14px; }}
.blueprint-box {{ border: 1px dashed rgba(0,26,112,0.26); background: rgba(0,26,112,0.03); border-radius: 14px; padding: 12px 14px; }}
.timeline-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
.timeline {{ display: flex; flex-direction: column; gap: 16px; }}
.timeline-item {{ position: relative; padding-left: 18px; }}
.timeline-item::before {{ content: ''; position: absolute; left: 0; top: 8px; width: 10px; height: 10px; border-radius: 50%; background: var(--aw-gold); box-shadow: 0 0 0 6px rgba(204,159,83,0.14); }}
.timeline-date {{ font-size: 12px; letter-spacing: 0.11em; text-transform: uppercase; color: var(--aw-gold); font-weight: 700; }}
.signal-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }}
.footer {{ margin-top: 18px; font-size: 12px; color: var(--aw-muted); }}
.redirect {{ max-width: 780px; margin: 60px auto; padding: 24px; background: white; border: 1px solid var(--aw-border); border-radius: 22px; text-align: center; }}
.redirect a {{ color: var(--aw-navy); font-weight: 700; }}
@media (max-width: 980px) {{
  .meta-grid, .kpi-grid, .chart-grid, .seq-grid, .timeline-grid, .signal-grid {{ grid-template-columns: 1fr; }}
  .grid {{ grid-template-columns: 1fr; }}
  [class^='span-'] {{ grid-column: auto; }}
  .bar-row {{ grid-template-columns: 1fr; }}
  .nav-inner {{ flex-direction: column; align-items: flex-start; }}
  h1 {{ font-size: 40px; }}
}}
@media print {{
  body {{ background: white; }}
  .nav {{ display: none; }}
  .main {{ padding: 0; }}
  .hero, .section-shell, .panel, .chart-card, .step-card, .signal-card {{ box-shadow: none; break-inside: avoid; }}
}}
"""


def build_bar_rows(items, max_value):
    rows = []
    for label, value in items:
        pct_val = 0 if max_value == 0 else (value / max_value) * 100
        rows.append(
            f"<div class='bar-row'><div class='bar-label'>{label}</div><div class='bar-track'><div class='bar-fill' style='width:{pct_val:.2f}%'></div></div><div class='bar-value'>{fmt_int(value)}</div></div>"
        )
    return ''.join(rows)


def build_sequence_card(title, subtitle, steps):
    cards = []
    for step in steps:
        cards.append(
            f"<div class='step-card'><div class='step-top'><div class='step-day'>{step['day']}</div><div class='step-channel'>{step['channel']}</div></div><h4>{step['title']}</h4><div class='small'>{step['desc']}</div></div>"
        )
    return f"<div class='panel'><h3>{title}</h3><div class='small'>{subtitle}</div><div class='step-flow'>{''.join(cards)}</div></div>"


def build_html(asset_prefix: str) -> str:
    generated_at = datetime.now(timezone.utc).strftime('%B %d, %Y')
    analytics_by_name, campaigns_by_name = campaign_metrics()
    report_data = read_json(CLIENT_REPORT_ROOT / 'data' / 'report-data.json', {})
    crm_counts, focus = asana_summary()
    crm_hygiene = read_json(RAW / 'simlabs_crm_hygiene_2026-03-10.json', {})
    sync = read_json(RAW / 'simlabs_growth_reset_sync_2026-03-10.json', {})
    registry = read_json(RAW / 'instantly_upload_registry.json', {'uploaded': [], 'by_campaign': {}})
    apollo = read_json(RAW / 'apollo_simlabs_enrichment_live.json', {})

    active_campaign_names = [
        'SimLabs | Security Professionals',
        'SimLabs | Education Decision Makers - MENA',
        'SimLabs | Faculty / Instructors - MENA',
        'SimLabs | Educators (US/UK/Saudi)',
        'SimLabs | Security Training Leaders',
        'SimLabs | Education Warm Follow-up / CRM Recovery',
        'SimLabs | CTF Organizers v2 (Spotlight Program)',
        'SimLabs | Security Consultants',
    ]
    active_sent = active_replies = active_bounces = active_leads = active_daily_cap = 0
    campaign_rows = []
    cap_items = []
    for name in active_campaign_names:
        c = campaigns_by_name.get(name, {})
        m = analytics_by_name.get(name, {})
        daily_limit = int(c.get('daily_limit') or 0)
        sent = int(m.get('emails_sent_count') or 0)
        replies = int(m.get('reply_count') or 0)
        bounces = int(m.get('bounced_count') or 0)
        leads = int(m.get('leads_count') or 0)
        status = 'Live' if int(c.get('status') or 0) == 1 else 'Paused'
        active_sent += sent
        active_replies += replies
        active_bounces += bounces
        active_leads += leads
        if status == 'Live':
            active_daily_cap += daily_limit
        cap_items.append((name.replace('SimLabs | ', '').replace('Simlabs | ', ''), daily_limit))
        campaign_rows.append(f"<tr><td>{name}</td><td>{status}</td><td>{daily_limit}</td><td>{fmt_int(leads)}</td><td>{fmt_int(sent)}</td><td>{fmt_int(replies)}</td><td>{fmt_int(bounces)}</td></tr>")

    crm_items = [
        ('New Leads', crm_counts.get('🟦 01 New Leads', 0)),
        ('Outreach Sent', crm_counts.get('🟪 02 Outreach Sent', 0)),
        ('Follow-up Needed', crm_counts.get('🟨 03 Follow-up Needed', 0)),
        ('Discovery Pending', crm_counts.get('🟧 04 Discovery Call Pending', 0)),
    ]
    focus_rows = ''.join(
        f"<tr><td>{item['name']}</td><td>{item['section'].replace('🟨 ', '').replace('🟧 ', '')}</td><td>{item['owner']}</td><td>{item['company']}</td><td>{item['next_action']}</td></tr>"
        for item in focus
    )

    work_done = report_data.get('workCompleted', [])
    work_done_cards = ''.join(
        f"<div class='panel span-4'><h3>{group.get('category')}</h3><ul class='text-list'>{''.join(f'<li>{entry}</li>' for entry in group.get('items', []))}</ul></div>"
        for group in work_done
    )

    focus_names = ', '.join(item['name'] for item in focus[:4])

    decision_steps = [
        {'day': 'Day 0', 'channel': 'Email', 'title': 'Pilot-led opener', 'desc': 'Lead with the 30-day cyber lab pilot, no infrastructure burden, and one CTA: a pilot scoping call.'},
        {'day': 'Day 1', 'channel': 'LinkedIn', 'title': 'Light social touch', 'desc': 'Profile visit and connection request tied to practical cyber learning, not a generic sales note.'},
        {'day': 'Day 3', 'channel': 'Email', 'title': 'Send the proof layer', 'desc': 'Offer the pilot brief and outcomes framework before asking for more time.'},
        {'day': 'Day 5', 'channel': 'Call / WhatsApp', 'title': 'Direct qualification', 'desc': 'If a real phone or warm path exists, ask whether a pilot scoping call is relevant now or should be closed.'},
        {'day': 'Day 7', 'channel': 'Email', 'title': 'Close-loop CTA', 'desc': 'Simple reply CTA: “Pilot”.'}
    ]
    faculty_steps = [
        {'day': 'Day 0', 'channel': 'Email', 'title': 'Term-fit question', 'desc': 'Ask whether labs, assessments, or practical exercises are running this term and frame SimLabs as the setup bottleneck remover.'},
        {'day': 'Day 2', 'channel': 'LinkedIn', 'title': 'Faculty relevance note', 'desc': 'Short note around making labs and assessments easier to run this term.'},
        {'day': 'Day 4', 'channel': 'Email', 'title': 'Outcomes follow-up', 'desc': 'Offer a short summary around engagement, assessment credibility, and readiness measurement.'},
        {'day': 'Day 6', 'channel': 'Manual follow-up', 'title': 'Pilot fit check', 'desc': 'If engaged, send the pilot brief and ask whether this term or the next is more realistic.'},
        {'day': 'Day 8', 'channel': 'Email', 'title': 'Close-loop CTA', 'desc': 'Ask for a one-word reply: “Pilot”.'}
    ]
    recovery_steps = [
        {'day': '24h', 'channel': 'Manual email', 'title': 'Owner-led follow-up', 'desc': 'Assigned owner sends a direct follow-up with one next step only: confirm the scoping call.'},
        {'day': 'Same day', 'channel': 'WhatsApp / Phone', 'title': 'Direct contact', 'desc': 'Use phone only when it exists. Confirm timing instead of reselling the whole offer.'},
        {'day': 'Day 3', 'channel': 'Email', 'title': 'Agenda or pilot outline', 'desc': 'Send the specific pilot outline or meeting agenda.'},
        {'day': 'Day 5', 'channel': 'CRM decision', 'title': 'Resolve the lead', 'desc': 'Move to Discovery Call Done, Nurture, or Lost. No open-ended waiting state.'}
    ]

    landing_boxes = ''.join([
        "<div class='blueprint-box'><h4>Hero</h4><div class='small'>Launch measurable cybersecurity labs without building infrastructure.</div></div>",
        "<div class='blueprint-box'><h4>Who It Is For</h4><div class='small'>Universities, training programs, faculty, and innovation units.</div></div>",
        "<div class='blueprint-box'><h4>How The 30-Day Pilot Works</h4><div class='small'>Cohort, scope, setup, faculty enablement, and measurement.</div></div>",
        "<div class='blueprint-box'><h4>Proof Layer</h4><div class='small'>Pilot brief, outcomes framework, proof sheet, and demo deck.</div></div>",
        "<div class='blueprint-box'><h4>Primary CTA</h4><div class='small'>Book a pilot scoping call.</div></div>",
    ])

    return f"""<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1.0' />
  <meta name='description' content='Simulations Labs growth reset report for the March 11, 2026 client meeting.' />
  <title>Simulations Labs Growth Reset Report | Admireworks</title>
  <link rel='icon' type='image/png' href='{asset_prefix}/brand/brandmark.png' />
  <link rel='apple-touch-icon' href='{asset_prefix}/brand/brandmark.png' />
  <style>{css(asset_prefix)}</style>
</head>
<body>
  <nav class='nav'>
    <div class='nav-inner'>
      <a class='nav-brand' href='#top'>
        <img src='{asset_prefix}/brand/logo.png' alt='Admireworks' />
        <div class='nav-brand-text'>Admireworks <span>x Simulations Labs</span></div>
      </a>
      <ul class='nav-links'>
        <li><a href='#diagnosis'>Diagnosis</a></li>
        <li><a href='#changes'>Changes</a></li>
        <li><a href='#strategy'>Strategy</a></li>
        <li><a href='#sequences'>Sequences</a></li>
        <li><a href='#roadmap'>Roadmap</a></li>
      </ul>
      <div class='nav-meta'>Meeting version · March 11, 2026</div>
    </div>
  </nav>

  <main class='main' id='top'>
    <section class='hero'>
      <img class='hero-logo' src='{asset_prefix}/brand/brandmark.png' alt='Admireworks brandmark' />
      <div class='eyebrow'>Admireworks x Simulations Labs</div>
      <h1>Growth Reset Report and 30-Day Execution Plan</h1>
      <p class='hero-sub'>A meeting-ready report built around the live reset already executed: education-first positioning, a cleaner CRM conversion layer, multi-channel sequences, and a narrower MENA rollout plan designed to produce demos instead of just sends.</p>
      <div class='meta-grid'>
        <div class='meta-card'><div class='meta-label'>Prepared</div><div class='meta-value'>{generated_at}</div></div>
        <div class='meta-card'><div class='meta-label'>Meeting Focus</div><div class='meta-value'>Growth Reset</div></div>
        <div class='meta-card'><div class='meta-label'>Primary KPI</div><div class='meta-value'>Booked demos</div></div>
        <div class='meta-card'><div class='meta-label'>Primary wedge</div><div class='meta-value'>Education, MENA</div></div>
      </div>
    </section>

    <section class='section' id='diagnosis'>
      <div class='kpi-grid'>
        <div class='kpi-card'><div class='kpi-label'>Active emails sent</div><div class='kpi-value'>{fmt_int(active_sent)}</div><div class='kpi-note'>Active-campaign send volume in Instantly as of March 10, 2026.</div></div>
        <div class='kpi-card'><div class='kpi-label'>Replies</div><div class='kpi-value'>{fmt_int(active_replies)}</div><div class='kpi-note'>Current reply rate: {pct(active_replies, active_sent)}</div></div>
        <div class='kpi-card'><div class='kpi-label'>Bounces</div><div class='kpi-value'>{fmt_int(active_bounces)}</div><div class='kpi-note'>Current bounce rate: {pct(active_bounces, active_sent)}</div></div>
        <div class='kpi-card'><div class='kpi-label'>Daily capacity</div><div class='kpi-value'>{fmt_int(active_daily_cap)}</div><div class='kpi-note'>Controlled cap after the reset to protect sender health.</div></div>
      </div>
    </section>

    <section class='section section-shell'>
      <div class='chart-grid'>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>Executive diagnosis</div><span class='badge risk'>Problem is conversion, not reach alone</span></div>
          <ul class='text-list'>
            <li>The previous motion created activity, but not enough downstream movement.</li>
            <li>The message was too broad across too many personas and use cases at once.</li>
            <li>The funnel had weak proof and no hard operational discipline inside the CRM.</li>
            <li>The reset changes the KPI from “more outbound” to “more booked demos and qualified conversations.”</li>
          </ul>
          <p class='quote'>The wedge is now education-first: institutions, instructors, and training teams that need measurable hands-on cyber learning without infrastructure overhead.</p>
        </div>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>Reset signals</div><span class='badge live'>Already live</span></div>
          <div class='signal-grid'>
            <div class='signal-card'><div class='kpi-label'>Owners fixed</div><div class='kpi-value'>{fmt_int(crm_hygiene.get('owner_updates_count', 0))}</div><div class='small'>Previously unowned CRM records assigned.</div></div>
            <div class='signal-card'><div class='kpi-label'>Focused tasks</div><div class='kpi-value'>{fmt_int(crm_hygiene.get('focused_updates_count', 0))}</div><div class='small'>Hot and warm tasks now have dated next steps.</div></div>
            <div class='signal-card'><div class='kpi-label'>Seeded leads</div><div class='kpi-value'>{fmt_int(sync.get('instantly', {}).get('created', 0))}</div><div class='small'>Education-aligned CRM leads synced into Instantly.</div></div>
          </div>
          <div class='pill-row'>
            <span class='pill live'>8 active campaigns</span>
            <span class='pill live'>1 legacy lane paused</span>
            <span class='pill next'>{fmt_int(sync.get('apollo', {}).get('labeled', 0))} mirrored into Apollo</span>
          </div>
        </div>
      </div>
    </section>

    <section class='section section-shell' id='changes'>
      <div class='chart-grid'>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>Live campaign mix and daily caps</div><span class='badge info'>Current operating shape</span></div>
          <div class='bar-list'>{build_bar_rows(cap_items, max(value for _, value in cap_items))}</div>
        </div>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>CRM board shape</div><span class='badge warn'>Most value is still in follow-through</span></div>
          <div class='bar-list'>{build_bar_rows(crm_items, max(value for _, value in crm_items))}</div>
          <p class='small' style='margin-top:12px;'>Immediate conversion queue includes {focus_names if focus_names else 'the follow-up and discovery-pending leads'}.</p>
        </div>
      </div>
      <div class='chart-grid' style='margin-top:16px;'>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>What was changed live</div><span class='badge live'>Execution complete</span></div>
          <div class='funnel'>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>Campaign architecture</div><div class='funnel-number'>3</div></div><div class='small'>New campaigns created: Education Decision Makers - MENA, Faculty / Instructors - MENA, and Education Warm Follow-up / CRM Recovery.</div></div>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>CRM cleanup</div><div class='funnel-number'>{fmt_int(crm_hygiene.get('owner_updates_count', 0))}</div></div><div class='small'>Owner assignment and next-action hygiene applied to the active conversion queue.</div></div>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>Education seeding</div><div class='funnel-number'>{fmt_int(sync.get('instantly', {}).get('created', 0))}</div></div><div class='small'>Asana education and recovery leads routed into live campaigns and Apollo labels.</div></div>
          </div>
        </div>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>Campaign evidence table</div><span class='badge info'>Analytics + config</span></div>
          <table>
            <thead><tr><th>Campaign</th><th>Status</th><th>Cap</th><th>Leads</th><th>Sent</th><th>Replies</th><th>Bounces</th></tr></thead>
            <tbody>{''.join(campaign_rows)}</tbody>
          </table>
          <div class='footer'>Instantly analytics lag the newest education campaigns. The live seed uploads are confirmed in the registry and sync logs even before they show in analytics totals.</div>
        </div>
      </div>
    </section>

    <section class='section section-shell'>
      <div class='grid'>
        <div class='panel span-6'>
          <h2>What Admireworks has already executed</h2>
          <div class='grid'>{work_done_cards}</div>
        </div>
        <div class='panel span-6'>
          <h2>Why results stalled</h2>
          <div class='dual-bars'>
            <div class='dual-row'><div class='dual-name'>Broad positioning</div><div class='dual-stack'><div class='dual-primary' style='width:84%'></div><div class='dual-secondary' style='width:16%'></div></div><div class='dual-meta'><span>Too many audiences at once</span><span>High friction</span></div></div>
            <div class='dual-row'><div class='dual-name'>Proof layer</div><div class='dual-stack'><div class='dual-primary' style='width:22%'></div><div class='dual-secondary' style='width:78%'></div></div><div class='dual-meta'><span>Old state: weak</span><span>Reset: strengthened</span></div></div>
            <div class='dual-row'><div class='dual-name'>CRM discipline</div><div class='dual-stack'><div class='dual-primary' style='width:30%'></div><div class='dual-secondary' style='width:70%'></div></div><div class='dual-meta'><span>Old state: passive</span><span>Reset: active queue</span></div></div>
          </div>
          <ul class='text-list' style='margin-top:14px;'>
            <li>Generic messaging diluted urgency and fit.</li>
            <li>Warm leads existed, but the system did not force owner accountability.</li>
            <li>The conversion path had no dedicated education landing page or pilot-led narrative.</li>
            <li>Legacy lanes carried bounce risk and distracted the account from the best wedge.</li>
          </ul>
        </div>
      </div>
    </section>

    <section class='section section-shell' id='strategy'>
      <div class='chart-grid'>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>New growth thesis</div><span class='badge live'>Education-first</span></div>
          <div class='funnel'>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>Primary ICP</div><div class='funnel-number'>4</div></div><div class='small'>Universities, instructors, program directors, and training / innovation units.</div></div>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>Primary geography</div><div class='funnel-number'>3</div></div><div class='small'>Egypt, Saudi Arabia, UAE for the next 30 days.</div></div>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>Core offer</div><div class='funnel-number'>30</div></div><div class='small'>30-day hands-on cyber lab pilot with measurable engagement and readiness outcomes.</div></div>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>Single CTA</div><div class='funnel-number'>1</div></div><div class='small'>Book a pilot scoping call.</div></div>
          </div>
        </div>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>Landing page and proof stack</div><span class='badge next'>Next layer to ship</span></div>
          <div class='blueprint'>{landing_boxes}</div>
        </div>
      </div>
    </section>

    <section class='section section-shell' id='sequences'>
      <h2>Multi-channel sequence maps</h2>
      <div class='seq-grid'>
        {build_sequence_card('Education decision makers', 'Deans, program leaders, training heads, and institutional owners.', decision_steps)}
        {build_sequence_card('Faculty / instructors', 'Faculty, lab owners, researchers, and technical skills leads.', faculty_steps)}
        {build_sequence_card('Warm recovery / CRM', 'Follow-up Needed and Discovery Call Pending leads.', recovery_steps)}
      </div>
    </section>

    <section class='section section-shell'>
      <div class='chart-grid'>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>Manual priority queue</div><span class='badge warn'>Needs same-day action</span></div>
          <table>
            <thead><tr><th>Lead</th><th>Stage</th><th>Owner</th><th>Company</th><th>Next action</th></tr></thead>
            <tbody>{focus_rows}</tbody>
          </table>
        </div>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>Expected outcomes</div><span class='badge info'>Ranges, not guarantees</span></div>
          <div class='funnel'>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>By March 14, 2026</div><div class='funnel-number'>6</div></div><div class='small'>All hot/warm records touched manually and routed with a real next step.</div></div>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>By March 18, 2026</div><div class='funnel-number'>2</div></div><div class='small'>Discovery calls confirmed or decisively closed from the recovery motion.</div></div>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>By March 24, 2026</div><div class='funnel-number'>3-5</div></div><div class='small'>Qualified conversations if the landing page, pilot assets, and manual follow-up are all used.</div></div>
            <div class='funnel-step'><div class='funnel-top'><div class='funnel-name'>By April 10, 2026</div><div class='funnel-number'>4-8</div></div><div class='small'>Booked demos total, with 1-3 qualified opportunities if the wedge proves out.</div></div>
          </div>
        </div>
      </div>
    </section>

    <section class='section section-shell' id='roadmap'>
      <div class='timeline-grid'>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>30-day roadmap</div><span class='badge live'>Dated plan</span></div>
          <div class='timeline'>
            <div class='timeline-item'><div class='timeline-date'>March 10 - March 12, 2026</div><h3>Reset activation</h3><div class='small'>Campaign reset activated, CRM hygiene applied, pilot materials prepared, and education seed leads routed into the live stack.</div></div>
            <div class='timeline-item'><div class='timeline-date'>March 13 - March 17, 2026</div><h3>Multi-channel sprint</h3><div class='small'>Manual follow-up on hot/warm leads, education outbound + LinkedIn touches, and landing-page copy finalized.</div></div>
            <div class='timeline-item'><div class='timeline-date'>March 18 - March 24, 2026</div><h3>Optimization window</h3><div class='small'>Review bounce, reply quality, and demo movement; tighten copy or proof if needed.</div></div>
            <div class='timeline-item'><div class='timeline-date'>March 25 - April 10, 2026</div><h3>Scale or reposition</h3><div class='small'>Scale only the winning lane, or add a secondary wedge if education does not show enough traction.</div></div>
          </div>
        </div>
        <div class='chart-card'>
          <div class='chart-head'><div class='chart-title'>Client meeting decisions</div><span class='badge next'>What needs approval</span></div>
          <ul class='text-list'>
            <li>Approve education-first as the main wedge for the next 30 days.</li>
            <li>Approve Egypt, Saudi Arabia, and UAE as the near-term priority markets.</li>
            <li>Approve the dedicated education pilot landing page as the primary destination for outreach.</li>
            <li>Approve manual operator / founder follow-up for warm leads instead of relying on automation only.</li>
            <li>Approve booked demos and qualified conversations as the KPI standard for this sprint.</li>
          </ul>
          <p class='quote'>This report should be discussed as a reset plan with live execution already started, not as another broad status update.</p>
        </div>
      </div>
      <div class='footer'>Prepared by Admireworks. Evidence sources include Instantly live campaign data, Apollo enrichment outputs, Asana CRM state, and the live reset execution logs.</div>
    </section>
  </main>
</body>
</html>
"""


def build_root_redirect() -> str:
    return """<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8' />
  <meta http-equiv='refresh' content='0; url=./v4-growth-reset/' />
  <meta name='viewport' content='width=device-width, initial-scale=1.0' />
  <title>Simulations Labs Report</title>
  <link rel='icon' type='image/png' href='./assets/brand/brandmark.png' />
  <style>
    body { font-family: Arial, sans-serif; background: #f8f7f4; color: #1d2436; margin: 0; }
    .redirect { max-width: 760px; margin: 72px auto; padding: 32px; background: white; border: 1px solid #e3e0d8; border-radius: 20px; text-align: center; }
    a { color: #001a70; font-weight: 700; }
  </style>
</head>
<body>
  <div class='redirect'>
    <h1>Redirecting to the latest Simulations Labs report</h1>
    <p>If the redirect does not happen automatically, open <a href='./v4-growth-reset/'>the latest meeting version here</a>.</p>
  </div>
</body>
</html>
"""


def main():
    ensure_assets()
    V4_DIR.mkdir(parents=True, exist_ok=True)
    v4_html = build_html('../assets')
    (V4_DIR / 'index.html').write_text(v4_html, encoding='utf-8')
    (V4_DIR / 'manifest.json').write_text(json.dumps({
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'output': str(V4_DIR / 'index.html'),
        'title': 'Simulations Labs Growth Reset Report v4'
    }, indent=2) + '\n', encoding='utf-8')
    (CLIENT_REPORT_ROOT / 'index.html').write_text(build_root_redirect(), encoding='utf-8')
    print(json.dumps({'generatedAt': datetime.now(timezone.utc).isoformat(), 'v4': str(V4_DIR / 'index.html')}))


if __name__ == '__main__':
    main()
