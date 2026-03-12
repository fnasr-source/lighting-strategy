#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path("/Users/user/Documents/IDE Projects/Internal AW SOP/Current-Clients/Simulations-Labs")
RAW = ROOT / "Data-Sources" / "Raw"
REPORT_DIR = ROOT / "Reports" / "Growth-Reset-2026-03-10"
BRAND_DIR = Path("/Users/user/Documents/IDE Projects/Internal AW SOP/Proposals/_Proposal-System/templates/growth-packages-assets")
BRANDMARK = (BRAND_DIR / "brand" / "brandmark.png").as_uri()
FONT_HEAD = (BRAND_DIR / "fonts" / "jaymont" / "Jaymont Medium.otf").as_uri()
FONT_HEAD_BOLD = (BRAND_DIR / "fonts" / "jaymont" / "Jaymont Bold.otf").as_uri()
FONT_BODY = (BRAND_DIR / "fonts" / "akkurat-pro" / "Akkurat Pro-Regular.otf").as_uri()
FONT_BODY_BOLD = (BRAND_DIR / "fonts" / "akkurat-pro" / "Akkurat Pro-Bold.otf").as_uri()


def read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text())


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def find_campaign(items, name):
    for item in items:
      if item.get("campaign_name") == name:
          return item
      if item.get("name") == name:
          return item
    return {}


def first_existing(*paths: Path):
    for path in paths:
        if path.exists():
            return path
    return None


def load_analytics():
    path = first_existing(
        RAW / "instantly_campaign_analytics_live_direct_2026-03-10.json",
        RAW / "instantly_simlabs_campaign_analytics_live.json",
    )
    if not path:
        return []
    data = read_json(path, [])
    if isinstance(data, dict):
        return data.get("items", [])
    if isinstance(data, list):
        return data
    return []


def load_campaigns():
    path = first_existing(
        RAW / "instantly_campaigns_live_direct_2026-03-10.json",
        RAW / "instantly_simlabs_campaigns_live.json",
    )
    if not path:
        return []
    data = read_json(path, {})
    if isinstance(data, dict):
        return data.get("items", [])
    if isinstance(data, list):
        return data
    return []


def build_campaign_snapshot(campaigns, analytics, names):
    analytics_by_name = {
        item.get("campaign_name") or item.get("name"): item
        for item in analytics
        if (item.get("campaign_name") or item.get("name"))
    }
    snapshots = []
    for name in names:
        campaign = next((item for item in campaigns if item.get("name") == name), {})
        metric = analytics_by_name.get(name, {})
        if not campaign and not metric:
            continue
        snapshots.append(
            {
                "name": name,
                "status": campaign.get("status", metric.get("campaign_status")),
                "daily_limit": campaign.get("daily_limit", 0),
                "leads_count": metric.get("leads_count", 0),
                "contacted_count": metric.get("contacted_count", 0),
                "emails_sent_count": metric.get("emails_sent_count", 0),
                "reply_count": metric.get("reply_count", 0),
                "bounced_count": metric.get("bounced_count", 0),
            }
        )
    return snapshots


def fmt_int(value) -> str:
    try:
        return f"{int(value):,}"
    except Exception:
        return "0"


def shared_css() -> str:
    return f"""
@font-face {{
  font-family: 'Jaymont';
  src: url('{FONT_HEAD}') format('opentype');
  font-weight: 500;
}}
@font-face {{
  font-family: 'Jaymont';
  src: url('{FONT_HEAD_BOLD}') format('opentype');
  font-weight: 700;
}}
@font-face {{
  font-family: 'Akkurat Pro';
  src: url('{FONT_BODY}') format('opentype');
  font-weight: 400;
}}
@font-face {{
  font-family: 'Akkurat Pro';
  src: url('{FONT_BODY_BOLD}') format('opentype');
  font-weight: 700;
}}
:root {{
  --aw-navy: #001a70;
  --aw-gold: #cc9f53;
  --aw-gold-light: #eec780;
  --aw-off-white: #f8f7f4;
  --aw-white: #ffffff;
  --aw-light-gray: #e8e6e1;
  --aw-dark: #131722;
  --aw-text: #1a1d25;
  --aw-muted: #5f6778;
  --aw-danger: #a53d2a;
  --aw-success: #2c7a5a;
}}
* {{ box-sizing: border-box; }}
body {{
  margin: 0;
  background: var(--aw-off-white);
  color: var(--aw-text);
  font-family: 'Akkurat Pro', Arial, sans-serif;
  line-height: 1.55;
}}
.page {{
  max-width: 1120px;
  margin: 0 auto;
  padding: 40px 28px 64px;
}}
.cover {{
  background: linear-gradient(180deg, rgba(0,26,112,0.96), rgba(0,17,73,0.98));
  color: var(--aw-white);
  border-radius: 24px;
  padding: 48px;
  margin-bottom: 28px;
  box-shadow: 0 18px 50px rgba(0, 18, 71, 0.2);
}}
.cover img {{
  width: 84px;
  display: block;
  margin-bottom: 24px;
  filter: brightness(0) invert(1);
}}
.eyebrow {{
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.75);
}}
h1, h2, h3 {{
  font-family: 'Jaymont', Georgia, serif;
  margin: 0 0 12px;
  line-height: 1.15;
}}
h1 {{ font-size: 42px; }}
h2 {{ font-size: 28px; color: var(--aw-navy); margin-top: 12px; }}
h3 {{ font-size: 20px; color: var(--aw-navy); }}
.subtitle {{
  max-width: 760px;
  font-size: 18px;
  color: rgba(255,255,255,0.88);
}}
.meta {{
  margin-top: 20px;
  color: rgba(255,255,255,0.7);
  font-size: 14px;
}}
.section {{
  background: var(--aw-white);
  border: 1px solid var(--aw-light-gray);
  border-radius: 20px;
  padding: 30px;
  margin-bottom: 20px;
  box-shadow: 0 10px 28px rgba(17, 26, 44, 0.06);
}}
.grid {{
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}}
.card {{
  background: var(--aw-off-white);
  border: 1px solid var(--aw-light-gray);
  border-radius: 16px;
  padding: 18px;
}}
.span-3 {{ grid-column: span 3; }}
.span-4 {{ grid-column: span 4; }}
.span-6 {{ grid-column: span 6; }}
.span-8 {{ grid-column: span 8; }}
.span-12 {{ grid-column: span 12; }}
.kpi-label {{
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--aw-muted);
}}
.kpi-value {{
  margin-top: 8px;
  font-size: 34px;
  font-weight: 700;
  color: var(--aw-navy);
}}
.kpi-sub {{
  margin-top: 6px;
  color: var(--aw-muted);
  font-size: 14px;
}}
.pill {{
  display: inline-block;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
}}
.pill.warn {{ background: rgba(204,159,83,0.18); color: #8a611f; }}
.pill.bad {{ background: rgba(165,61,42,0.12); color: var(--aw-danger); }}
.pill.good {{ background: rgba(44,122,90,0.12); color: var(--aw-success); }}
table {{
  width: 100%;
  border-collapse: collapse;
  margin-top: 14px;
}}
th, td {{
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid var(--aw-light-gray);
  vertical-align: top;
}}
th {{
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--aw-muted);
}}
ul {{
  margin: 10px 0 0 18px;
  padding: 0;
}}
li {{ margin: 8px 0; }}
.quote {{
  border-left: 3px solid var(--aw-gold);
  padding-left: 14px;
  color: var(--aw-muted);
}}
.footer {{
  padding-top: 12px;
  color: var(--aw-muted);
  font-size: 12px;
}}
@media print {{
  body {{ background: var(--aw-white); }}
  .page {{ max-width: none; padding: 0; }}
  .section, .cover {{ box-shadow: none; break-inside: avoid; }}
}}
"""


def html_doc(title: str, subtitle: str, body: str) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <style>{shared_css()}</style>
</head>
<body>
  <div class="page">
    <section class="cover">
      <img src="{BRANDMARK}" alt="Admireworks" />
      <div class="eyebrow">Admireworks · Simulations Labs</div>
      <h1>{title}</h1>
      <p class="subtitle">{subtitle}</p>
      <div class="meta">Prepared on {now}</div>
    </section>
    {body}
  </div>
</body>
</html>"""


def build_report():
    analytics = load_analytics()
    campaigns = load_campaigns()
    apollo = read_json(RAW / "apollo_simlabs_enrichment_live.json", {})
    registry = read_json(RAW / "instantly_upload_registry.json", {"uploaded": [], "by_campaign": {}})
    asana_tasks = read_json(RAW / "asana_growth_reset_live_tasks.json", {}).get("data", [])
    crm_hygiene = read_json(RAW / "simlabs_crm_hygiene_2026-03-10.json", {})
    asana_candidates = read_json(RAW / "asana_growth_reset_candidate_leads_2026-03-10.json", {"leads": []})
    growth_reset_sync = read_json(RAW / "simlabs_growth_reset_sync_2026-03-10.json", {})

    active_campaign_names = [
        "SimLabs | Security Professionals",
        "SimLabs | Educators (US/UK/Saudi)",
        "SimLabs | Education Decision Makers - MENA",
        "SimLabs | Faculty / Instructors - MENA",
        "SimLabs | Education Warm Follow-up / CRM Recovery",
        "SimLabs | Security Consultants",
        "SimLabs | Security Training Leaders",
        "SimLabs | CTF Organizers v2 (Spotlight Program)",
    ]
    active_campaigns = build_campaign_snapshot(campaigns, analytics, active_campaign_names)
    total_sent = sum(int(x.get("emails_sent_count") or 0) for x in active_campaigns)
    total_replies = sum(int(x.get("reply_count") or 0) for x in active_campaigns)
    total_bounces = sum(int(x.get("bounced_count") or 0) for x in active_campaigns)
    total_contacted = sum(int(x.get("contacted_count") or 0) for x in active_campaigns)
    total_leads = sum(int(x.get("leads_count") or 0) for x in active_campaigns)
    total_daily_limit = sum(int(x.get("daily_limit") or 0) for x in active_campaigns if int(x.get("status") or 0) == 1)

    section_counts = {}
    for task in asana_tasks:
        section = task.get("memberships", [{}])[0].get("section", {}).get("name", "Unmapped")
        section_counts[section] = section_counts.get(section, 0) + 1

    discovery_names = []
    followup_names = []
    for task in asana_tasks:
        section = task.get("memberships", [{}])[0].get("section", {}).get("name", "")
        if section == "🟧 04 Discovery Call Pending":
            discovery_names.append(task.get("name"))
        if section == "🟨 03 Follow-up Needed":
            followup_names.append(task.get("name"))

    uploaded_total = len(registry.get("uploaded", []))
    apollo_accepted = len(apollo.get("accepted", []))
    asana_candidate_counts = {}
    for lead in asana_candidates.get("leads", []):
        segment = lead.get("segment", "other")
        asana_candidate_counts[segment] = asana_candidate_counts.get(segment, 0) + 1
    growth_reset_created = int(growth_reset_sync.get("instantly", {}).get("created", 0))
    growth_reset_labeled = int(growth_reset_sync.get("apollo", {}).get("labeled", 0))

    rows = []
    for campaign in active_campaigns:
        name = campaign.get("name", "")
        sent = int(campaign.get("emails_sent_count") or 0)
        replies = int(campaign.get("reply_count") or 0)
        bounces = int(campaign.get("bounced_count") or 0)
        reply_rate = (replies / sent * 100) if sent else 0
        bounce_rate = (bounces / sent * 100) if sent else 0
        rows.append(
            f"<tr><td>{name}</td><td>{campaign.get('daily_limit', 0)}</td><td>{fmt_int(campaign.get('leads_count') or 0)}</td><td>{fmt_int(sent)}</td><td>{fmt_int(replies)}</td><td>{reply_rate:.2f}%</td><td>{fmt_int(bounces)}</td><td>{bounce_rate:.2f}%</td></tr>"
        )

    crm_table = "".join(
        f"<tr><td>{section}</td><td>{count}</td></tr>"
        for section, count in sorted(section_counts.items())
    )

    body = f"""
    <section class="section">
      <h2>Executive Diagnosis</h2>
      <div class="grid">
        <div class="card span-3"><div class="kpi-label">Active Leads Loaded</div><div class="kpi-value">{fmt_int(total_leads)}</div><div class="kpi-sub">Across live SimLabs campaigns</div></div>
        <div class="card span-3"><div class="kpi-label">Emails Sent</div><div class="kpi-value">{fmt_int(total_sent)}</div><div class="kpi-sub">Live active-campaign volume</div></div>
        <div class="card span-3"><div class="kpi-label">Replies</div><div class="kpi-value">{fmt_int(total_replies)}</div><div class="kpi-sub">Current response signal is still weak</div></div>
        <div class="card span-3"><div class="kpi-label">Bounces</div><div class="kpi-value">{fmt_int(total_bounces)}</div><div class="kpi-sub">A quality gate, not just a deliverability footnote</div></div>
      </div>
      <div class="grid" style="margin-top:16px;">
        <div class="card span-8">
          <h3>What the data says</h3>
          <ul>
            <li>The outreach engine has created top-of-funnel activity, but not enough downstream conversion.</li>
            <li>The CRM board shows very limited movement beyond follow-up, with only two live discovery-pending records and no proposal or negotiation stage momentum.</li>
            <li>The broad “hosted cyber labs / CTF / training” message is too generic for cold conversion and does not create enough urgency or proof.</li>
            <li>The strongest near-term wedge is education: instructors, program leaders, and institutions that need measurable hands-on cyber learning without infrastructure overhead.</li>
          </ul>
        </div>
        <div class="card span-4">
          <h3>Current Reset</h3>
          <p><span class="pill warn">Booked demos first</span></p>
          <p><span class="pill good">Education wedge</span></p>
          <p><span class="pill warn">MENA-first</span></p>
          <p><span class="pill bad">No blind scaling</span></p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>What Was Executed So Far</h2>
      <ul>
        <li>Apollo enrichment expanded to {fmt_int(apollo_accepted)} accepted contacts under the SimLabs program.</li>
        <li>Instantly lead uploads reached {fmt_int(uploaded_total)} total records in the active upload registry.</li>
        <li>Three new education-led campaigns are live in Instantly: decision makers, faculty/instructors, and CRM recovery.</li>
        <li>Daily active sending capacity is now capped at {fmt_int(total_daily_limit)} across the reset mix.</li>
        <li>CRM hygiene pass updated owner assignment, next actions, and due-date discipline for the current hot/warm conversion queue.</li>
        <li>Asana now contributes a verified seed pool of {fmt_int(len(asana_candidates.get('leads', [])))} education-aligned leads ({asana_candidate_counts.get('decision', 0)} decision-maker, {asana_candidate_counts.get('faculty', 0)} faculty, {asana_candidate_counts.get('recovery', 0)} recovery).</li>
        <li>Current growth-reset sync has already pushed {fmt_int(growth_reset_created)} Asana-derived leads into Instantly and mirrored {fmt_int(growth_reset_labeled)} into Apollo labels.</li>
      </ul>
    </section>

    <section class="section">
      <h2>Performance Snapshot</h2>
      <table>
        <thead>
          <tr><th>Campaign</th><th>Daily Cap</th><th>Leads</th><th>Sent</th><th>Replies</th><th>Reply Rate</th><th>Bounces</th><th>Bounce Rate</th></tr>
        </thead>
        <tbody>{''.join(rows)}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>CRM Reality Check</h2>
      <div class="grid">
        <div class="card span-5">
          <h3>Board Stage Counts</h3>
          <table><thead><tr><th>Section</th><th>Count</th></tr></thead><tbody>{crm_table}</tbody></table>
        </div>
        <div class="card span-7">
          <h3>What this means</h3>
          <ul>
            <li>Most leads are still concentrated in <b>New Leads</b> and <b>Outreach Sent</b>.</li>
            <li>Current discovery queue: {', '.join(discovery_names) if discovery_names else 'none'}.</li>
            <li>Current follow-up-needed queue: {', '.join(followup_names) if followup_names else 'none'}.</li>
            <li>This indicates the limiting factor is not only list building; it is offer clarity, follow-up rigor, and proof-driven conversion.</li>
          </ul>
          <p class="quote">The next phase should be judged by booked demos and discovery progression, not by more contacts added alone.</p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Best-Fit Growth Thesis</h2>
      <div class="grid">
        <div class="card span-6">
          <h3>Primary Wedge: Education</h3>
          <ul>
            <li>Universities and instructors already represent the clearest downstream signal in the CRM.</li>
            <li>The Simulations Labs brief and kickoff documents position the platform well for measurable learner outcomes, not just technical features.</li>
            <li>Education buyers respond better to impact framing: engagement, assessment credibility, readiness measurement, and faculty efficiency.</li>
          </ul>
        </div>
        <div class="card span-6">
          <h3>Offer Reframe</h3>
          <ul>
            <li>Lead with a <b>30-day hands-on cyber lab pilot</b>.</li>
            <li>Show what can be measured during the pilot.</li>
            <li>Use one CTA: <b>book a pilot scoping call</b>.</li>
            <li>Support the offer with a proof sheet, outcomes framework, and short pilot brief.</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>30-Day Action Plan</h2>
      <div class="grid">
        <div class="card span-4"><h3>Days 0-2</h3><ul><li>Freeze the baseline snapshot.</li><li>Clean up the hot/warm CRM queue.</li><li>Rewrite the primary education messaging.</li><li>Finalize the pilot CTA and report structure.</li></ul></div>
        <div class="card span-4"><h3>Days 3-5</h3><ul><li>Deploy the education pilot brief and measurement framework.</li><li>Launch the Admireworks-branded client report.</li><li>Prepare two MENA education campaigns and one CRM recovery lane.</li></ul></div>
        <div class="card span-4"><h3>Days 6-14</h3><ul><li>Run the multi-channel education sprint.</li><li>Prioritize discovery progression over raw reach.</li><li>Review reply quality, demo bookings, and CRM movement before scaling.</li></ul></div>
      </div>
    </section>

    <section class="section">
      <h2>KPI Targets and Decision Gates</h2>
      <ul>
        <li>Primary KPI: booked demo calls from the education wedge.</li>
        <li>Secondary KPI: movement from follow-up into discovery and discovery into completed calls.</li>
        <li>Do not increase volume until bounce is healthy and the revised education motion produces real conversation quality.</li>
        <li>Use the CRM, not only campaign analytics, to decide whether the reset is working.</li>
      </ul>
      <div class="footer">CRM hygiene updates applied: {crm_hygiene.get('focused_updates_count', 0)} focused records and {crm_hygiene.get('owner_updates_count', 0)} owner assignments.</div>
    </section>
    """
    return html_doc(
        "Simulations Labs Growth Reset",
        "A client-facing reset report focused on booked demos, education-led positioning, and a faster path to measurable conversion.",
        body,
    )


def build_pilot_brief():
    body = """
    <section class="section">
      <h2>Education Pilot Brief</h2>
      <div class="grid">
        <div class="card span-6">
          <h3>Pilot Objective</h3>
          <p>Launch a 30-day hands-on cybersecurity lab pilot for an education team without requiring internal DevOps or infrastructure setup.</p>
          <h3 style="margin-top:18px;">Who It Is For</h3>
          <ul>
            <li>Universities and academic departments</li>
            <li>Cybersecurity instructors and program directors</li>
            <li>Training or innovation teams running practical cyber learning</li>
          </ul>
        </div>
        <div class="card span-6">
          <h3>Core Promise</h3>
          <ul>
            <li>No-code launch</li>
            <li>Browser-based isolated labs</li>
            <li>No infrastructure burden on the institution</li>
            <li>Measurable student engagement and readiness</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>What The Pilot Includes</h2>
      <ul>
        <li>A guided pilot scoping call</li>
        <li>Environment setup and hosted delivery by Simulations Labs</li>
        <li>One defined learner cohort or course use case</li>
        <li>Instructor/faculty enablement for operating the pilot</li>
        <li>Measurement of engagement, completion, and performance indicators</li>
      </ul>
    </section>

    <section class="section">
      <h2>What The Institution Needs To Provide</h2>
      <ul>
        <li>A named instructor or program owner</li>
        <li>A target cohort and approximate participant count</li>
        <li>A use case: lab, assessment, competition, or practical exercise</li>
        <li>One alignment session on desired outcomes</li>
      </ul>
    </section>
    """
    return html_doc(
        "Simulations Labs Education Pilot Brief",
        "A one-page client-facing summary of the 30-day education pilot offer.",
        body,
    )


def build_measurement_framework():
    body = """
    <section class="section">
      <h2>Outcomes & Measurement Framework</h2>
      <div class="grid">
        <div class="card span-6">
          <h3>Learning Engagement</h3>
          <ul>
            <li>Participant activation rate</li>
            <li>Session completion rate</li>
            <li>Lab participation depth</li>
            <li>Repeat session activity</li>
          </ul>
        </div>
        <div class="card span-6">
          <h3>Readiness & Assessment</h3>
          <ul>
            <li>Challenge completion rate</li>
            <li>Performance by scenario</li>
            <li>Improvement from baseline to end-of-pilot</li>
            <li>Assessment credibility beyond theory-only evaluation</li>
          </ul>
        </div>
      </div>
      <div class="grid" style="margin-top:16px;">
        <div class="card span-6">
          <h3>Faculty Efficiency</h3>
          <ul>
            <li>Reduction in setup overhead</li>
            <li>Ease of running labs and exercises</li>
            <li>Clarity of performance reporting</li>
          </ul>
        </div>
        <div class="card span-6">
          <h3>Decision Use</h3>
          <ul>
            <li>Use pilot data to decide on wider rollout</li>
            <li>Use cohort performance to refine curriculum design</li>
            <li>Use participation and readiness data to show stakeholder impact</li>
          </ul>
        </div>
      </div>
    </section>
    """
    return html_doc(
        "Simulations Labs Outcomes & Measurement Framework",
        "A one-page framework for how an education pilot can be evaluated during the first 30 days.",
        body,
    )


def build_proof_sheet():
    body = """
    <section class="section">
      <h2>Proof Sheet</h2>
      <ul>
        <li>Built around more than 15 years of CTF and competition experience.</li>
        <li>No-code simulation and CTF builder for teams that do not want to manage technical setup.</li>
        <li>Fully managed infrastructure, including browser-based isolated environments for each participant.</li>
        <li>Supports universities, instructors, organizations, and cybersecurity teams that need practical learning and assessment.</li>
        <li>Flexible deployment options: SaaS, private hosting, or on-premise where needed.</li>
        <li>Early external proof already exists through public reviews and the existing challenge library and competition guides.</li>
      </ul>
    </section>

    <section class="section">
      <h2>What This Means For Education Teams</h2>
      <ul>
        <li>Less time spent on lab setup and technical overhead.</li>
        <li>More focus on learner engagement, instruction quality, and measurable readiness.</li>
        <li>A clearer path to running practical cybersecurity exercises at institutional scale.</li>
      </ul>
    </section>
    """
    return html_doc(
        "Simulations Labs Education Proof Sheet",
        "A concise evidence-led sheet that translates product strengths into education outcomes.",
        body,
    )


def build_demo_deck():
    body = """
    <section class="section">
      <h2>Demo / Pilot Deck</h2>
      <div class="grid">
        <div class="card span-12">
          <h3>1. The Problem</h3>
          <p>Education teams want hands-on cybersecurity learning, but technical environment setup, fairness, and measurement often slow adoption.</p>
        </div>
        <div class="card span-12">
          <h3>2. The Shift</h3>
          <p>Simulations Labs positions itself not as just another tool, but as the fastest route to launching measurable cyber learning without DevOps overhead.</p>
        </div>
        <div class="card span-12">
          <h3>3. What The Pilot Looks Like</h3>
          <p>A 30-day scoped pilot for one cohort, one use case, and one set of agreed outcomes.</p>
        </div>
        <div class="card span-12">
          <h3>4. What Can Be Measured</h3>
          <p>Activation, participation, challenge completion, performance, readiness signals, and faculty execution efficiency.</p>
        </div>
        <div class="card span-12">
          <h3>5. The CTA</h3>
          <p>Book a pilot scoping call to define the cohort, use case, and success criteria.</p>
        </div>
      </div>
    </section>
    """
    return html_doc(
        "Simulations Labs Demo / Pilot Deck",
        "A short client-facing narrative for discovery calls and pilot scoping conversations.",
        body,
    )


def main():
    ensure_dir(REPORT_DIR)

    files = {
        "simlabs-growth-reset-report.html": build_report(),
        "simlabs-education-pilot-brief.html": build_pilot_brief(),
        "simlabs-outcomes-measurement-framework.html": build_measurement_framework(),
        "simlabs-education-proof-sheet.html": build_proof_sheet(),
        "simlabs-demo-pilot-deck.html": build_demo_deck(),
    }

    for filename, content in files.items():
        (REPORT_DIR / filename).write_text(content, encoding="utf-8")

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "reportDir": str(REPORT_DIR),
        "files": sorted(files.keys()),
    }
    (REPORT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest))


if __name__ == "__main__":
    main()
