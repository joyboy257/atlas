#!/usr/bin/env python3
"""Validate the ATLAS-BMR-002 execution package with Python stdlib only."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any

HERE = Path(__file__).resolve()
DOC = HERE.parent.parent
ROOT = DOC.parents[3]

REQUIRED_FILES = [
    "00_README.md",
    "01_HANDOVER_BASELINE_AND_PRESERVATION.md",
    "02_AGENTIC_PRODUCT_CONSTITUTION.md",
    "02A_COMPLETE_PRODUCT_SCOPE_AND_BUILD_TEST_STRATEGY.md",
    "03_LOCKED_DECISIONS_AND_DEFAULTS.md",
    "04_POST_CLOSURE_STOCKTAKE_PROTOCOL.md",
    "05_CURRENT_AND_TARGET_ARCHITECTURE.md",
    "06_AGENT_MISSION_AND_LEARNING_CONTRACT.md",
    "07_DURABLE_AGENT_RUNTIME_SPEC.md",
    "08_DEVELOPER_PLATFORM_AND_INTEROPERABILITY_SPEC.md",
    "09_PROVIDER_AND_CHANNEL_OPERATIONS_SPEC.md",
    "10_PRODUCTION_CLOUD_RELIABILITY_SPEC.md",
    "11_ENTERPRISE_TRUST_AND_GOVERNANCE_SPEC.md",
    "12_COMMERCIAL_SELF_SERVE_SPEC.md",
    "13_ECOSYSTEM_AND_EXTENSION_SPEC.md",
    "14_FLAGSHIP_OUTSIDE_IN_JOURNEYS.md",
    "15_EXECUTION_PROGRAMME.md",
    "16_VERIFICATION_EVAL_AND_RELEASE_GATES.md",
    "17_DEPLOYMENT_PROMOTION_AND_ROLLBACK_RUNBOOK.md",
    "18_RISK_BLOCKER_AND_EXTERNAL_DEPENDENCY_REGISTER.md",
    "19_REQUIREMENTS_TRACEABILITY_MATRIX.md",
    "20_CLAUDE_CODE_END_TO_END_EXECUTION_PROMPT.md",
    "21_WORKER_DELEGATION_AND_VERIFICATION_PROTOCOL.md",
    "22_SESSION_RESTART_AND_CONTEXT_RECOVERY.md",
    "23_EXTERNAL_RESEARCH_REGISTER.md",
    "24_INDEPENDENT_REVIEW_PROTOCOL.md",
    "25_FINAL_RELEASE_AND_CLOSURE_DECISION_TEMPLATE.md",
    "execution-board.v3.json",
    "release-gates.v3.json",
    "gap-register.v3.json",
    "requirements-traceability.v3.json",
    "capability-maturity.v1.json",
    "provider-readiness.v3.json",
    "founder-decisions.v3.json",
    "risk-register.v1.json",
    "evidence-index.v1.json",
    "package-metadata.v3.json",
    "atlas_bmr002_execution_log.md",
    "ATLAS_BMR_002_EXECUTION_AUTHORITY_COMBINED.md",
    "MANIFEST.md",
    "schemas/execution-board.schema.json",
    "schemas/evidence-record.schema.json",
]

HIGH_CONFIDENCE_SECRET_PATTERNS = {
    "private_key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    "aws_access_key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "github_token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    "stripe_live_key": re.compile(r"\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b"),
    "openai_key": re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b"),
    "anthropic_key": re.compile(r"\bsk-ant-[A-Za-z0-9_-]{24,}\b"),
    "slack_token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
}

def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def add(checks: list[dict[str, Any]], name: str, passed: bool, detail: str) -> None:
    checks.append({"name": name, "passed": bool(passed), "detail": detail})

def graph_cycle(nodes: dict[str, dict[str, Any]]) -> list[str] | None:
    state: dict[str, int] = {}
    stack: list[str] = []
    def visit(n: str) -> list[str] | None:
        state[n] = 1
        stack.append(n)
        for d in nodes[n].get("dependencies", []):
            if d not in nodes:
                continue
            if state.get(d) == 1:
                i = stack.index(d)
                return stack[i:] + [d]
            if state.get(d, 0) == 0:
                c = visit(d)
                if c:
                    return c
        stack.pop()
        state[n] = 2
        return None
    for n in nodes:
        if state.get(n, 0) == 0:
            c = visit(n)
            if c:
                return c
    return None

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--skip-checksums", action="store_true")
    args = parser.parse_args()

    checks: list[dict[str, Any]] = []

    missing = [f for f in REQUIRED_FILES if not (DOC / f).is_file()]
    add(checks, "required_files", not missing, "missing=" + repr(missing))

    json_paths = sorted(DOC.glob("*.json")) + sorted((DOC / "schemas").glob("*.json"))
    json_errors = []
    loaded: dict[str, Any] = {}
    for p in json_paths:
        try:
            loaded[p.name] = load_json(p)
        except Exception as e:
            json_errors.append(f"{p.relative_to(ROOT)}: {e}")
    add(checks, "json_parse", not json_errors, "; ".join(json_errors) or f"{len(json_paths)} JSON files parsed")

    board = loaded.get("execution-board.v3.json", {})
    gates = loaded.get("release-gates.v3.json", {})
    gaps = loaded.get("gap-register.v3.json", {})
    rtm = loaded.get("requirements-traceability.v3.json", {})
    meta = loaded.get("package-metadata.v3.json", {})

    items = board.get("work_items", [])
    item_ids = [w.get("id") for w in items]
    unique_items = len(item_ids) == len(set(item_ids)) and None not in item_ids
    add(checks, "work_item_ids_unique", unique_items, f"items={len(item_ids)} unique={len(set(item_ids))}")

    phase_ids = {p.get("id") for p in board.get("phases", [])}
    bad_phases = [w.get("id") for w in items if w.get("phase") not in phase_ids]
    add(checks, "work_item_phases", not bad_phases, "bad=" + repr(bad_phases))

    node_map = {w["id"]: w for w in items if "id" in w}
    missing_deps = sorted({d for w in items for d in w.get("dependencies", []) if d not in node_map})
    add(checks, "dependency_references", not missing_deps, "missing=" + repr(missing_deps))
    cycle = graph_cycle(node_map) if not missing_deps else None
    add(checks, "dependency_acyclic", cycle is None, "cycle=" + repr(cycle))

    gate_ids = {g.get("id") for g in gates.get("gates", [])}
    bad_gates = [w.get("id") for w in items if w.get("release_gate") not in gate_ids]
    add(checks, "gate_references", not bad_gates, "bad=" + repr(bad_gates))

    statuses = set(board.get("status_vocabulary", []))
    maturities = set(board.get("maturity_vocabulary", []))
    bad_status = [w.get("id") for w in items if w.get("status") not in statuses]
    bad_maturity = [w.get("id") for w in items if w.get("maturity") not in maturities]
    add(checks, "status_vocabulary", not bad_status, "bad=" + repr(bad_status))
    add(checks, "maturity_vocabulary", not bad_maturity, "bad=" + repr(bad_maturity))

    required_item_fields = {
        "id","phase","title","outcome","dependencies","implementation_surfaces",
        "acceptance_criteria","tests","required_environment","evidence","rollback",
        "owner","release_gate","falsifier","status","maturity","gap_ids","requirement_ids"
    }
    incomplete = {w.get("id"): sorted(required_item_fields - set(w)) for w in items if required_item_fields - set(w)}
    empty_core = [w.get("id") for w in items if not w.get("acceptance_criteria") or not w.get("tests") or not w.get("evidence") or not w.get("rollback") or not w.get("falsifier")]
    add(checks, "work_item_completeness", not incomplete and not empty_core, f"incomplete={incomplete} empty_core={empty_core}")

    gap_ids = {g.get("id") for g in gaps.get("gaps", [])}
    req_ids = {r.get("id") for r in rtm.get("requirements", [])}
    bad_gap_refs = sorted({x for w in items for x in w.get("gap_ids", []) if x not in gap_ids})
    bad_req_refs = sorted({x for w in items for x in w.get("requirement_ids", []) if x not in req_ids})
    add(checks, "traceability_refs", not bad_gap_refs and not bad_req_refs, f"bad_gaps={bad_gap_refs} bad_requirements={bad_req_refs}")

    rtm_item_refs = sorted({x for r in rtm.get("requirements", []) for x in r.get("work_item_ids", []) if x not in node_map})
    rtm_gap_refs = sorted({x for r in rtm.get("requirements", []) for x in r.get("gap_ids", []) if x not in gap_ids})
    add(checks, "rtm_integrity", not rtm_item_refs and not rtm_gap_refs, f"bad_items={rtm_item_refs} bad_gaps={rtm_gap_refs}")

    expected_count = meta.get("work_item_count")
    add(checks, "metadata_counts", expected_count == len(items), f"metadata={expected_count} actual={len(items)}")
    add(checks, "initial_active_item", board.get("active_work_item") in node_map, repr(board.get("active_work_item")))

    historical_files = [str(p.relative_to(ROOT)) for p in ROOT.rglob("*") if p.is_file() and "ATLAS-BMR-001" in p.parts]
    add(checks, "no_bmr001_historical_files", not historical_files, "found=" + repr(historical_files))

    # A package may mention the historical programme; it must not contain old canonical files.
    secret_hits = []
    for p in ROOT.rglob("*"):
        if not p.is_file() or p.name in {"SHA256SUMS.txt","ATLAS_BMR_002_EXECUTION_OVERLAY_SHA256SUMS.txt"}:
            continue
        if any(part in {".git","node_modules","dist","build"} for part in p.parts):
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for label, pattern in HIGH_CONFIDENCE_SECRET_PATTERNS.items():
            for m in pattern.finditer(text):
                secret_hits.append({"path":str(p.relative_to(ROOT)),"pattern":label,"offset":m.start()})
    add(checks, "high_confidence_secret_scan", not secret_hits, json.dumps(secret_hits))

    # Validate internal markdown links that point to local files.
    broken_links = []
    link_re = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
    for p in ROOT.rglob("*.md"):
        text = p.read_text(encoding="utf-8")
        for target in link_re.findall(text):
            if "://" in target or target.startswith("#") or target.startswith("mailto:"):
                continue
            clean = target.split("#",1)[0]
            if not clean:
                continue
            q = (p.parent / clean).resolve()
            try:
                q.relative_to(ROOT.resolve())
            except ValueError:
                continue
            if not q.exists():
                broken_links.append(f"{p.relative_to(ROOT)} -> {target}")
    add(checks, "markdown_local_links", not broken_links, "broken=" + repr(broken_links))

    if not args.skip_checksums:
        manifest = DOC / "SHA256SUMS.txt"
        checksum_errors = []
        if manifest.exists():
            for line in manifest.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                try:
                    expected, rel = line.split("  ",1)
                except ValueError:
                    checksum_errors.append(f"bad line: {line!r}")
                    continue
                p = DOC / rel
                if not p.is_file():
                    checksum_errors.append(f"missing {rel}")
                elif sha256(p) != expected:
                    checksum_errors.append(f"mismatch {rel}")
        else:
            checksum_errors.append("SHA256SUMS.txt absent")
        add(checks, "canonical_checksums", not checksum_errors, "; ".join(checksum_errors) or "verified")

    # Complete-product execution semantics must be explicit.
    scope_text = (DOC / "02A_COMPLETE_PRODUCT_SCOPE_AND_BUILD_TEST_STRATEGY.md").read_text(encoding="utf-8")
    prompt_text = (DOC / "20_CLAUDE_CODE_END_TO_END_EXECUTION_PROMPT.md").read_text(encoding="utf-8")
    add(checks, "complete_product_scope", all(term in scope_text for term in ["production Atlas Cloud", "provider and channel operations", "enterprise trust", "commercial self-serve", "whole-product certification"]), "first-class product planes present")
    add(checks, "build_then_whole_product_test", all(term in prompt_text for term in ["continuous focused tests", "integrate and seal the complete product candidate", "whole-product staging certification"]), "construction and final certification order present")
    p7_3 = node_map.get("ATLAS-BMR2-P7-003", {})
    p7_5 = node_map.get("ATLAS-BMR2-P7-005", {})
    add(checks, "integrated_candidate_before_staging_test", p7_3.get("release_gate") == "G7" and p7_5.get("release_gate") == "G8" and "ATLAS-BMR2-P7-004" in p7_5.get("dependencies", []), f"P7-003={p7_3.get('release_gate')} P7-005_deps={p7_5.get('dependencies')}")

    passed = all(c["passed"] for c in checks)
    report = {
        "schema_version":"3.0.0",
        "programme":"ATLAS-BMR-002",
        "package_version":meta.get("package_version"),
        "validator":str(HERE.relative_to(ROOT)),
        "passed":passed,
        "checks":checks,
        "summary":{
            "work_items":len(items),
            "phases":len(board.get("phases", [])),
            "gates":len(gates.get("gates", [])),
            "gaps":len(gaps.get("gaps", [])),
            "requirements":len(rtm.get("requirements", [])),
        }
    }
    if args.write_report:
        (DOC / "package-validation.v3.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if passed else 1

if __name__ == "__main__":
    raise SystemExit(main())
