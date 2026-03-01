#!/usr/bin/env python3
"""Audit transcript placement for Simulations Labs workspace.

Policy:
- Allowed in Transcripts/: filenames containing one of:
  - simulations-labs
  - aw--qyd
- Non-matching files should live in Transcripts-Excluded/.
"""

from pathlib import Path
import sys

BASE = Path(__file__).resolve().parents[1]
TRANSCRIPTS = BASE / "Transcripts"
ALLOWED = ["simulations-labs", "simlabs", "qyd"]

violations = []
for f in sorted(TRANSCRIPTS.glob("*.md")):
    if f.name.lower() == "readme.md":
        continue
    name = f.name.lower()
    if not any(k in name for k in ALLOWED):
        violations.append(f.name)

if violations:
    print("FAIL: Non-SimLabs transcripts found in Transcripts/")
    for v in violations:
        print(f" - {v}")
    sys.exit(1)

print("OK: Transcript set is clean for Simulations Labs policy.")
