#!/usr/bin/env python3
"""Generate markdown files for each question set.

Input JSON is expected to include:
- health_domains: [{id, label}, ...]
- questionnaires: [{name, health_domain_id, question_sets: [...]}, ...]

Each question set is rendered to its own file named by question_set.name.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def _safe_text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value)


def _build_domain_map(payload: dict[str, Any]) -> dict[str, str]:
    domains = payload.get("health_domains", [])
    mapping: dict[str, str] = {}
    for domain in domains:
        domain_id = _safe_text(domain.get("id")).strip()
        if not domain_id:
            continue
        mapping[domain_id] = _safe_text(domain.get("label"), "Unknown Domain").strip() or "Unknown Domain"
    return mapping


def _collect_question_set_records(payload: dict[str, Any]) -> list[dict[str, Any]]:
    domain_map = _build_domain_map(payload)
    records: list[dict[str, Any]] = []

    for questionnaire in payload.get("questionnaires", []):
        questionnaire_name = _safe_text(questionnaire.get("name"), "Unnamed Questionnaire")
        domain_id = _safe_text(questionnaire.get("health_domain_id")).strip()
        domain_label = domain_map.get(domain_id, f"Unknown Domain ({domain_id or 'no-id'})")

        for q_set in questionnaire.get("question_sets", []):
            records.append(
                {
                    "domain_label": domain_label,
                    "questionnaire_name": questionnaire_name,
                    "question_set": q_set,
                }
            )

    return records


def _render_option_line(option: dict[str, Any]) -> str:
    value = _safe_text(option.get("value"), "")
    meaning = _safe_text(option.get("label"), "")
    return f"- value: {value} | meaning: {meaning}"


def _render_question_set_markdown(
    domain_label: str,
    questionnaire_name: str,
    question_set: dict[str, Any],
) -> str:
    lines: list[str] = ["# Question Set Representation", ""]
    lines.append(f"- domain: {domain_label}")
    lines.append(f"- questionnaire: {questionnaire_name}")
    lines.append("")

    questions = question_set.get("questions", [])
    if not questions:
        lines.append("No questions found.")
        return "\n".join(lines).rstrip() + "\n"

    for idx, question in enumerate(questions, start=1):
        q_label = _safe_text(question.get("researcher_label"), "")
        q_kind = _safe_text(question.get("kind"), "")
        q_text = _safe_text(question.get("text"), "")

        lines.append(f"{idx}. **Question**: {q_text}")
        if q_label:
            lines.append(f"   - code: {q_label}")

        options = question.get("options", [])
        if options:
            lines.append("   - options:")
            for option in options:
                lines.append(f"     {_render_option_line(option)}")
        else:
            lines.append("   - options: none")

    return "\n".join(lines).rstrip() + "\n"


def _safe_filename(value: str, fallback: str) -> str:
    name = value.strip().lower()
    if not name:
        return fallback

    name = "_".join(name.split())
    clean = "".join(c for c in name if c.isalnum() or c == "_")
    return clean or fallback


def _count_questions(question_set: dict[str, Any]) -> int:
    questions = question_set.get("questions", [])
    if not isinstance(questions, list):
        return 0
    return len(questions)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate markdown by domain/question-set from ai_static_context JSON."
    )
    parser.add_argument(
        "input_json",
        type=Path,
        help="Path to JSON file (e.g. ai_static_context.json)",
    )
    parser.add_argument(
        "output_dir",
        type=Path,
        nargs="?",
        default=Path("question_set_markdown"),
        help="Output directory for markdown files (default: question_set_markdown)",
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

    records = _collect_question_set_records(payload)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    seen_ids: set[str] = set()
    file_count = 0
    skipped = 0
    question_counts: list[int] = []
    filename_counts: dict[str, int] = {}

    for index, record in enumerate(records, start=1):
        q_set = record["question_set"]
        q_set_id = _safe_text(q_set.get("id"), "").strip()

        if q_set_id and q_set_id in seen_ids:
            skipped += 1
            continue

        if q_set_id:
            seen_ids.add(q_set_id)

        q_set_name = _safe_text(q_set.get("name"), "").strip()
        base_name = _safe_filename(q_set_name, f"question_set_{index}")

        current_count = filename_counts.get(base_name, 0)
        filename_counts[base_name] = current_count + 1
        if current_count:
            base_name = f"{base_name}_{current_count + 1}"

        file_path = args.output_dir / f"{base_name}.md"

        markdown = _render_question_set_markdown(
            domain_label=_safe_text(record["domain_label"]),
            questionnaire_name=_safe_text(record["questionnaire_name"]),
            question_set=q_set,
        )
        file_path.write_text(markdown, encoding="utf-8")
        question_counts.append(_count_questions(q_set))
        file_count += 1

    print(f"Generated {file_count} unique markdown files in: {args.output_dir}")
    if question_counts:
        max_count = max(question_counts)
        min_count = min(question_counts)
        avg_count = sum(question_counts) / len(question_counts)
        print(
            "Question stats per generated set: "
            f"max={max_count}, min={min_count}, average={avg_count:.2f}"
        )
    if skipped:
        print(f"Skipped {skipped} duplicate question set(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
