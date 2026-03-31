# `ClientContext` — Validation Reference

> **Last updated:** March 2026

---

## Overview

| `ClientContext` field |
| --------------------- |

| `demographics`
| `assessments`
| `events`
| `notes`
| `goals`

---

## Entity Hierarchy

```
ClientContext
├── demographics: ClientDemographics          (required, exactly 1)
├── assessments:  list[ClientAssessment]      (optional, max 2)
│   └── questionnaire: QuestionnaireInfo
│       └── question_sets: list[QuestionSet]  (max 20)
│           └── score: AssessmentScore
├── events:  list[ClinicalEvent]              (optional, max 10)
├── notes:   list[ClinicalNote]               (optional, max 10)
└── goals:   list[ClientGoal]                 (optional, max 10)
    └── actions: list[GoalAction]             (max 5 per goal)
```

---

## Sample `ClientContext` JSON

A complete example covering all optional fields:

```json
{
  "demographics": {
    "age": 34,
    "gender": "female",
    "gender_at_birth": "female_at_birth",
    "sexual_identity": "straight",
    "postcode": "2000",
    "state": "NSW",
    "country": "AU",
    "relationship_status": "living_with",
    "living_circumstances": "family",
    "support_level": "partially_supported",
    "has_supportive_adult": true,
    "employed": true,
    "employment_status": "part_time_regular",
    "currently_studying": false,
    "has_disability": false,
    "nature_of_disability": null,
    "assistance_needed": null,
    "prescription_medication": "Sertraline 50mg daily",
    "previous_counseling_types": ["cbt", "narrative_therapy"]
  },
  "assessments": [
    {
      "completed_at": "2025-09-01T09:00:00Z",
      "questionnaire": {
        "name": "K10",
        "question_sets": [
          {
            "name": "Psychological Distress",
            "health_domain_name": "Kessler 10 Plus",
            "score": {
              "raw_value": 22,
              "range_label": "Moderate"
            }
          }
        ]
      }
    },
    {
      "completed_at": "2026-03-01T09:00:00Z",
      "questionnaire": {
        "name": "K10",
        "question_sets": [
          {
            "name": "Psychological Distress",
            "health_domain_name": "Kessler 10 Plus",
            "score": {
              "raw_value": 28,
              "range_label": "High"
            }
          }
        ]
      }
    }
  ],
  "events": [
    {
      "title": "Elevated suicide risk flagged",
      "description": "Client disclosed passive suicidal ideation during session.",
      "created_at": "2026-03-10T14:00:00Z",
      "resolved_at": "2026-03-11T09:30:00Z",
      "resolution_option": "care_option_assigned",
      "resolution_text": null
    }
  ],
  "notes": [
    {
      "text": "Client presented with low mood and sleep disturbance. Discussed grounding techniques and updated safety plan.",
      "author_role_type": "clinician",
      "occurred_at": "2026-03-10T14:30:00Z"
    }
  ],
  "goals": [
    {
      "title": "Return to Work",
      "description": "Gradually build confidence to return to part-time employment.",
      "status": "active",
      "end_date": "2026-06-01",
      "actions": [
        { "description": "Update resume", "completed": true },
        { "description": "Apply for two part-time roles", "completed": false }
      ]
    }
  ]
}
```

---

## `ClientContext`

```python
class ClientContext(BaseModel):
    demographics: ClientDemographics
    assessments: list[ClientAssessment] = Field(default_factory=list, max_length=2)
    events:      list[ClinicalEvent]    = Field(default_factory=list, max_length=10)
    notes:       list[ClinicalNote]     = Field(default_factory=list, max_length=10)
    goals:       list[ClientGoal]       = Field(default_factory=list, max_length=10)
```

### Field rules

| Field          | Type                     | Required | Constraint      |
| -------------- | ------------------------ | -------- | --------------- |
| `demographics` | `ClientDemographics`     | ✅       | See below       |
| `assessments`  | `list[ClientAssessment]` | No       | `max_length=2` — see note below                                        |
| `events`       | `list[ClinicalEvent]`    | No       | `max_length=10` |
| `notes`        | `list[ClinicalNote]`     | No       | `max_length=10` |
| `goals`        | `list[ClientGoal]`       | No       | `max_length=10` |

> **Note — Assessment pairing convention**
>
> Supply **at most 2** assessments. When the client has taken the same instrument more than once, provide:
> 1. The **first (baseline)** assessment — establishes the starting point for illness trajectory.
> 2. The **most recent** assessment — reflects the current clinical picture.
>
> If only one administration exists, supply that single assessment. Do **not** pad the list with duplicates or intermediate administrations,

---

## `ClientDemographics`

Clinically relevant demographic and social determinants of health. Contains the most complex cross-field validation logic in the `ClientContext` graph.

### Field rules

| Field                       | Type                                   | Required | Constraint                                                                        |
| --------------------------- | -------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `age`                       | `int`                                  | ✅       | `ge=5`, `le=120`                                                                  |
| `gender`                    | `Gender \| None`                       | No       | Enum — see [Gender](#gender)                                                      |
| `gender_at_birth`           | `GenderAtBirth \| None`                | No       | Enum — see [GenderAtBirth](#genderatbirth)                                        |
| `sexual_identity`           | `SexualIdentity \| None`               | No       | Enum — see [SexualIdentity](#sexualidentity)                                      |
| `postcode`                  | `str \| None`                          | No       | Country-specific format (see validator)                                           |
| `state`                     | `str \| None`                          | No       | `min_length=2`, `max_length=100`; must match allowed values for the given country |
| `country`                   | `Country`                              | No       | Defaults to `Country.AU`; must be a valid `Country` enum value                    |
| `relationship_status`       | `RelationshipStatus \| None`           | No       | Enum                                                                              |
| `living_circumstances`      | `LivingCircumstances \| None`          | No       | Enum                                                                              |
| `support_level`             | `SupportLevel \| None`                 | No       | Enum                                                                              |
| `has_supportive_adult`      | `bool \| None`                         | No       | —                                                                                 |
| `employed`                  | `bool \| None`                         | No       | —                                                                                 |
| `employment_status`         | `EmploymentStatus \| None`             | No       | Enum                                                                              |
| `currently_studying`        | `bool \| None`                         | No       | —                                                                                 |
| `has_disability`            | `bool \| None`                         | No       | —                                                                                 |
| `nature_of_disability`      | `NatureOfDisability \| None`           | No       | Enum                                                                              |
| `assistance_needed`         | `AssistanceNeeded \| None`             | No       | Enum                                                                              |
| `prescription_medication`   | `str \| None`                          | No       | `max_length=1000`                                                                 |
| `previous_counseling_types` | `list[PreviousCounselingType] \| None` | No       | `max_length=10`; each item must be a valid `PreviousCounselingType`               |

## `AssessmentScore`

A single score line within an assessment question set.

| Field         | Type    | Required | Constraint                               |
| ------------- | ------- | -------- | ---------------------------------------- |
| `raw_value`   | `float` | ✅       | `ge=1`, `le=1000`                        |
| `range_label` | `str`   | ✅       | `max_length=40` (e.g. `"High"`, `"Low"`) |

---

## `QuestionSet`

A grouped block of Q&A items with a combined score.

| Field                | Type                       | Required | Constraint                                       |
| -------------------- | -------------------------- | -------- | ------------------------------------------------ |
| `name`               | `str`                      | ✅       | `min_length=1`, `max_length=50`                  |
| `health_domain_name` | `HealthDomainName \| None` | No       | Enum — see [HealthDomainName](#healthdomainname) |
| `score`              | `AssessmentScore`          | ✅       | See [`AssessmentScore`](#assessmentscore)        |

---

## `QuestionnaireInfo`

Metadata about a completed questionnaire instrument.

| Field           | Type                | Required | Constraint                                                 |
| --------------- | ------------------- | -------- | ---------------------------------------------------------- |
| `name`          | `str`               | ✅       | `min_length=1`, `max_length=200` (e.g. `"K10"`, `"PHQ-9"`) |
| `question_sets` | `list[QuestionSet]` | ✅       | `max_length=20`                                            |

---

## `ClientAssessment`

A completed clinical assessment wrapper.

| Field           | Type                | Required | Constraint                  |
| --------------- | ------------------- | -------- | --------------------------- |
| `questionnaire` | `QuestionnaireInfo` | ✅       | See above                   |
| `completed_at`  | `datetime`          | ✅       | Any valid ISO-8601 datetime |

> **Note — Assessment pairing convention**
>
> `ClientContext.assessments` accepts **1 or 2** items only:
>
> | Slot | Which assessment to supply |
> | ---- | -------------------------- |
> | First item | The **earliest / baseline** administration (`completed_at` is oldest) |
> | Second item *(optional)* | The **most recent** administration (`completed_at` is newest) |
>
> Supplying a single item is valid when only one administration exists. The pair is used by MIA to track **illness trajectory** — how the client's scores have changed from baseline to the present.

---

## `ClinicalEvent`

A clinical event or flag raised during care (e.g. a risk escalation).

| Field               | Type                       | Required | Constraint                                       |
| ------------------- | -------------------------- | -------- | ------------------------------------------------ |
| `title`             | `str`                      | ✅       | `min_length=1`, `max_length=500`                 |
| `description`       | `str \| None`              | No       | `max_length=500`                                 |
| `created_at`        | `datetime`                 | ✅       | —                                                |
| `resolved_at`       | `datetime \| None`         | No       | Must be `>= created_at` (see validator)          |
| `resolution_option` | `ResolutionOption \| None` | No       | Enum — see [ResolutionOption](#resolutionoption) |
| `resolution_text`   | `str \| None`              | No       | `max_length=500`                                 |

Ensures chronological integrity of the event:

```
ValueError: resolved_at must be greater than or equal to created_at
```

---

## `ClinicalNote`

A clinical note authored by a care team member.

| Field              | Type                     | Required | Constraint                                   |
| ------------------ | ------------------------ | -------- | -------------------------------------------- |
| `text`             | `str`                    | ✅       | `max_length=1000`                            |
| `author_role_type` | `AuthorRoleType \| None` | No       | Enum — see [AuthorRoleType](#authorroletype) |
| `occurred_at`      | `datetime`               | ✅       | Any valid ISO-8601 datetime                  |

---

## `GoalAction`

An actionable step within a `ClientGoal`.

| Field         | Type   | Required | Constraint          |
| ------------- | ------ | -------- | ------------------- |
| `description` | `str`  | ✅       | `max_length=1000`   |
| `completed`   | `bool` | No       | Defaults to `False` |

---

## `ClientGoal`

A treatment or recovery goal for the client.

| Field         | Type               | Required | Constraint                                                            |
| ------------- | ------------------ | -------- | --------------------------------------------------------------------- |
| `title`       | `str`              | ✅       | `max_length=500`                                                      |
| `description` | `str \| None`      | No       | `max_length=1000`                                                     |
| `status`      | `GoalStatus`       | No       | Defaults to `GoalStatus.ACTIVE`; enum — see [GoalStatus](#goalstatus) |
| `end_date`    | `date \| None`     | No       | Any valid `date`                                                      |
| `actions`     | `list[GoalAction]` | No       | Defaults to `[]`; `max_length=5`                                      |

---

## Enum Reference

> **Note — Unrecognised enum values**
>
> If a supplied enum value does not match any member of its enum, the API **logs a warning internally and silently ignores the field** (treats it as `null`). The request is **not** rejected. This applies to all optional enum fields across `ClientContext` (e.g. `gender`, `employment_status`, `resolution_option`, `health_domain_name`, etc.).
>
> Use the exact string values listed below — they are **case-sensitive**.

### `Gender`

| Value                     |
| ------------------------- |
| `male`                    |
| `female`                  |
| `transgender`             |
| `transgender_female`      |
| `transgender_male`        |
| `non_binary`              |
| `gender_queer`            |
| `gender_fluid`            |
| `gender_neutral`          |
| `androgynous`             |
| `two_spirit`              |
| `neither_gender_identity` |
| `not_sure`                |
| `prefer_not_to_answer`    |
| `other`                   |

### `GenderAtBirth`

| Value                  |
| ---------------------- |
| `male_at_birth`        |
| `female_at_birth`      |
| `intersex`             |
| `prefer_not_to_answer` |

### `SexualIdentity`

| Value                  |
| ---------------------- |
| `straight`             |
| `gay`                  |
| `lesbian`              |
| `bisexual`             |
| `asexual`              |
| `queer`                |
| `pansexual`            |
| `demisexual`           |
| `two_spirit`           |
| `not_sure`             |
| `questioning`          |
| `prefer_not_to_answer` |
| `other`                |

### `Country`

Currently only one value is supported (AU market):

| Value | Description         |
| ----- | ------------------- |
| `AU`  | Australia (default) |

> This enum will be extended as new markets are onboarded.

### `AustralianState`

| Value |
| ----- |
| `NSW` |
| `VIC` |
| `QLD` |
| `SA`  |
| `WA`  |
| `TAS` |
| `ACT` |
| `NT`  |

> Used internally by `ClientDemographics.validate_postcode` — not directly part of the `ClientContext` schema. The `state` field accepts a plain `str`, which is then validated against this set.

### `RelationshipStatus`

| Value             |
| ----------------- |
| `single`          |
| `living_with`     |
| `not_living_with` |
| `separated`       |
| `divorced`        |
| `widowed`         |

### `LivingCircumstances`

| Value                        |
| ---------------------------- |
| `own`                        |
| `family`                     |
| `shared`                     |
| `retirement`                 |
| `nursing`                    |
| `homeless`                   |
| `other_living_circumstances` |

### `SupportLevel`

| Value                 |
| --------------------- |
| `independent`         |
| `partially_supported` |
| `dependent`           |

### `EmploymentStatus`

| Value                 |
| --------------------- |
| `full_time`           |
| `part_time_regular`   |
| `part_time_irregular` |
| `casual`              |
| `other`               |

### `NatureOfDisability`

| Value                   |
| ----------------------- |
| `pain_related`          |
| `flexibility`           |
| `mobility`              |
| `mental_health_related` |
| `seeing`                |
| `hearing`               |
| `learning`              |
| `memory`                |
| `developmental`         |
| `dexterity_agility`     |
| `unknown`               |
| `prefer_not_to_answer`  |
| `other`                 |

### `AssistanceNeeded`

| Value              |
| ------------------ |
| `needed`           |
| `not_needed`       |
| `already_obtained` |

### `PreviousCounselingType`

| Value                             |
| --------------------------------- |
| `general_counseling`              |
| `cbt`                             |
| `trauma_cbt`                      |
| `emdr`                            |
| `play_art_therapy`                |
| `cognitive_processing_therapy`    |
| `dialectical_behavioural_therapy` |
| `narrative_therapy`               |
| `system_family_therapy`           |
| `not_sure`                        |
| `other`                           |

### `GoalStatus`

| Value                      | Meaning                                               |
| -------------------------- | ----------------------------------------------------- |
| `requires_clinician_setup` | Goal is a placeholder pending clinician configuration |
| `active`                   | Goal is actively being worked toward                  |
| `archived`                 | Goal is no longer active                              |

### `ResolutionOption`

| Value                            |
| -------------------------------- |
| `unable_to_contact`              |
| `care_option_assigned`           |
| `transferred_to_another_service` |
| `other`                          |

### `AuthorRoleType`

The role of the user who authored a `ClinicalNote`.

| Value            |
| ---------------- |
| `individual`     |
| `clinician`      |
| `lead_clinician` |
| `manager`        |
| `admin`          |
| `owner`          |
| `researcher`     |
| `support_person` |

### `HealthDomainName`

A large controlled vocabulary of clinical measurement domains. Examples include:

| Value                               |
| ----------------------------------- |
| `Alcohol`                           |
| `Anxiety`                           |
| `Body Mass Index`                   |
| `Cannabis Use`                      |
| `Depression` (via `Depressed Mood`) |
| `Domestic Violence`                 |
| `Eating Behaviours`                 |
| `Kessler 10 Plus`                   |
| `Psychological Distress`            |
| `Self Harm`                         |
| `Sleep`                             |
| `Suicidal Thoughts And Behaviours`  |
| … (50+ values total)                |

> The full list is defined in the `HealthDomainName` enum. When referencing a domain, use the exact string value from the enum (case-sensitive).

---

## Validation Summary: Where Errors Can Occur

| Model                | Mechanism                                                     | What it enforces                                                 |
| -------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `ClientDemographics` | `ge/le` on `age`                                              | Age between 5 and 120                                            |
| `ClientDemographics` | `min_length/max_length` on `state`                            | State string between 2 and 100 chars                             |
| `ClientDemographics` | `max_length` on `prescription_medication`                     | Free-text capped at 1 000 chars                                  |
| `ClientDemographics` | `max_length` on `previous_counseling_types`                   | At most 10 counseling history entries                            |
| `ClientDemographics` | `model_validator(mode="after")` — `validate_postcode`         | State in allowed set for country; postcode matches country regex |
| `AssessmentScore`    | `ge=1, le=1000` on `raw_value`                                | Score between 1 and 1 000                                        |
| `AssessmentScore`    | `max_length=40` on `range_label`                              | Label at most 40 chars                                           |
| `QuestionnaireInfo`  | `max_length=20` on `question_sets`                            | At most 20 question sets per questionnaire                       |
| `ClientContext`      | `max_length=2` on `assessments`                               | At most 2 assessments per context (first + most recent)          |
| `ClinicalEvent`      | `min_length=1, max_length=500` on `title`                     | Non-empty, capped title                                          |
| `ClinicalEvent`      | `model_validator(mode="after")` — `validate_event_timestamps` | `resolved_at >= created_at`                                      |
| `ClinicalNote`       | `max_length=1000` on `text`                                   | Note text at most 1 000 chars                                    |
| `ClientGoal`         | `max_length=500/1000` on `title`/`description`                | Capped free-text fields                                          |
| `ClientGoal`         | `max_length=5` on `actions`                                   | At most 5 actions per goal                                       |
| `ClientContext`      | `max_length=10` on `goals`                                    | At most 10 goals per context                                     |
| `ClientContext`      | `max_length=10` on `events`                                   | At most 10 events per context                                    |
| `ClientContext`      | `max_length=10` on `notes`                                    | At most 10 notes per context                                     |

---

## Common Validation Errors and Fixes

| Error message                                             | Root cause                      | Fix                                                                                                          |
| --------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `age: Input should be greater than or equal to 5`         | `age < 5`                       | Minimum age supported by the IAR-DST framework is 5.                                                         |
| `age: Input should be less than or equal to 120`          | `age > 120`                     | Check data source for data quality issues.                                                                   |
| `Invalid state 'XYZ' for country 'AU'`                    | Unrecognised state string       | Use one of the 8 Australian state codes, e.g. `"NSW"`. Case is normalised automatically.                     |
| `Invalid postcode '123' for country 'AU'`                 | Wrong postcode format           | Australian postcodes must be exactly 4 digits.                                                               |
| `resolved_at must be greater than or equal to created_at` | Event timestamps inverted       | Ensure `resolved_at` is after `created_at`.                                                                  |
| `List should have at most 2 items` on `assessments`       | Too many assessments            | Supply at most 2 `ClientAssessment` objects. Provide the **first** (baseline) and **most recent** assessment. |
| `Extra inputs are not permitted`                          | Unknown field on a strict model | Remove the unrecognised field. Affects `ClientContext`, `ClientDemographics`, `ClinicalEvent`, `ClientGoal`. |
| `raw_value: Input should be greater than or equal to 1`   | Score below minimum             | Assessment scores must be ≥ 1.                                                                               |
