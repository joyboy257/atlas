#!/usr/bin/env python3
from pathlib import Path
import os

root = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).resolve()
log = root / "docs/features/Atlas/ATLAS-BMR-002/atlas_bmr002_execution_log.md"
board = root / "docs/features/Atlas/ATLAS-BMR-002/execution-board.v3.json"
print("ATLAS-BMR-002 context recovery: read the latest execution-log checkpoint and verify it against current Git before continuing.")
print(f"Execution board: {board}")
if log.exists():
    lines = log.read_text(encoding="utf-8", errors="replace").splitlines()
    tail = lines[-80:]
    print("Latest log tail:")
    print("\n".join(tail))
