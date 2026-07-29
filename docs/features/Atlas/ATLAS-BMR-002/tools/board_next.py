#!/usr/bin/env python3
from pathlib import Path
import json

doc = Path(__file__).resolve().parent.parent
board = json.loads((doc / "execution-board.v3.json").read_text(encoding="utf-8"))
items = {w["id"]: w for w in board["work_items"]}
terminal_ok = {"PASS","SUPERSEDED"}

def ready(w):
    return w["status"] in {"NOT_STARTED","READY","BLOCKED_INTERNAL"} and all(items[d]["status"] in terminal_ok for d in w["dependencies"])

print(f"Active: {board.get('active_work_item')}")
print("Counts:")
counts = {}
for w in items.values():
    counts[w["status"]] = counts.get(w["status"],0)+1
for k in sorted(counts):
    print(f"  {k}: {counts[k]}")
print("Dependency-ready:")
for w in items.values():
    if ready(w):
        print(f"  {w['id']} [{w['phase']}/{w['release_gate']}] {w['title']}")
