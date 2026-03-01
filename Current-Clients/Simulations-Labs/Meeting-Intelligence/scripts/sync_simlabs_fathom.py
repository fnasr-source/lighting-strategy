#!/usr/bin/env python3
"""Sync ONLY Simulations Labs meetings from Fathom into this folder.

Inclusion rule (any match):
- title has Simulations Labs / SimLabs / QYD
- invitees include simulationslabs.com
- transcript contains SimLabs/QYD keyword

Outputs:
- ../Raw-Fathom/all_meetings.json
- ../Raw-Fathom/simlabs_meetings_filtered.json
- ../Transcripts/*.md
- ../index.json
"""

import os, json, re, requests, unicodedata
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
TRANS = BASE / "Transcripts"
RAW = BASE / "Raw-Fathom"
TRANS.mkdir(exist_ok=True)
RAW.mkdir(exist_ok=True)

API_KEY = os.environ.get("FATHOM_API_KEY")
if not API_KEY:
    raise SystemExit("Missing FATHOM_API_KEY")

HEADERS = {"X-Api-Key": API_KEY}
URL = "https://api.fathom.ai/external/v1/meetings"


def fetch_all():
    items, cursor = [], None
    while True:
        params = {"limit": 100, "include_transcript": "true"}
        if cursor:
            params["cursor"] = cursor
        r = requests.get(URL, headers=HEADERS, params=params, timeout=90)
        r.raise_for_status()
        data = r.json()
        batch = data.get("items", [])
        items.extend(batch)
        cursor = data.get("next_cursor")
        if not cursor or not batch:
            break
    return items


def transcript_text(m):
    t = m.get("transcript") or []
    if isinstance(t, list):
        return "\n".join([(x.get("text") or "") for x in t if isinstance(x, dict)])
    return ""


def is_simlabs(m):
    title = (m.get("title") or m.get("meeting_title") or "")
    title_l = title.lower()

    # Strong title-based include
    if re.search(r"(simulations?\s*labs|simlabs|\bqyd\b)", title, re.I):
        return True

    # Invitee-domain include (explicit SimLabs participants)
    inv = " ".join([str(x) for x in (m.get("calendar_invitees") or [])]).lower()
    if "simulationslabs.com" in inv:
        return True

    # Exclude generic standups by default unless title/domain already matched
    if "stand-up" in title_l or "standup" in title_l:
        return False

    return False


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-")
    return s[:80] or "meeting"


def main():
    all_items = fetch_all()
    (RAW / "all_meetings.json").write_text(json.dumps({"count": len(all_items), "items": all_items}, ensure_ascii=False, indent=2))

    selected = []
    seen = set()
    for m in all_items:
        rid = str(m.get("recording_id") or m.get("id") or "")
        if not rid or rid in seen:
            continue
        if is_simlabs(m):
            seen.add(rid)
            selected.append(m)

    selected.sort(key=lambda x: x.get("created_at") or "")
    (RAW / "simlabs_meetings_filtered.json").write_text(json.dumps({"count": len(selected), "items": selected}, ensure_ascii=False, indent=2))

    entries = []
    for m in selected:
        title = (m.get("title") or m.get("meeting_title") or "Meeting").strip()
        created_at = m.get("created_at") or ""
        day = created_at[:10] if len(created_at) >= 10 else "unknown-date"
        rid = str(m.get("recording_id") or m.get("id") or "noid")
        fname = f"{day}_{slug(title)}_{rid}.md"
        fp = TRANS / fname

        summary = (m.get("default_summary") or {}).get("text", "") if isinstance(m.get("default_summary"), dict) else ""
        full = transcript_text(m)
        inv = m.get("calendar_invitees") or []

        fp.write_text(
            f"# {title}\n\n"
            f"- Date: {created_at}\n"
            f"- Recording ID: {rid}\n"
            f"- Share URL: {m.get('share_url') or ''}\n"
            f"- URL: {m.get('url') or ''}\n"
            f"- Invitees: {', '.join([str(x) for x in inv])}\n\n"
            f"## Summary\n{summary or 'N/A'}\n\n"
            f"## Transcript\n{full or 'No transcript text provided.'}\n"
        )

        entries.append({
            "date": created_at,
            "title": title,
            "file": f"Transcripts/{fname}",
            "recording_id": rid,
            "share_url": m.get("share_url"),
        })

    (BASE / "index.json").write_text(json.dumps(sorted(entries, key=lambda x: x["date"]), ensure_ascii=False, indent=2) + "\n")
    print(f"Synced {len(entries)} SimLabs meetings")


if __name__ == "__main__":
    main()
