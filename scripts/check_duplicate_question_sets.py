#!/usr/bin/env python3
"""Check whether duplicate question set IDs contain identical questions and option values.

For each question set ID that appears more than once, compares:
- question count
- per-question: researcher_label, text, kind, and option values/labels

Prints a clear report of matches vs mismatches.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


def _normalise_question(q: dict[str, Any]) -> dict[str, Any]:
    """Return a canonical representation of a question for comparison."""
    return {
        "researcher_label": (q.get("researcher_label") or "").strip(),
        "text": (q.get("text") or "").strip(),
        "kind": (q.get("kind") or "").strip(),
        "options": [
            {
                "value": o.get("value"),
                "label": (o.get("label") or "").strip(),
            }
            for o in (q.get("options") or [])
        ],
    }


def _collect_by_id(payload: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Group question sets by their id, retaining questionnaire name for context."""
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for questionnaire in payload.get("questionnaires", []):
        q_name = questionnaire.get("name", "unknown")
        for q_set in questionnaire.get("question_sets", []):
            qs_id = (q_set.get("id") or "").strip()
            if not qs_id:
                continue
            grouped[qs_id].append(
                {
                    "questionnaire_name": q_name,
                    "question_set_name": q_set.get("name", ""),
                    "questions": [_normalise_question(q) for q in q_set.get("questions", [])],
                }
            )
    return grouped


def _questions_match(a: list[dict], b: list[dict]) -> tuple[bool, str]:
    """Return (match, reason) comparing two normalised question lists."""
    if len(a) != len(b):
        return False, f"question count differs ({len(a)} vs {len(b)})"
    for idx, (qa, qb) in enumerate(zip(a, b), start=1):
        if qa["researcher_label"] != qb["researcher_label"]:
            return False, f"Q{idx} researcher_label differs: {qa['researcher_label']!r} vs {qb['researcher_label']!r}"
        if qa["text"] != qb["text"]:
            return False, f"Q{idx} text differs"
        if qa["kind"] != qb["kind"]:
            return False, f"Q{idx} kind differs: {qa['kind']!r} vs {qb['kind']!r}"
        if qa["options"] != qb["options"]:
            return False, f"Q{idx} options differ"
    return True, "identical"


def run_check(payload: dict[str, Any]) -> None:
    grouped = _collect_by_id(payload)
    duplicates = {k: v for k, v in grouped.items() if len(v) > 1}

    if not duplicates:
        print("No duplicate question set IDs found.")
        return

    total = len(duplicates)
    all_match = 0
    mismatches: list[tuple[str, str]] = []

    for qs_id, entries in sorted(duplicates.items()):
        first_questions = entries[0]["questions"]
        first_label = f"{entries[0]['questionnaire_name']} / {entries[0]['question_set_name']}"

        id_mismatches: list[str] = []
        for other in entries[1:]:
            other_label = f"{other['questionnaire_name']} / {other['question_set_name']}"
            match, reason = _questions_match(first_questions, other["questions"])
            if not match:
                id_mismatches.append(f"  [{first_label}] vs [{other_label}]: {reason}")

        if id_mismatches:
            mismatches.append((qs_id, "\n".join(id_mismatches)))
        else:
            all_match += 1

    print(f"Duplicate question set IDs found: {total}")
    print(f"  Identical across all occurrences : {all_match}")
    print(f"  Have content mismatches          : {len(mismatches)}")

    if mismatches:
        print("\n--- MISMATCHES ---")
        for qs_id, detail in mismatches:
            print(f"\nID: {qs_id}")
            print(detail)
    else:
        print("\nAll duplicate IDs contain identical question sets.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check duplicate question set IDs for content consistency."
    )
    parser.add_argument(
        "input_json",
        type=Path,
        help="Path to JSON file (e.g. ai_static_context.json)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        payload = json.loads(args.input_json.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"Input file not found: {args.input_json}")
        return 1
    except json.JSONDecodeError as exc:
        print(f"Invalid JSON in {args.input_json}: {exc}")
        return 1

    run_check(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
