#!/usr/bin/env python3
"""Merge a JSON question file into questions.json without duplicating ids.

  python3 tools/add_questions.py questions_from_pack.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / "questions.json"

REQUIRED = ("id", "type", "difficulty", "topic", "question")
TYPES = {
    "multiple_choice",
    "multi_select",
    "true_false",
    "free_response",
    "label",
    "data_analysis",
}
DIFFICULTIES = {"easy", "medium", "hard"}


def load_incoming(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    if isinstance(data, dict) and data.get("id"):
        return [data]
    raise SystemExit("Expected a question object, an array, or a bank with questions.")


def validate(question: dict) -> str:
    for key in REQUIRED:
        if not question.get(key) and question.get(key) != False:
            return f"missing {key}"
    if question["type"] not in TYPES:
        return f"bad type {question['type']}"
    if question["difficulty"] not in DIFFICULTIES:
        return f"bad difficulty {question['difficulty']}"
    return ""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("incoming", type=Path)
    parser.add_argument("--bank", type=Path, default=BANK)
    args = parser.parse_args()

    bank = json.loads(args.bank.read_text(encoding="utf-8"))
    existing = {question["id"] for question in bank["questions"]}
    added = 0
    for question in load_incoming(args.incoming):
        problem = validate(question)
        if problem:
            print(f"skip {question.get('id', '?')}: {problem}")
            continue
        if question["id"] in existing:
            print(f"skip {question['id']}: already in the bank")
            continue
        bank["questions"].append(question)
        existing.add(question["id"])
        added += 1
        print(f"added {question['id']}")

    args.bank.write_text(json.dumps(bank, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{added} added. Bank now has {len(bank['questions'])} questions.")


if __name__ == "__main__":
    main()
