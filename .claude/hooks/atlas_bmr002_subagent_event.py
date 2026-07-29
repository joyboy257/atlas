#!/usr/bin/env python3
from pathlib import Path
import datetime as dt
import json
import os
import sys

try:
    raw = json.load(sys.stdin)
except Exception:
    raw = {}

root = Path(os.environ.get("CLAUDE_PROJECT_DIR", raw.get("cwd", "."))).resolve()
out = root / ".factory/evidence/atlas-bmr-002/subagent-delegation.jsonl"
out.parent.mkdir(parents=True, exist_ok=True)

allowed = {
    "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    "hook_event_name": raw.get("hook_event_name"),
    "session_id": raw.get("session_id"),
    "agent_id": raw.get("agent_id"),
    "agent_type": raw.get("agent_type"),
    "model": raw.get("model") or os.environ.get("CLAUDE_CODE_SUBAGENT_MODEL") or "UNVERIFIED_ROUTER_IDENTITY",
    "cwd": str(root),
}
with out.open("a", encoding="utf-8") as f:
    f.write(json.dumps(allowed, sort_keys=True) + "\n")
