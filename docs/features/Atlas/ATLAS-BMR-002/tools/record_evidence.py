#!/usr/bin/env python3
"""Create a checksummed evidence record without storing secrets in the index."""
from __future__ import annotations
import argparse, datetime as dt, hashlib, json
from pathlib import Path

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

parser = argparse.ArgumentParser()
parser.add_argument("--phase", required=True)
parser.add_argument("--work-item", required=True)
parser.add_argument("--gate", required=True)
parser.add_argument("--source-commit", required=True)
parser.add_argument("--environment", required=True)
parser.add_argument("--command-or-journey", required=True)
parser.add_argument("--actor", required=True)
parser.add_argument("--result", required=True, choices=["PASS","FAIL","BLOCKED_EXTERNAL","INCONCLUSIVE"])
parser.add_argument("--artifact-digest")
parser.add_argument("--region")
parser.add_argument("--provider-account-scope")
parser.add_argument("--reviewer")
parser.add_argument("--limitation", action="append", default=[])
parser.add_argument("--output", required=True)
args = parser.parse_args()

now = dt.datetime.now(dt.timezone.utc).isoformat()
record = {
    "programme":"ATLAS-BMR-002",
    "phase":args.phase,
    "work_item":args.work_item,
    "gate":args.gate,
    "source_commit":args.source_commit,
    "artifact_digest":args.artifact_digest,
    "environment":args.environment,
    "region":args.region,
    "provider_account_scope":args.provider_account_scope,
    "command_or_journey":args.command_or_journey,
    "started_at":now,
    "finished_at":now,
    "actor":args.actor,
    "reviewer":args.reviewer,
    "result":args.result,
    "limitations":args.limitation,
}
canonical = json.dumps(record, sort_keys=True, separators=(",",":")).encode()
record["checksum"] = "sha256:" + sha256_bytes(canonical)
out = Path(args.output)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(record,indent=2)+"\n",encoding="utf-8")
print(out)
