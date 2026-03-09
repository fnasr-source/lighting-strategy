#!/usr/bin/env python3
"""Backfill LUP executive and HR segments to the plan targets."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from argparse import ArgumentParser
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/Users/user/Documents/IDE Projects/Internal AW SOP")
OUT_DIR = ROOT / "campaigns" / "lup-2026" / "outreach" / "out"

APOLLO_BASE = "https://api.apollo.io"
INSTANTLY_BASE = "https://api.instantly.ai"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"

APOLLO_KEY = os.environ["APOLLO_API_KEY"]
INSTANTLY_KEY = os.environ["INSTANTLY_API_KEY"]

COMPANY_SIZES = ["501-1000", "1001-5000", "5001-10000", "10001+"]
INDUSTRIES = [
    "Oil & Energy",
    "Banking",
    "Financial Services",
    "Hospital & Health Care",
    "Real Estate",
    "Government Administration",
    "Defense & Space",
    "Consumer Goods",
    "Telecommunications",
    "Construction",
    "Information Technology & Services",
    "Management Consulting",
    "Professional Services",
    "Airlines/Aviation",
    "Hospitality",
    "Logistics and Supply Chain",
]
ALL_LUP_LABEL_IDS = {
    "69a9f41c63ddd5000dd426f1",  # master
    "69a9f41d63ddd5000dd426f6",  # exec
    "69a9f41ebc908d0011aa5eef",  # hr
    "69a9f41fd0814d001db09108",  # warm
    "69a9f41fbc908d0011aa5f00",  # nurture
}

SEGMENTS = {
    "master": {
        "name": "ICP Holding Pool",
        "target": 700,
        "label_id": "69a9f41c63ddd5000dd426f1",
        "campaign_id": "9dd178cd-33ca-47ef-a6a2-25ae11b6806f",
        "list_id": "933b0b1f-a667-468d-8377-804e89d661f8",
        "query_titles": True,
        "query_industries": False,
        "fetch_per_industry": 140,
        "company_sizes": ["201-500", "501-1000", "1001-5000", "5001-10000", "10001+"],
        "fetch_multiplier": 8,
        "titles": [
            "CEO",
            "Chief Executive Officer",
            "COO",
            "Chief Operating Officer",
            "CFO",
            "Chief Financial Officer",
            "Managing Director",
            "General Manager",
            "Regional Director",
            "Country Head",
            "VP",
            "Vice President",
            "SVP",
            "Senior Vice President",
            "CHRO",
            "Chief Human Resources Officer",
            "Chief People Officer",
            "Chief Learning Officer",
            "Head of Human Resources",
            "Head of HR",
            "Head of Learning and Development",
            "Head of L&D",
            "Talent Development Director",
            "Learning and Development Director",
        ],
        "groups": [
            {"locations": ["United Arab Emirates"], "desired": 300, "priority": 1},
            {"locations": ["Saudi Arabia", "Egypt"], "desired": 220, "priority": 2},
            {
                "locations": [
                    "Poland",
                    "Romania",
                    "Czech Republic",
                    "Hungary",
                    "Qatar",
                    "Kuwait",
                    "Bahrain",
                    "Oman",
                    "Jordan",
                ],
                "desired": 180,
                "priority": 3,
            },
        ],
    },
    "exec": {
        "name": "Executive Outreach",
        "target": 350,
        "label_id": "69a9f41d63ddd5000dd426f6",
        "campaign_id": "630f3ff9-113c-451c-84de-cc4c336a30a6",
        "list_id": "29df9355-545c-4fe2-8910-d3e0b3c78d81",
        "query_titles": True,
        "titles": [
            "CEO",
            "Chief Executive Officer",
            "COO",
            "Chief Operating Officer",
            "CFO",
            "Chief Financial Officer",
            "Managing Director",
            "General Manager",
            "Regional Director",
            "Country Head",
            "VP",
            "Vice President",
            "SVP",
            "Senior Vice President",
        ],
        "groups": [
            {"locations": ["United Arab Emirates"], "desired": 200, "priority": 1},
            {"locations": ["Saudi Arabia", "Egypt"], "desired": 100, "priority": 2},
            {
                "locations": [
                    "Poland",
                    "Romania",
                    "Czech Republic",
                    "Hungary",
                    "Qatar",
                    "Kuwait",
                    "Bahrain",
                    "Oman",
                    "Jordan",
                ],
                "desired": 50,
                "priority": 3,
            },
        ],
    },
    "exec_broad": {
        "name": "Executive Outreach Broad",
        "target": 160,
        "label_id": "69a9f41d63ddd5000dd426f6",
        "campaign_id": "630f3ff9-113c-451c-84de-cc4c336a30a6",
        "list_id": "29df9355-545c-4fe2-8910-d3e0b3c78d81",
        "query_titles": True,
        "company_sizes": ["201-500", "501-1000", "1001-5000", "5001-10000", "10001+"],
        "fetch_multiplier": 6,
        "titles": [
            "President",
            "Regional President",
            "Division President",
            "Executive Director",
            "Business Unit Director",
            "Business Director",
            "Commercial Director",
            "Operations Director",
            "Transformation Director",
            "Strategy Director",
        ],
        "groups": [
            {"locations": ["United Arab Emirates"], "desired": 70, "priority": 1},
            {"locations": ["Saudi Arabia", "Egypt"], "desired": 50, "priority": 2},
            {
                "locations": [
                    "Poland",
                    "Romania",
                    "Czech Republic",
                    "Hungary",
                    "Qatar",
                    "Kuwait",
                    "Bahrain",
                    "Oman",
                    "Jordan",
                ],
                "desired": 40,
                "priority": 3,
            },
        ],
    },
    "hr": {
        "name": "L&D / HR Outreach",
        "target": 322,
        "label_id": "69a9f41ebc908d0011aa5eef",
        "campaign_id": "f204b2a1-ad17-4252-8e9a-a4d4e5a692db",
        "list_id": "ac550f29-72ec-4f51-9c9a-1f5d8573fa3c",
        "query_titles": False,
        "query_industries": False,
        "company_sizes": ["201-500", "501-1000", "1001-5000", "5001-10000", "10001+"],
        "titles": [
            "CHRO",
            "Chief Human Resources Officer",
            "Chief People Officer",
            "Chief Learning Officer",
            "VP HR",
            "Vice President Human Resources",
            "HR Director",
            "Human Resources Director",
            "Director Human Resources",
            "Head of Human Resources",
            "Head of HR",
            "Head of L&D",
            "Head of Learning",
            "Head of Learning and Development",
            "Director Learning & Development",
            "Learning and Development Director",
            "Learning and Development Manager",
            "Talent Development Director",
            "Head of Talent Development",
            "Director Talent Management",
            "Head of Talent Management",
            "People Director",
            "Director People and Culture",
        ],
        "groups": [
            {"locations": ["United Arab Emirates"], "desired": 220, "priority": 1},
            {"locations": ["Saudi Arabia", "Egypt"], "desired": 60, "priority": 2},
            {
                "locations": [
                    "Poland",
                    "Romania",
                    "Czech Republic",
                    "Hungary",
                    "Qatar",
                    "Kuwait",
                    "Bahrain",
                    "Oman",
                    "Jordan",
                ],
                "desired": 42,
                "priority": 3,
            },
        ],
    },
}


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def json_request(method: str, url: str, headers: dict[str, str], payload: dict | None = None) -> dict | list:
    retries = 6
    last_error: Exception | None = None
    for attempt in range(retries):
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, method=method)
        for key, value in headers.items():
            req.add_header(key, value)
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in {429, 500, 502, 503, 504} and attempt < retries - 1:
                retry_after = exc.headers.get("Retry-After")
                if retry_after:
                    delay = float(retry_after)
                else:
                    delay = min(30.0, 2.0 * (attempt + 1))
                time.sleep(delay)
                continue
            raise
        except urllib.error.URLError as exc:
            last_error = exc
            if attempt < retries - 1:
                time.sleep(min(20.0, 2.0 * (attempt + 1)))
                continue
            raise
    if last_error:
        raise last_error
    return {}


def apollo_headers() -> dict[str, str]:
    return {
        "x-api-key": APOLLO_KEY,
        "Content-Type": "application/json",
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }


def instantly_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {INSTANTLY_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
    }


def normalize_email(value: str) -> str:
    return (value or "").strip().lower()


def is_business_email(email: str) -> bool:
    blocked = {
        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
        "icloud.com",
        "aol.com",
        "live.com",
    }
    domain = email.split("@")[-1].lower() if "@" in email else ""
    return bool(domain) and domain not in blocked


def fetch_apollo_contacts(payload: dict, *, stop_after: int) -> list[dict]:
    page = 1
    contacts: list[dict] = []
    while True:
        body = dict(payload)
        body["page"] = page
        body["per_page"] = 100
        data = json_request("POST", f"{APOLLO_BASE}/v1/contacts/search", apollo_headers(), body)
        batch = data.get("contacts") or []
        contacts.extend(batch)
        pagination = data.get("pagination") or {}
        total_pages = int(pagination.get("total_pages") or 1)
        if len(contacts) >= stop_after or page >= total_pages or not batch:
            break
        page += 1
        time.sleep(0.35)
    return contacts


def apollo_label_emails(label_id: str) -> set[str]:
    page = 1
    emails: set[str] = set()
    while True:
        data = json_request(
            "POST",
            f"{APOLLO_BASE}/v1/contacts/search",
            apollo_headers(),
            {"page": page, "per_page": 100, "label_ids": [label_id]},
        )
        batch = data.get("contacts") or []
        for row in batch:
            email = normalize_email(row.get("email") or "")
            if email:
                emails.add(email)
        pagination = data.get("pagination") or {}
        total_pages = int(pagination.get("total_pages") or 1)
        if page >= total_pages or not batch:
            break
        page += 1
        time.sleep(0.2)
    return emails


def historical_lup_emails() -> set[str]:
    emails: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, dict):
            email = normalize_email(str(node.get("email") or ""))
            if email:
                emails.add(email)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)
        elif isinstance(node, str):
            email = normalize_email(node)
            if "@" in email:
                emails.add(email)

    for path in OUT_DIR.rglob("*.json"):
        try:
            walk(json.loads(path.read_text(encoding="utf-8")))
        except Exception:
            continue

    return emails


def current_label_count(label_id: str) -> int:
    data = json_request(
        "POST",
        f"{APOLLO_BASE}/v1/contacts/search",
        apollo_headers(),
        {"page": 1, "per_page": 1, "label_ids": [label_id]},
    )
    pagination = data.get("pagination") or {}
    return int(pagination.get("total_entries") or 0)


def apollo_contacts_by_email(email: str) -> list[dict]:
    data = json_request(
        "POST",
        f"{APOLLO_BASE}/v1/contacts/search",
        apollo_headers(),
        {"page": 1, "per_page": 25, "q_keywords": email},
    )
    return [row for row in (data.get("contacts") or []) if normalize_email(row.get("email") or "") == normalize_email(email)]


def patch_apollo_labels_for_email(email: str, label_id: str) -> int:
    patched = 0
    for row in apollo_contacts_by_email(email):
        json_request(
            "PATCH",
            f"{APOLLO_BASE}/api/v1/contacts/{row['id']}",
            apollo_headers(),
            {"label_ids": [label_id]},
        )
        patched += 1
        time.sleep(0.15)
    return patched


def patch_apollo_contact_ids(contact_ids: list[str], label_id: str) -> int:
    patched = 0
    for contact_id in contact_ids:
        if not contact_id:
            continue
        json_request(
            "PATCH",
            f"{APOLLO_BASE}/api/v1/contacts/{contact_id}",
            apollo_headers(),
            {"label_ids": [label_id]},
        )
        patched += 1
        time.sleep(0.1)
    return patched


def current_campaign_leads(campaign_id: str) -> int:
    rows = json_request("GET", f"{INSTANTLY_BASE}/api/v2/campaigns/analytics", instantly_headers())
    for row in rows:
        if row.get("campaign_id") == campaign_id:
            return int(row.get("leads_count") or 0)
    return 0


def score_title(title: str, segment: str) -> int:
    t = (title or "").lower().replace("-", " ")
    blocked = ("assistant", "student", "coordinator", "recruiter", "talent acquisition", "intern")
    if any(word in t for word in blocked):
        return 0
    if segment == "hr":
        order = [
            "chief people officer",
            "chief human resources officer",
            "chro",
            "vp hr",
            "vice president human resources",
            "head of learning and development",
            "head of l&d",
            "learning and development director",
            "talent development director",
        ]
    elif segment == "master":
        order = [
            "chief executive officer",
            "ceo",
            "chief operating officer",
            "coo",
            "chief financial officer",
            "cfo",
            "managing director",
            "general manager",
            "regional director",
            "country head",
            "chief people officer",
            "chief human resources officer",
            "chro",
            "chief learning officer",
            "senior vice president",
            "svp",
            "vice president",
            "vp",
            "head of human resources",
            "head of hr",
            "head of learning and development",
            "head of l&d",
            "learning and development director",
            "talent development director",
            "human resources director",
            "director people and culture",
            "people director",
            "director",
            "head",
        ]
    elif segment == "exec_broad":
        order = [
            "president",
            "regional president",
            "division president",
            "executive director",
            "business unit director",
            "business director",
            "commercial director",
            "operations director",
            "transformation director",
            "strategy director",
            "director",
            "head",
        ]
    else:
        order = [
            "chief executive officer",
            "ceo",
            "chief operating officer",
            "coo",
            "chief financial officer",
            "cfo",
            "managing director",
            "general manager",
            "regional director",
            "country head",
            "senior vice president",
            "svp",
            "vice president",
            "vp",
        ]
    for idx, needle in enumerate(order):
        if needle in t:
            return len(order) - idx
    if segment == "hr":
        hr_keywords = ("human resources", "people", "learning", "talent", "l&d")
        seniority_keywords = ("chief", "head", "director", "vp", "vice president", "manager", "lead")
        if any(keyword in t for keyword in hr_keywords) and any(keyword in t for keyword in seniority_keywords):
            return 1
    if segment == "master":
        broad_keywords = ("leadership", "people", "human resources", "learning", "talent", "operations", "finance", "strategy", "commercial")
        seniority_keywords = ("chief", "vp", "vice president", "head", "director", "managing director", "general manager", "country head", "regional director")
        if any(keyword in t for keyword in seniority_keywords):
            return 1 + int(any(keyword in t for keyword in broad_keywords))
    if segment == "exec_broad":
        broad_keywords = ("operations", "strategy", "commercial", "business", "transformation", "general management")
        seniority_keywords = ("president", "director", "head")
        if any(keyword in t for keyword in seniority_keywords):
            return 1 + int(any(keyword in t for keyword in broad_keywords))
    return 0


def build_candidates(segment_key: str, excluded_emails: set[str] | None = None) -> list[dict]:
    segment = SEGMENTS[segment_key]
    excluded = excluded_emails or set()
    seen: set[str] = set()
    picked: list[dict] = []

    for group in segment["groups"]:
        group_rows: list[dict] = []
        group_seen: set[str] = set()
        payloads = []
        if segment.get("split_industries"):
            fetch_per_industry = int(segment.get("fetch_per_industry", 120))
            for industry in segment["split_industries"]:
                payloads.append(
                    (
                        {
                            "person_locations": group["locations"],
                            "organization_num_employees_ranges": segment.get("company_sizes", COMPANY_SIZES),
                            "person_titles": segment["titles"] if segment.get("query_titles", True) else None,
                            "q_organization_keyword_tags": [industry],
                        },
                        fetch_per_industry,
                        industry,
                    )
                )
        else:
            fetch_multiplier = int(segment.get("fetch_multiplier", 3 if segment.get("query_titles", True) else 25))
            stop_after = max(150, group["desired"] * fetch_multiplier)
            payloads.append(
                (
                    {
                        "person_locations": group["locations"],
                        "organization_num_employees_ranges": segment.get("company_sizes", COMPANY_SIZES),
                        "person_titles": segment["titles"] if segment.get("query_titles", True) else None,
                        "q_organization_keyword_tags": INDUSTRIES if segment.get("query_industries", True) else None,
                    },
                    stop_after,
                    None,
                )
            )

        print(
            f"[{segment_key}] searching {group['locations']} "
            f"(need ~{group['desired']}, queries={len(payloads)})",
            flush=True,
        )

        for base_payload, stop_after, industry_name in payloads:
            payload = {k: v for k, v in base_payload.items() if v}
            if industry_name:
                print(f"[{segment_key}]   industry={industry_name} fetch cap {stop_after}", flush=True)
            for raw in fetch_apollo_contacts(payload, stop_after=stop_after):
                email = normalize_email(raw.get("email") or "")
                if not email or email in seen or email in group_seen or email in excluded or not is_business_email(email):
                    continue
                if (raw.get("email_status") or "").lower() != "verified":
                    continue
                if set(raw.get("label_ids") or []).intersection(ALL_LUP_LABEL_IDS):
                    continue
                title = raw.get("title") or ""
                title_score = score_title(title, segment_key)
                if title_score <= 0:
                    continue
                organization = raw.get("organization") or {}
                group_rows.append(
                    {
                        "id": raw.get("id"),
                        "email": email,
                        "first_name": raw.get("first_name") or "",
                        "last_name": raw.get("last_name") or "",
                        "title": title,
                        "company_name": raw.get("organization_name") or organization.get("name") or "",
                        "linkedin_url": raw.get("linkedin_url") or "",
                        "label_ids": raw.get("label_ids") or [],
                        "group_priority": group["priority"],
                        "title_score": title_score,
                    }
                )
                group_seen.add(email)

        group_rows.sort(key=lambda row: (row["title_score"], row["company_name"]), reverse=True)
        print(f"[{segment_key}] qualified from {group['locations']}: {len(group_rows)}", flush=True)
        for row in group_rows[: group["desired"]]:
            seen.add(row["email"])
            picked.append(row)

    return picked


def upsert_apollo_contacts(contacts: list[dict], label_id: str) -> dict:
    batches = []
    created = 0
    existing = 0
    patched = 0
    for idx in range(0, len(contacts), 15):
        batch = contacts[idx : idx + 15]
        payload = {
            "contacts": [
                {
                    "email": row["email"],
                    "first_name": row["first_name"],
                    "last_name": row["last_name"],
                    "title": row["title"],
                    "organization_name": row["company_name"],
                    "linkedin_url": row["linkedin_url"],
                    "label_ids": [label_id],
                }
                for row in batch
            ],
            "run_dedupe": True,
        }
        data = json_request("POST", f"{APOLLO_BASE}/api/v1/contacts/bulk_create", apollo_headers(), payload)
        created_contacts = data.get("created_contacts") or []
        existing_contacts = data.get("existing_contacts") or []
        contact_ids = [row.get("id") for row in [*created_contacts, *existing_contacts] if row.get("id")]
        patched += patch_apollo_contact_ids(contact_ids, label_id)
        created += len(created_contacts)
        existing += len(existing_contacts)
        batches.append({"requested": len(batch), "created": len(created_contacts), "existing": len(existing_contacts)})
        print(f"[apollo] batch {idx // 15 + 1}: requested={len(batch)} created={len(created_contacts)} existing={len(existing_contacts)}", flush=True)
        time.sleep(0.35)
    return {"batches": batches, "created": created, "existing": existing, "patched_records": patched}


def add_instantly_leads(segment_key: str, contacts: list[dict]) -> dict:
    segment = SEGMENTS[segment_key]
    submitted = 0
    created = 0
    errors: list[dict] = []

    for idx, row in enumerate(contacts, start=1):
        submitted += 1
        payload = {
            "email": row["email"],
            "first_name": row["first_name"],
            "last_name": row["last_name"],
            "company_name": row["company_name"],
            "job_title": row["title"],
            "linkedin_url": row["linkedin_url"],
            "campaign": segment["campaign_id"],
            "campaign_id": segment["campaign_id"],
            "lead_list_id": segment["list_id"],
        }
        try:
            json_request("POST", f"{INSTANTLY_BASE}/api/v2/leads", instantly_headers(), payload)
            created += 1
        except urllib.error.HTTPError as exc:  # pragma: no cover - defensive only
            body = exc.read().decode("utf-8", errors="replace")
            errors.append({"email": row["email"], "status": exc.code, "body": body[:240]})
        except Exception as exc:  # pragma: no cover - defensive only
            errors.append({"email": row["email"], "error": str(exc)})
        if idx % 10 == 0 or idx == len(contacts):
            print(f"[instantly:{segment_key}] processed={idx}/{len(contacts)} created={created} errors={len(errors)}", flush=True)
        time.sleep(0.4)
        if idx % 25 == 0 and idx < len(contacts):
            time.sleep(5.0)

    return {"submitted": submitted, "created": created, "errors": errors[:50], "errors_count": len(errors)}


def parse_args() -> ArgumentParser:
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--segment", choices=["master", "exec", "exec_broad", "hr", "all"], default="all")
    parser.add_argument("--limit", type=int, default=0, help="Optional max contacts to add per segment for this run.")
    return parser


def main() -> None:
    args = parse_args().parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    summary = {"ts": iso_now(), "segments": {}}
    segments = ("master", "exec", "exec_broad", "hr") if args.segment == "all" else (args.segment,)
    excluded_emails = historical_lup_emails()
    print(f"[setup] excluding {len(excluded_emails)} historical emails from prior LUP runs", flush=True)

    for segment_key in segments:
        segment = SEGMENTS[segment_key]
        before_label = current_label_count(segment["label_id"])
        before_campaign = current_campaign_leads(segment["campaign_id"])
        needed = max(0, segment["target"] - before_campaign)
        if args.limit > 0:
            needed = min(needed, args.limit)

        segment_out = {
            "name": segment["name"],
            "target": segment["target"],
            "before": {"apollo_label": before_label, "campaign_leads": before_campaign},
            "needed": needed,
            "selected": 0,
        }

        if needed <= 0:
            segment_out["status"] = "already_at_target"
            summary["segments"][segment_key] = segment_out
            continue

        print(f"[{segment_key}] before label={before_label} campaign={before_campaign} target={segment['target']} needed={needed}", flush=True)
        candidates = build_candidates(segment_key, excluded_emails)
        to_use = candidates[:needed]
        segment_out["selected"] = len(to_use)
        segment_out["sample_emails"] = [row["email"] for row in to_use[:10]]
        print(f"[{segment_key}] selected {len(to_use)} candidates", flush=True)

        apollo_result = upsert_apollo_contacts(to_use, segment["label_id"])
        instantly_result = add_instantly_leads(segment_key, to_use)
        excluded_emails.update(row["email"] for row in to_use)

        after_label = current_label_count(segment["label_id"])
        after_campaign = current_campaign_leads(segment["campaign_id"])

        segment_out["apollo"] = apollo_result
        segment_out["instantly"] = instantly_result
        segment_out["after"] = {"apollo_label": after_label, "campaign_leads": after_campaign}
        segment_out["status"] = "ok"
        summary["segments"][segment_key] = segment_out

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = OUT_DIR / f"lup_plan_backfill_{stamp}.json"
    out_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print(f"\nWrote {out_path}")


if __name__ == "__main__":
    main()
