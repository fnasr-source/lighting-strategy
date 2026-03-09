#!/usr/bin/env python3
"""Run plan-aligned LUP backfill in safe autonomous batches."""

from __future__ import annotations

import json
import time
from argparse import ArgumentParser
from datetime import datetime, timezone
from pathlib import Path

import lup_backfill as base

OUT_DIR = Path("/Users/user/Documents/IDE Projects/Internal AW SOP/campaigns/lup-2026/outreach/out")

CAMPAIGN_TARGETS = {
    "9dd178cd-33ca-47ef-a6a2-25ae11b6806f": 700,  # holding pool
    "630f3ff9-113c-451c-84de-cc4c336a30a6": 350,  # executive
    "f204b2a1-ad17-4252-8e9a-a4d4e5a692db": 322,  # hr
}

SEGMENT_PLAN = [
    {"segment": "exec", "batch_size": 25},
    {"segment": "exec_broad", "batch_size": 15},
    {"segment": "hr", "batch_size": 12},
    {"segment": "master", "batch_size": 40},
]


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def effective_needed(segment_key: str) -> int:
    campaign_id = base.SEGMENTS[segment_key]["campaign_id"]
    target = CAMPAIGN_TARGETS[campaign_id]
    current = base.current_campaign_leads(campaign_id)
    return max(0, target - current)


def run_segment_once(segment_key: str, batch_size: int, excluded_emails: set[str]) -> dict:
    segment = base.SEGMENTS[segment_key]
    before_campaign = base.current_campaign_leads(segment["campaign_id"])
    before_label = base.current_label_count(segment["label_id"])
    needed = effective_needed(segment_key)
    allowed = min(batch_size, needed)

    report = {
        "segment": segment_key,
        "name": segment["name"],
        "before_campaign": before_campaign,
        "before_label": before_label,
        "needed": needed,
        "selected": 0,
        "instantly_created": 0,
        "apollo_existing": 0,
        "apollo_created": 0,
        "status": "pending",
    }

    if allowed <= 0:
        report["status"] = "at_target"
        return report

    candidates = base.build_candidates(segment_key, excluded_emails)
    to_use = candidates[:allowed]
    report["selected"] = len(to_use)
    report["sample_emails"] = [row["email"] for row in to_use[:10]]

    if not to_use:
        report["status"] = "exhausted"
        return report

    apollo_result = base.upsert_apollo_contacts(to_use, segment["label_id"])
    instantly_result = base.add_instantly_leads(segment_key, to_use)

    excluded_emails.update(row["email"] for row in to_use)
    after_campaign = base.current_campaign_leads(segment["campaign_id"])
    after_label = base.current_label_count(segment["label_id"])

    report["apollo_existing"] = apollo_result.get("existing", 0)
    report["apollo_created"] = apollo_result.get("created", 0)
    report["instantly_created"] = instantly_result.get("created", 0)
    report["after_campaign"] = after_campaign
    report["after_label"] = after_label
    report["apollo"] = apollo_result
    report["instantly"] = instantly_result
    report["status"] = "ok"
    return report


def parse_args() -> ArgumentParser:
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--rounds", type=int, default=2, help="Maximum number of loop rounds.")
    parser.add_argument("--cooldown", type=float, default=12.0, help="Pause between segment runs.")
    return parser


def main() -> None:
    args = parse_args().parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    excluded_emails = base.historical_lup_emails()
    summary = {
        "generated_at": iso_now(),
        "rounds": [],
        "starting_excluded_emails": len(excluded_emails),
    }

    exhausted_segments: set[str] = set()

    for round_idx in range(1, args.rounds + 1):
        round_report = {"round": round_idx, "segments": []}
        round_created = 0

        for step in SEGMENT_PLAN:
            segment_key = step["segment"]
            if segment_key in exhausted_segments:
                round_report["segments"].append(
                    {"segment": segment_key, "status": "skipped_exhausted"}
                )
                continue

            report = run_segment_once(segment_key, step["batch_size"], excluded_emails)
            round_report["segments"].append(report)
            round_created += int(report.get("instantly_created", 0))

            if report["status"] == "exhausted":
                exhausted_segments.add(segment_key)

            time.sleep(args.cooldown)

        round_report["instantly_created_total"] = round_created
        summary["rounds"].append(round_report)

        if round_created <= 0:
            summary["stop_reason"] = "no_progress"
            break

    summary["ending_excluded_emails"] = len(excluded_emails)
    summary["totals"] = {
        "instantly_created": sum(
            int(segment.get("instantly_created", 0))
            for round_report in summary["rounds"]
            for segment in round_report["segments"]
        ),
        "apollo_existing": sum(
            int(segment.get("apollo_existing", 0))
            for round_report in summary["rounds"]
            for segment in round_report["segments"]
        ),
        "apollo_created": sum(
            int(segment.get("apollo_created", 0))
            for round_report in summary["rounds"]
            for segment in round_report["segments"]
        ),
    }

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = OUT_DIR / f"lup_autoloop_{stamp}.json"
    out_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print(f"\nWrote {out_path}")


if __name__ == "__main__":
    main()
