#!/usr/bin/env python3
"""
Java → Blocks round-trip checker (CLI).

Uses the same parser/convert as the web tool (via Node + j2b_cli.js).

Examples:
  python3 j2b.py AllMotorsTeleOp.java
  python3 j2b.py ../MotorDiagnostics.java -o MotorDiagnostics.blk --config ../test_config.xml
  python3 j2b.py *.java
  python3 j2b.py DiagLeftFront.java --json
  python3 j2b.py path/to/dir --recursive

Robot config (test_config.xml) is auto-discovered walking up from the Java file,
or set explicitly with --config. Device names in .blk must match that XML.

Exit codes:
  0  all files clean
  1  one or more round-trip issues
  2  tool / Node error
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
NODE_CLI = HERE / "j2b_cli.js"


def find_node() -> str:
    node = shutil.which("node")
    if not node:
        print(
            "error: Node.js is required (runs the shared parser.js / convert.js).\n"
            "  Install from https://nodejs.org/ or `brew install node`",
            file=sys.stderr,
        )
        sys.exit(2)
    return node


def find_default_config(start: Path) -> Path | None:
    dir_path = start if start.is_dir() else start.parent
    for _ in range(8):
        cand = dir_path / "test_config.xml"
        if cand.is_file():
            return cand
        if dir_path.parent == dir_path:
            break
        dir_path = dir_path.parent
    return None


def collect_java_files(paths: list[str], recursive: bool) -> list[Path]:
    out: list[Path] = []
    for p in paths:
        path = Path(p)
        if path.is_dir():
            pattern = "**/*.java" if recursive else "*.java"
            out.extend(sorted(path.glob(pattern)))
        elif path.is_file():
            out.append(path)
        else:
            matches = sorted(Path().glob(p))
            if matches:
                out.extend(matches)
            else:
                print(f"error: not found: {p}", file=sys.stderr)
                sys.exit(2)
    seen = set()
    unique = []
    for f in out:
        rp = f.resolve()
        if rp not in seen and f.suffix == ".java":
            seen.add(rp)
            unique.append(f)
    return unique


def run_one(
    node: str,
    java_file: Path,
    blk: Path | None,
    config: Path | None,
) -> dict:
    java_abs = str(java_file.resolve())
    cmd = [node, str(NODE_CLI), java_abs, "--json"]
    if blk is not None:
        cmd.extend(["--blk", str(Path(blk).resolve())])
    if config is not None:
        cmd.extend(["--config", str(Path(config).resolve())])
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(HERE),
            check=False,
        )
    except OSError as e:
        print(f"error: failed to run Node: {e}", file=sys.stderr)
        sys.exit(2)

    if proc.returncode not in (0, 1):
        err = (proc.stderr or proc.stdout or "").strip()
        print(f"error: j2b_cli failed for {java_file}:\n{err}", file=sys.stderr)
        sys.exit(2)

    try:
        report = json.loads(proc.stdout)
    except json.JSONDecodeError:
        print(
            f"error: bad JSON from j2b_cli for {java_file}:\n{proc.stdout}\n{proc.stderr}",
            file=sys.stderr,
        )
        sys.exit(2)
    report["_exit"] = proc.returncode
    return report


def print_human(report: dict) -> None:
    src = report.get("source", "?")
    n = report.get("issueCount", 0)
    status = "OK" if report.get("ok") else "ISSUES"
    uns = report.get("unsupportedNodes", 0)
    print(f"[{status}] {src}  ({n} issue(s), {uns} unsupported node(s))")
    if report.get("opModeName"):
        print(f"  OpMode: {report['opModeName']} ({report.get('flavor') or '?'})")
    cfg = report.get("config")
    if cfg:
        print(f"  Config: {cfg.get('label')} — {', '.join(cfg.get('devices') or [])}")
    elif cfg is None:
        print("  Config: (none)")
    if report.get("blkWritten"):
        print("  .blk written")
    for idx, issue in enumerate(report.get("issues") or [], 1):
        print()
        print(f"--- {idx}. line {issue.get('line')} ---")
        print(issue.get("message") or "")
        code = (issue.get("code") or "").strip()
        if code:
            print(code)
        tip = (issue.get("tip") or "").strip()
        if tip:
            print("To stay in Blocks: " + tip)
    if n:
        print()
        print(f"{n} edit(s) may not round-trip — fix these before relying on .blk.")


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Check FTC Java OpModes for Java→Blocks round-trip issues."
    )
    ap.add_argument(
        "paths",
        nargs="+",
        help="Java file(s), directories, or globs",
    )
    ap.add_argument(
        "-o",
        "--output",
        metavar="BLK",
        help="Write .blk for a single input file",
    )
    ap.add_argument(
        "-c",
        "--config",
        metavar="XML",
        help="Robot config XML (default: search upward for test_config.xml)",
    )
    ap.add_argument(
        "-r",
        "--recursive",
        action="store_true",
        help="When a path is a directory, include **/*.java",
    )
    ap.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON (one object, or a list if many files)",
    )
    ap.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        help="Only print files that have issues (human mode)",
    )
    ap.add_argument(
        "--summary",
        action="store_true",
        help="After multi-file run, print pass/fail counts",
    )
    args = ap.parse_args()

    if not NODE_CLI.is_file():
        print(f"error: missing {NODE_CLI}", file=sys.stderr)
        sys.exit(2)

    node = find_node()
    files = collect_java_files(args.paths, args.recursive)
    if not files:
        print("error: no .java files found", file=sys.stderr)
        sys.exit(2)

    if args.output and len(files) != 1:
        print("error: --output/-o requires exactly one Java file", file=sys.stderr)
        sys.exit(2)

    config_path = Path(args.config).resolve() if args.config else None
    if config_path is None:
        config_path = find_default_config(files[0].resolve())

    reports = []
    failed = 0
    for f in files:
        blk = Path(args.output) if args.output else None
        report = run_one(node, f, blk, config_path)
        reports.append(report)
        if not report.get("ok"):
            failed += 1

        if args.json:
            continue
        if args.quiet and report.get("ok"):
            continue
        if len(files) > 1:
            print("=" * 60)
        print_human(report)

    if args.json:
        payload = reports[0] if len(reports) == 1 else reports
        print(json.dumps(payload, indent=2))
    elif args.summary or len(files) > 1:
        print()
        print(
            f"Summary: {len(files) - failed} clean, {failed} with issues "
            f"({len(files)} file(s))"
        )
        if config_path:
            print(f"Config: {config_path}")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
