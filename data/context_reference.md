# Innowell MIA — Context Reference

MIA is provided with two sources of context:

| Source | Delivery | Purpose |
|---|---|---|
| **Static context** | Sent once (out of band) | The measurement framework — questionnaires, scoring formulas, and health domains. Describes the instruments, not the patient. Changes infrequently. |
| **Session context** | Sent at the start of each session | A snapshot of the current patient's record — demographics, completed assessments, clinical events, notes, and goals. |

The static context is the key to interpreting everything in the session context. Patient scores only become clinically meaningful when looked up against the formulas and severity ranges in the static context.

---

## How the two sources relate

```
SESSION CONTEXT                         STATIC CONTEXT
──────────────────────────────────      ─────────────────────────────────────────
assessments[]
  questionnaire.id          ────────►  questionnaires[].id
  scores[]
    formula_id              ────────►  formulas[].id
                                         ├── health_domain_id  ──►  health_domains[].id
                                         └── ranges[]
                                               ├── label         (e.g. "High")
                                               ├── lower_bound   (e.g. 25)
                                               ├── upper_bound   (e.g. 29)
                                               └── color_code    (e.g. "orange")
```

---

## Worked example: interpreting a K10 score

Given this assessment in the session context:

```json
{
  "questionnaire": {
    "id": "b50fda96-2215-42ab-9973-8f72d77eb417",
    "name": "Kessler 10"
  },
  "completed_at": "2025-02-01T09:15:00Z",
  "scores": [
    {
      "formula_id": "561ba851-0df2-422a-b0bb-b2cf03e585ea",
      "formula_label": "K10",
      "raw_value": 28,
      "scaled_value": 0.7,
      "range_label": "High",
      "occurred_at": "2025-02-01T09:15:00Z"
    }
  ]
}
```

**Step 1 — Identify the formula.** Look up `formula_id` in `static_content.formulas[]`:

```json
{
  "id": "561ba851-0df2-422a-b0bb-b2cf03e585ea",
  "label": "K10",
  "health_domain_id": "37b120bf-da05-446d-bbcc-02a710ed6d78",
  "role_type": "INDIVIDUAL",
  "ranges": [
    { "label": "Low",       "lower_bound": 10, "upper_bound": 19, "color_code": "green"  },
    { "label": "Moderate",  "lower_bound": 20, "upper_bound": 24, "color_code": "yellow" },
    { "label": "High",      "lower_bound": 25, "upper_bound": 29, "color_code": "orange" },
    { "label": "Very High", "lower_bound": 30, "upper_bound": null, "color_code": "red"  }
  ]
}
```

**Step 2 — Identify the health domain.** Look up `health_domain_id` in `static_content.health_domains[]`:

```json
{ "id": "37b120bf-da05-446d-bbcc-02a710ed6d78", "label": "Psychological Distress" }
```

**Step 3 — Interpret the score.** `raw_value: 28` falls within the `High` range (25–29). This is pre-resolved as `range_label: "High"` on the score itself — but the full range definitions in the formula let you understand the complete severity spectrum in context.

**Result:** This patient scored 28/50 on the K10 (Kessler Psychological Distress Scale), placing them in the **High** psychological distress range. The score is also expressed as `scaled_value: 0.7` — a 0–1 normalisation allowing comparison across different instruments.

> **Note on `range_label`:** The `range_label` on each score is pre-resolved by the platform — you don't need to calculate it. The formula's `ranges[]` in the static context provide the full context (all bands, their bounds, and colour coding) for understanding where the score sits relative to the full spectrum.

---

## Static Context Reference

### `health_domains`

A flat lookup list. All other objects reference these by `id`.

```json
{ "id": "37b120bf-da05-446d-bbcc-02a710ed6d78", "label": "Psychological Distress" }
```

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Unique identifier |
| `label` | string | Domain name, e.g. `Anxiety`, `Sleep`, `Psychological Distress` |

---

### `questionnaires`

Clinical measurement instruments. A questionnaire contains one or more **question sets**, each of which maps to a scoring formula.

```json
{
  "id": "b50fda96-2215-42ab-9973-8f72d77eb417",
  "name": "Kessler 10",
  "question_sets": [
    {
      "id": "...",
      "name": "Kessler 10",
      "health_domain_id": "37b120bf-da05-446d-bbcc-02a710ed6d78",
      "formula_id": "561ba851-0df2-422a-b0bb-b2cf03e585ea",
      "questions": [ ... ]
    }
  ]
}
```

**Questionnaire fields**

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Matches `assessments[].questionnaire.id` in the session context |
| `name` | string | Full instrument name, e.g. `Kessler 10`, `PHQ-9`, `GAD-7` |
| `question_sets` | array | One or more question sets |

**Question set fields**

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | no | Unique identifier |
| `name` | string | no | Section name |
| `health_domain_id` | UUID | yes | References `health_domains[].id` |
| `formula_id` | UUID | yes | References `formulas[].id` — the formula used to score this set |
| `questions` | array | no | Ordered list of questions |

**Question fields**

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Unique identifier — referenced by formula `data_sources` |
| `researcher_label` | string | Short code, e.g. `K10_1` |
| `text` | string | Question text shown to the patient |
| `kind` | string | Input type — see below |
| `options` | array | Answer options for choice questions; empty for free-input kinds |

**Question kinds**

| Value | Description |
|---|---|
| `MULTICHOICE` | Single-select from labelled options |
| `MULTISELECT` | Multi-select from labelled options |
| `INTEGER` | Whole number |
| `NUMBER` | Decimal number |
| `STRING` | Short free text |
| `TEXT` | Long free text |
| `DATE` | Date |
| `IMPERIAL_LENGTH` | Height in feet/inches |
| `SUBURB_AUTOCOMPLETE` | Suburb/locality autocomplete |

**Option fields** (for `MULTICHOICE` / `MULTISELECT` questions)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Unique identifier |
| `text` | string | Label shown to patient, e.g. `Never`, `Sometimes`, `Always` |
| `value` | number | Numeric score assigned to this choice — used in formula equations |
| `researcher_label` | string | Short export code, e.g. `A`, `B`, `C` |

---

### `formulas`

Scoring definitions. Each formula takes question responses (or other formula results) as inputs and produces a numeric score. Formulas belong to a health domain and carry severity ranges for interpreting results.

```json
{
  "id": "561ba851-0df2-422a-b0bb-b2cf03e585ea",
  "label": "K10",
  "display_name": "K10",
  "health_domain_id": "37b120bf-da05-446d-bbcc-02a710ed6d78",
  "role_type": "INDIVIDUAL",
  "equation": "SUM(_364bc3a953e64e2093200eeca91e27fc_, ...)",
  "ranges": [
    { "label": "Low",       "lower_bound": 10, "upper_bound": 19, "color_code": "green"  },
    { "label": "Moderate",  "lower_bound": 20, "upper_bound": 24, "color_code": "yellow" },
    { "label": "High",      "lower_bound": 25, "upper_bound": 29, "color_code": "orange" },
    { "label": "Very High", "lower_bound": 30, "upper_bound": null, "color_code": "red"  }
  ],
  "data_sources": [
    { "id": "364bc3a9-53e6-4e20-9320-0eeca91e27fc", "subject_type": "Question", "subject_id": "..." },
    ...
  ]
}
```

**Formula fields**

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | no | Matches `scores[].formula_id` in the session context |
| `label` | string | no | Internal name — matches `scores[].formula_label` in the session context |
| `display_name` | string | no | Clinician-facing name shown in score cards |
| `health_domain_id` | UUID | yes | References `health_domains[].id`; `null` for sub-component formulas not mapped to a domain |
| `role_type` | string | no | Who completes this formula: `INDIVIDUAL`, `CLINICIAN`, or `SUPPORT_PERSON` |
| `equation` | string | no | Spreadsheet-style scoring expression (see below); empty string for single-source pass-through |
| `ranges` | array | no | Severity bands ordered low to high; empty array if none configured |
| `data_sources` | array | no | Input bindings used in the equation |

**Range fields**

Ranges define how to interpret a raw score clinically. They are ordered from lowest to highest and are exhaustive across the valid score range.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `label` | string | no | Severity label, e.g. `Low`, `Moderate`, `High`, `Very High` |
| `lower_bound` | integer | no | Inclusive lower bound |
| `upper_bound` | integer | yes | Exclusive upper bound; `null` means no upper limit |
| `color_code` | string | no | `green` (least severe) → `yellow` → `orange` → `red` (most severe) |

**Data source fields**

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Used as a variable in the equation: remove hyphens and wrap in underscores, e.g. `_364bc3a953e64e2093200eeca91e27fc_` |
| `subject_type` | string | `Question` — a patient's answer; `Formula` — the result of another formula |
| `subject_id` | UUID | References `questions[].id` or `formulas[].id` depending on `subject_type` |

**Equation syntax**

Equations use Excel-style syntax. Each variable is a `data_source.id` with hyphens removed, wrapped in underscores:

```
SUM(_364bc3a953e64e2093200eeca91e27fc_, _dd6e28bdaf534f0480281c59c8250ee8_, ...)
```

Common functions: `SUM`, `IF`, `OR`, `AND`, `ROUND`.

---

## Session Context Reference

### Top-level structure

```json
{
  "demographics": { ... },
  "assessments":  [ ... ],
  "events":       [ ... ],
  "notes":        [ ... ],
  "goals":        [ ... ]
}
```

All array fields are always present, but may be empty (`[]`). All timestamps are ISO 8601 UTC. Nullable fields are `null` when the patient has not provided that information.

---

### `demographics`

Personal profile information. Several fields (`gender`, `sexual_identity`, `living_circumstances`) are stored as multi-select in the platform; a single representative value is sent here.

| Field | Type | Nullable | Values |
|---|---|---|---|
| `age` | string | no | Numeric string, e.g. `"25"` |
| `gender` | string | yes | `male`, `female`, `transgender`, `transgender_female`, `transgender_male`, `non_binary`, `gender_queer`, `gender_fluid`, `gender_neutral`, `androgynous`, `two_spirit`, `neither_gender_identity`, `not_sure`, `prefer_not_to_answer`, `other` |
| `gender_at_birth` | string | yes | `male_at_birth`, `female_at_birth`, `intersex`, `prefer_not_to_answer` |
| `sexual_identity` | string | yes | `straight`, `gay`, `lesbian`, `bisexual`, `asexual`, `queer`, `pansexual`, `demisexual`, `two_spirit`, `not_sure`, `questioning`, `prefer_not_to_answer`, `other` |
| `state` | string | yes | Australian state/territory: `NSW`, `VIC`, `QLD`, `SA`, `WA`, `TAS`, `ACT`, `NT` |
| `postcode` | string | yes | Australian postcode, e.g. `"2000"` |
| `relationship_status` | string | yes | `single`, `living_with`, `not_living_with`, `separated`, `divorced`, `widowed` |
| `living_circumstances` | string | yes | `own`, `family`, `shared`, `retirement`, `nursing`, `homeless`, `other_living_circumstances` |
| `support_level` | string | yes | `independent`, `partially_supported`, `dependent` |
| `has_supportive_adult` | boolean | yes | `true`, `false` |
| `employed` | boolean | yes | `true`, `false` |
| `employment_status` | string | yes | `full_time`, `part_time_regular`, `part_time_irregular`, `casual`, `other` |
| `has_disability` | boolean | yes | `true`, `false` |
| `nature_of_disability` | string | yes | `pain_related`, `flexibility`, `mobility`, `mental_health_related`, `seeing`, `hearing`, `learning`, `memory`, `developmental`, `dexterity_agility`, `unknown`, `prefer_not_to_answer`, `other` |
| `assistance_needed` | string | no | `needed`, `not_needed` *(default)*, `already_obtained` |
| `prescription` | string | yes | `yes`, `no` |
| `prescription_medication` | string | yes | Free text |
| `previous_counseling_types` | string | yes | `general_counseling`, `cbt`, `trauma_cbt`, `emdr`, `play_art_therapy`, `cognitive_processing_therapy`, `dialectical_behavioural_therapy`, `narrative_therapy`, `system_family_therapy`, `not_sure`, `other` |
| `student` | string | yes | `yes`, `no` |

---

### `assessments`

Completed questionnaire results. Each assessment records which questionnaire was used and the scores produced.

```json
{
  "questionnaire": {
    "id": "b50fda96-2215-42ab-9973-8f72d77eb417",
    "name": "Kessler 10"
  },
  "completed_at": "2025-02-01T09:15:00Z",
  "scores": [
    {
      "formula_id": "561ba851-0df2-422a-b0bb-b2cf03e585ea",
      "formula_label": "K10",
      "raw_value": 28,
      "scaled_value": 0.7,
      "range_label": "High",
      "occurred_at": "2025-02-01T09:15:00Z"
    }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `questionnaire.id` | UUID | References `questionnaires[].id` in static context |
| `questionnaire.name` | string | Full questionnaire name |
| `completed_at` | ISO 8601 datetime | When the patient completed the questionnaire |
| `scores[].formula_id` | UUID | References `formulas[].id` in static context — the primary key for score interpretation |
| `scores[].formula_label` | string | Matches `formulas[].label` in static context |
| `scores[].raw_value` | number | The numeric score |
| `scores[].scaled_value` | number | Score normalised to 0–1, allowing comparison across instruments |
| `scores[].range_label` | string | Pre-resolved severity band — matches a `formulas[].ranges[].label` in static context. Special values: `"No rating"` (score out of bounds, unanswered, or skipped), `"Calculating"` (result not yet available) |
| `scores[].occurred_at` | ISO 8601 datetime | When the score was calculated |

---

### `events`

Clinical escalation events — flags raised when a patient's responses indicate risk (e.g. suicidal ideation, severe distress). An event is either open (`resolved_at: null`) or resolved.

```json
{
  "title": "Suicidal Thoughts Flag",
  "description": "An escalation has been triggered due to high-risk responses.",
  "created_at": "2025-02-01T09:16:00Z",
  "clinical": true,
  "resolved_at": "2025-02-02T14:00:00Z",
  "resolution_option": "care_option_assigned",
  "resolution_text": "Contacted patient, safety plan in place."
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `title` | string | no | Flag name |
| `description` | string | no | Why the event was triggered |
| `created_at` | ISO 8601 datetime | no | When the flag was raised |
| `clinical` | boolean | no | `true` = clinical-level escalation; `false` = standard informational flag |
| `resolved_at` | ISO 8601 datetime | yes | When resolved; `null` if still open |
| `resolution_option` | string | yes | `unable_to_contact`, `care_option_assigned`, `transferred_to_another_service`, `other`; `null` if unresolved |
| `resolution_text` | string | yes | Free text note; populated when `resolution_option` is `other` |

---

### `notes`

Freeform clinical notes recorded against the patient by any platform user.

```json
{
  "text": "Patient presented with low mood. Discussed coping strategies.",
  "author_role_type": "CLINICIAN",
  "created_at": "2025-02-02T14:30:00Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `text` | string | Note content |
| `author_role_type` | string | `INDIVIDUAL`, `CLINICIAN`, `LEAD_CLINICIAN`, `MANAGER`, `ADMIN`, `OWNER`, `RESEARCHER`, `SUPPORT_PERSON` |
| `created_at` | ISO 8601 datetime | When the note was written |

---

### `goals`

Treatment goals set for the patient, each optionally broken into discrete action steps.

```json
{
  "title": "Return to Work",
  "description": "Gradually build confidence to return to part-time employment",
  "status": "active",
  "end_date": "2025-06-01",
  "created_at": "2025-02-01T10:00:00Z",
  "actions": [
    { "description": "Update resume", "completed": true },
    { "description": "Apply for part-time jobs", "completed": false }
  ]
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `title` | string | no | Goal name |
| `description` | string | yes | Detail |
| `status` | string | no | `requires_clinician_setup`, `active`, `archived` |
| `end_date` | date `YYYY-MM-DD` | yes | Target completion date |
| `created_at` | ISO 8601 datetime | no | When the goal was created |
| `actions[].description` | string | no | Action step text |
| `actions[].completed` | boolean | no | Whether this step is done |

---

## Cross-reference index

| Session context field | → Static context lookup |
|---|---|
| `assessments[].questionnaire.id` | `questionnaires[].id` |
| `assessments[].scores[].formula_id` | `formulas[].id` |
| `formulas[].health_domain_id` | `health_domains[].id` |
| `formulas[].ranges[]` | Severity bands for `scores[].raw_value` |
| `question_sets[].formula_id` | `formulas[].id` |
| `question_sets[].health_domain_id` | `health_domains[].id` |
