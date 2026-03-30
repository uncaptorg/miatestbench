# Clinical Instrument Reference

Covers every question set in this directory. Grouped by clinical domain. Each row includes the validated instrument name, what it measures, how scores map to clinical action, and the primary online source.

---

## Depression

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **PHQ-9** Patient Health Questionnaire | `phq9.md` | 9-item self-report screening depression severity over the past 2 weeks. Scores 0–3 per item (Not at all → Nearly every day). | 0–4 Minimal; 5–9 Mild; 10–14 Moderate; 15–19 Moderately Severe; 20–27 Severe. ≥10 = likely MDD; ≥15 = active treatment warranted; item 9 (suicidality) always reviewed regardless of total. | [phqscreeners.com](https://www.phqscreeners.com/) |
| **GDS-15** Geriatric Depression Scale | `gds15.md` | 15-item yes/no scale designed for older adults. Avoids somatic items that overlap with physical illness. | 0–4 Normal; 5–8 Mild depression; 9–11 Moderate; 12–15 Severe. ≥5 warrants clinical attention; ≥10 high likelihood of major depression in older adults. | [stanford.edu/~yesavage](https://web.stanford.edu/~yesavage/GDS.html) |
| **QIDS** Quick Inventory of Depressive Symptomatology | `qids.md`, `quick_inventory_of_depressive_symptomatology.md` | 16-item self-report or clinician-rated. Maps directly to DSM-5 MDD diagnostic criteria. | 0–5 None; 6–10 Mild; 11–15 Moderate; 16–20 Severe; 21–27 Very Severe. Useful for tracking treatment response — a ≥50% drop indicates response; ≤5 = remission. | [ids-qids.org](https://www.ids-qids.org/) |

---

## Anxiety

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **GAD-7** Generalised Anxiety Disorder | `gad7.md` | 7-item self-report for generalised anxiety over the past 2 weeks. | 0–4 Minimal; 5–9 Mild; 10–14 Moderate; 15–21 Severe. ≥10 = likely GAD; score also has good sensitivity for panic, social anxiety, and PTSD. | [phqscreeners.com](https://www.phqscreeners.com/) |
| **OASIS** Overall Anxiety Severity & Impairment Scale | `oasis.md`, `overall_anxiety_severity_and_impairment_scale.md` | 5-item transdiagnostic anxiety measure covering frequency, intensity, avoidance, and impairment. | 0–7 Subclinical; 8–11 Mild; 12–15 Moderate; 16–19 Severe; 20+ Very Severe. Positive screen ≥8; tracks treatment response across anxiety disorders. | [pmc.ncbi.nlm.nih.gov/articles/PMC2559419](https://pmc.ncbi.nlm.nih.gov/articles/PMC2559419/) |

---

## Psychological Distress

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **K10 / K10+** Kessler Psychological Distress Scale | `k10.md`, `kessler_10.md`, `kessler_10_2.md`, `k10_plus.md` | 10-item non-specific psychological distress measure (anxiety + depression) over past 4 weeks. The K10+ adds 3 items on disability and help-seeking. | 10–19 Likely well; 20–24 Likely mild disorder; 25–29 Likely moderate disorder; 30–50 Likely severe disorder. ≥22 recommended Australian cut-off for referral; ≥30 suggests high-prevalence disorder requiring active treatment. | [tac.vic.gov.au](https://www.tac.vic.gov.au/files-to-move/media/upload/k10_english.pdf) |
| **SPHERE-12** | `sphere12.md` | 12-item screening for mental health condition (MHC) and somatic symptom/fatigue cluster (SFC). Items answered Frequently / Sometimes / Occasionally / Rarely or Never. | ≥3 on MHC subscale = psychological disorder; ≥3 on SFC subscale = somatic fatigue/physical disorder. Dual elevation suggests comorbidity. | [sphere12.com.au](https://www.sphere12.com.au/) |

---

## Post-Traumatic Stress

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **PCL-5** PTSD Checklist | `pcl5.md` | 20-item self-report aligned to DSM-5 PTSD criteria (Clusters B–E). 0–4 per item. | Total 0–80. Provisional PTSD: ≥33 (general mental health) or ≥31–38 (varies by population). Cluster scores flag which symptom domains are most impaired. A ≥10-point reduction = clinically significant change. | [ptsd.va.gov](https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp) |
| **PC-PTSD-5** Primary Care PTSD Screen | `primary_care_ptsd_screen_for_dsm_5.md`, `pcptsd5_and_pclc.md` | 5-item initial screen for use in primary care / brief assessments. | 0–5. ≥3 = positive screen; proceed to full diagnostic interview or PCL-5. High sensitivity, moderate specificity — designed to minimise missed cases. | [ptsd.va.gov](https://www.ptsd.va.gov/professional/assessment/screens/pc-ptsd.asp) |
| **PTSD-5** (Brief) | `ptsd5.md` | 5-item brief PTSD screen used in Australian community mental health settings. | ≥3 indicates probable PTSD and warrants further assessment. | — |

---

## Suicidality & Self-Harm

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **C-SSRS** Columbia Suicide Severity Rating Scale | `columbia_suicide_severity_rating_scale.md`, `sidas_and_cssrs.md`, `sidas_and_cssrs_mind_plasticity.md` | Clinician-administered rating of ideation intensity and suicidal behaviour. Gold standard across clinical and research settings. | Ideation subscale 1–5 (intensity); Behaviour subscale tracks actual attempts. Any active ideation with intent or plan = high risk; any recent attempt = immediate action. Passive ideation alone = low-moderate risk. | [cssrs.columbia.edu](https://cssrs.columbia.edu/) |
| **SIDAS** Suicidal Ideation Attributes Scale | `suicidal_ideation_attributes_scale.md` | 5-item self-report measuring frequency, controllability, closeness to attempt, distress, and interference. Scores 0–20 per item (0–100 total). | ≤20 Low risk; 21–44 Moderate risk; ≥45 High risk. ≥21 = intervention warranted. Validated as a treatment outcome measure. | [sidas.com.au](https://www.sidas.com.au/) |
| **Brief NSSI Assessment Tool** | `brief_nonsuicidal_selfinjury_assessment_tool.md` | Assesses frequency, methods, functions, and emotional context of non-suicidal self-injury. | No single numeric cut-off; clinician reviews method diversity, escalation frequency, and function (emotion regulation vs. communication) to stratify risk. Any NSSI with tissue damage requires safety planning. | [itriples.org](https://itriples.org/) |

---

## Psychosis & Early Psychosis

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **PQ-16** Prodromal Questionnaire | `pq16.md`, `prodromal_questionnaire.md` | 16-item self-report screening for attenuated psychotic symptoms (ultra-high risk). Endorsed items followed by distress rating. | ≥6 endorsed items = positive screen; higher distress weighting increases specificity. Positive screen warrants referral to early psychosis service for CAARMS/PANSS evaluation. | [schoolmentalhealth.org](https://www.schoolmentalhealth.org/resources/assessment/prodromal-questionnaire/) |
| **CAPE-6** Community Assessment of Psychic Experiences | `cape6.md` | 6-item shortened version of the CAPE-42, assessing positive psychotic experiences in community populations. | Scores across frequency (1–4) and distress (1–4) per item. Elevated frequency + high distress = attenuated psychosis risk. Used for population screening; positive = refer for clinical interview. | [cape42.homestead.com](https://cape42.homestead.com/) |
| **BMC Psychosis Screen** | `bmc_psychosis_screen.md` | Brief in-house psychosis screen used in BMC settings. Covers hallucinations, delusions, thought disorder and disorganisation. | Presence of any endorsed item warrants clinical interview. Not scored on a continuous scale — each endorsed item is a flag. | — |

---

## Mania

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **ASRM** Altman Self-Rating Mania Scale | `altman_selfrating_mania_scale.md`, `asrm__bmc_mania_screen.md`, `bmc_mania_screen.md` | 5-item self-report for manic/hypomanic symptoms over the past week. Each item scored 0–4. | 0–5 Normal; ≥6 Probable hypomanic/manic episode requiring clinical evaluation. Sensitivity 85.5%, specificity 87.3% at cut-off of 6. | [mdcalc.com](https://www.mdcalc.com/calc/1726/altman-self-rating-mania-scale-asrm) |

---

## Obsessive-Compulsive Disorder

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **OCI-CV5** OCD Inventory (Current Version 5) | `ocicv5.md` | Self-report measure of OCD symptom frequency and distress. Covers washing, checking, ordering, obsessing, hoarding, and neutralising. | Total score: 0–21 Subclinical; 21–40 Mild; 40–60 Moderate; ≥60 Severe. Subscale scores identify treatment targets (e.g., high hoarding subscale → specific ERP protocol). | [cambridge.org](https://doi.org/10.1017/S1352465800008061) |

---

## Eating Disorders

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **EDE-Q / EDE Adapted** Eating Disorder Examination Questionnaire | `eating_disorder_examination_questionnaire.md`, `ede_adapted.md` | 28-item self-report version of the EDE interview. 4 subscales: Restraint, Eating Concern, Shape Concern, Weight Concern. Scored 0–6. | Global score ≥4 = clinical range. Subscale elevations guide treatment targets. Weight concern ≥4 + compensatory behaviours = high medical risk warranting immediate physical review. | [corc.uk.net](https://www.corc.uk.net/outcome-experience-measures/eating-disorder-examination-questionnaire/) |

---

## Substance Use

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **AUDIT** Alcohol Use Disorders Identification Test | `alcohol_use_disorders_identification_test__consumption.md` | Full 10-item WHO alcohol use screen covering consumption, dependence symptoms, and alcohol-related harm. | 0–7 Low risk; 8–15 Hazardous/risky use → brief intervention; 16–19 Harmful use → brief counselling + monitoring; ≥20 Probable dependence → referral to specialist. | [who.int](https://www.who.int/publications/i/item/audit-the-alcohol-use-disorders-identification-test-guidelines-for-use-in-primary-health-care) |
| **AUDIT-C** (Consumption Only) | `auditc_plus.md`, `auditc_plus_short.md` | First 3 items of the AUDIT measuring quantity and frequency of drinking. | ≥3 (women) or ≥4 (men) = positive screen for hazardous drinking; proceed to full AUDIT or brief intervention. | [who.int](https://www.who.int/publications/i/item/audit-the-alcohol-use-disorders-identification-test-guidelines-for-use-in-primary-health-care) |
| **ASSIST** (Alcohol, Smoking & Substance Involvement) | `assist_alcohol_use.md`, `assist_tobacco_use.md`, `assist_other_substance_use.md`, `assist_cannabis_use.md`, `assist_lite_alcohol_use.md`, `assist_lite_cannabis_use.md`, `assist_lite_tobacco_use.md`, `assist_tobacco_lite.md`, `assist_cannabis_lite.md`, `assist_other_substance_use_no_cannabis.md`, `assist_other_drug_use_lite.md` | WHO-developed 8-item screen for involvement with 10 substance classes (tobacco, alcohol, cannabis, cocaine, amphetamines, inhalants, sedatives, hallucinogens, opioids, other). | Per substance: 0–3 Low risk (brief advice); 4–26 Moderate risk (brief intervention); ≥27 High risk (referral to specialist). Injection drug use at any level = high risk. | [who.int/publications](https://www.who.int/publications/i/item/978-92-4-159938-3) |

---

## Sleep

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **PSQI** Pittsburgh Sleep Quality Index | `pittsburgh_sleep_quality_index.md` | 19 self-rated items yielding 7 component scores (subjective quality, latency, duration, efficiency, disturbances, medication use, daytime dysfunction). | Global score 0–21. ≤5 = Good sleep; **>5 = Poor sleep quality** warranting intervention. Component scores identify the dominant problem area (e.g., high component 6 = medication-dependent sleep). | [sleep.pitt.edu](https://www.sleep.pitt.edu/instruments/) |
| **Sleep Older Adults (PSQI + ISI + STOP)** | `sleep_older_adults_psqi__isi__stop.md` | Combined sleep battery for older adults: PSQI, ISI (Insomnia Severity Index), and STOP (obstructive sleep apnoea screen). | ISI: 0–7 No insomnia; 8–14 Subthreshold; 15–21 Moderate; 22–28 Severe. STOP: ≥2 "Yes" responses = high risk for OSA → polysomnography referral. | [isaos.org/isi](https://www.ons.org/research-tools/ons-putting-evidence-into-practice/insomnia-severity-index) |
| **BMC Sleep/Wake Cycle (PSQI + MCTQ)** | `bmc_sleepwake_cycle_psqi_mctq.md` | Combines PSQI with the Munich ChronoType Questionnaire to identify chronotype and social jetlag. | Social jetlag >2 hours associated with metabolic and mood disorders. Extreme evening chronotype in adolescents = higher depression risk. | — |

---

## Functioning & Disability

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **SOFAS** Social & Occupational Functioning Assessment Scale | `sofas_individual.md`, `sofas_clinician.md`, `sofas_support.md` | Clinician-rated 0–100 scale of social/occupational functioning independent of symptom severity. | 91–100 Superior; 71–90 Mild impairment; 51–70 Moderate; 31–50 Serious; 11–30 Major impairment; 1–10 Unable to function. A score <60 indicates functional disability requiring active rehabilitation. | [APA DSM-IV Appendix B](https://www.psychiatry.org/psychiatrists/practice/dsm) |
| **WSAS** Work & Social Adjustment Scale | `wsas.md`, `work__social_adjustment_scale.md` | 5-item self-report measuring functional impairment across work, home, social leisure, private leisure, and close relationships. 0–8 per item. | 0–10 Subclinical; 10–20 Significant functional impairment but may suggest mild-moderate disorder; **>20 Moderate to severe impairment**; >40 severely impaired. Useful for tracking functional recovery alongside symptom measures. | [bjtpsych.rcpsych.org](https://doi.org/10.1192/bjp.180.5.461) |
| **WHODAS 2.0** (12-item) | `whodas_20_12.md`, `world_health_organisation_disability_assessment_schedule.md` | WHO disability assessment across 6 domains: cognition, mobility, self-care, getting along, life activities, participation. | Simple (sum) scoring: 0–48; higher = greater disability. Complex scoring converts to 0–100. ≥25 = moderate disability; ≥50 = severe. Domain scores guide rehabilitation targets. | [who.int/classifications/whodas](https://www.who.int/standards/classifications/international-classification-of-functioning-disability-and-health/who-disability-assessment-schedule) |
| **Validated Disability Tool** | `validated_disability_assessment_tool_name.md` | Template placeholder for a validated disability tool. | Varies by instrument selected. | — |

---

## Quality of Life

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **EQ-5D-Y** EuroQol Youth | `eq5dy_individual.md`, `eq5dy_clinician.md`, `eq5dy_support.md`, `eq5dy_individualuniq.md` | 5-dimension health status measure (mobility, self-care, usual activities, pain/discomfort, anxiety/depression) plus a 0–100 Visual Analogue Scale. Youth version for ages 8–15. | Each dimension rated 1–3 (no/some/extreme problems). VAS 0–100; lower = worse perceived health. Utility index derived from population norms — below 0.7 generally indicates moderate health impairment. | [euroqol.org](https://euroqol.org/eq-5d-instruments/eq-5d-y-about/) |
| **EQ-5D (Standard)** | `euroqol_group_standard_measure_of_health_status.md` | Same 5D framework for adults. | Utility score <0.7 indicates moderate health impairment; <0.5 severe. Country-specific value sets determine utility weights. | [euroqol.org](https://euroqol.org/) |
| **ReQoL-10** Recovering Quality of Life | `recovering_quality_of_life__10_item.md` | 10-item mental health-specific QoL measure. Items cover activities, belonging, future, physical health, self-care, hope, and coping. | 0–40; higher = better QoL. Normative scores for mental health populations ~20–25. Score <15 = significantly impaired QoL; ≥5-point change = clinically important. | [reqol.org.uk](https://www.reqol.org.uk/) |
| **PedsQL** Pediatric Quality of Life Inventory | `pedsql_child_812.md`, `pedsql_child_1318.md`, `pedsql_parent_57.md`, `pedsql_parent_812.md`, `pedsql_parent_1318.md` | Parent- and child-report QoL across physical, emotional, social, and school functioning. Age-specific versions (5–7, 8–12, 13–18). | 0–100; higher = better QoL. Total score <69.7 distinguishes healthy vs. at-risk children. Physical Summary <65 = physical impairment; Psychosocial Summary <65 = psychosocial impairment. | [pedsql.org](https://www.pedsql.org/) |

---

## Clinical Global Impression

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **CGI-S** Clinical Global Impression – Severity | `clinical_global_impressionseverity_scale.md`, `cgis_individual.md`, `cgis_clinician.md`, `cgis_support.md`, `cgis_individualuniq.md` | Clinician-rated 7-point global severity scale anchored to population norms. | 1 Normal; 2 Borderline ill; 3 Mildly ill; 4 Moderately ill; 5 Markedly ill; 6 Severely ill; 7 Most extremely ill. CGI-I (Improvement) uses same scale — score of 1–2 = much/very much improved (treatment response). | [psytoolkit.org](https://www.psytoolkit.org/survey-library/cgi.html) |

---

## Clinical Staging

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **Clinical Stage** (McGorry) | `clinical_stage__clinician_input.md` | Clinician-rated staging model (0–4) describing illness progression from at-risk through first episode to persistent/severe disorder. | 0 = Increased risk, no symptoms; 1a = Mild non-specific symptoms; 1b = Ultra-high risk; 2 = First episode; 3a = Incomplete remission; 3b–c = Recurrence; 4 = Severe, persistent/unremitting. Stage determines intensity of intervention. | [orygen.org.au](https://www.orygen.org.au/Training/Resources/Staging) |
| **Current Need** (Clinician) | `current_need__clinician_input.md` | Clinician rating of the client's current service and care intensity need. | Guides step-up/step-down decisions and level-of-care matching (self-management, primary, secondary, tertiary). | — |

---

## Resilience

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **BRS** Brief Resilience Scale | `brs.md` | 6-item self-report measuring the ability to bounce back from stress. Three positive and three negative items, average scored 1–5. | 1.00–2.99 Low resilience; 3.00–4.30 Normal; 4.31–5.00 High resilience. Low resilience predicts poorer mental health outcomes and slower recovery. | [doi.org/10.1080/10705500802222972](https://doi.org/10.1080/10705500802222972) |
| **CYRM** Child & Youth Resilience Measure | `child__youth_resilience_measure.md` | Multi-dimensional resilience measure for children and youth covering individual, relational, and community factors. | Higher total = greater resilience resources. No single clinical cut-off — used to identify strengths-based intervention targets. Subscale analysis identifies whether vulnerability is individual, relational, or community-level. | [resilienceresearch.org](https://www.resilienceresearch.org/tools/cyrm-rm/) |

---

## Social Connectedness & Support

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **Schuster's Social Support Scale** | `schusters_sss.md` | Measures perceived social support frequency and quality across emotional, informational, and tangible dimensions. | Higher scores = better social support. Low perceived support is a significant risk factor for depression relapse and suicidality; used to identify social isolation intervention needs. | Schuster et al. (1990) — adapted widely; original in *Journal of Health and Social Behavior* |

---

## Grief & Loss

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **ICG** Inventory of Complicated Grief | `inventory_of_complicated_grief.md` | 19-item self-report measuring pathological grief symptoms (yearning, functional impairment, bitterness, shock). | 0–76; **≥25 = prolonged grief disorder** threshold. Higher scores indicate grief has become clinically impairing. Distinguish from depression — ICG captures grief-specific cognitions. | [doi.org/10.1176/ajp.152.1.22](https://doi.org/10.1176/ajp.152.1.22) |

---

## Gambling

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **NODS-CLIP** | `nodsclip.md` | 3-item brief screen for pathological gambling (Control, Lies, Preoccupation). | 0 = Low risk; **≥1 = Screen positive** for problem gambling; warrants full NODS or PGSI assessment. Sensitivity 0.99, specificity 0.91 for lifetime pathological gambling. | [ncpgambling.org](https://www.ncpgambling.org/programs-resources/tools/nods-clip/) |

---

## Anger

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **DAR-5** Difficulties in Anger Regulation Scale | `dar5.md` | 5-item self-report measuring problematic anger (anger control, expression, suppression, and impact on relationships). | Scored 1–5 per item (5–25 total). Higher scores = greater anger dysregulation. Cut-off ≥12 suggests clinically significant anger problems. | [doi.org/10.1016/j.paid.2019.04.038](https://doi.org/10.1016/j.paid.2019.04.038) |

---

## Pain

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **DVPRS** Defense & Veterans Pain Rating Scale | `dvprs.md` | 11-point NRS (0–10) with supplemental items on sleep, mood, activity, and stress interference. Developed for chronic pain in veteran/military populations. | 0 = No pain; 1–3 Mild; 4–6 Moderate; 7–10 Severe. Supplemental items ≥5 = high interference warranting multidisciplinary pain review. | [dvcipm.org](https://dvcipm.org/) |

---

## Mindfulness

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **MAAS** Mindful Attention Awareness Scale | `maas.md` | 15-item self-report of dispositional mindfulness — the frequency of present-moment attention in daily life. Scored 1–6 per item. | Average score 1–6; higher = greater mindfulness. General population mean ~4.0. Scores <3.5 suggest low mindful awareness; used as outcome measure in mindfulness-based interventions. | [doi.org/10.1037/0022-3514.84.4.822](https://doi.org/10.1037/0022-3514.84.4.822) |

---

## Spiritual Health

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **SHALOM** Spiritual Health & Life-Orientation Measure | `spiritual_health_and_lifeorientation_measure.md` | 20-item measure across 4 domains: Personal (intrapersonal), Communal (interpersonal), Environmental, and Transcendental (relationship with God/Divine). Each domain scored separately for "I feel…" and "I value…". | Higher = greater spiritual wellbeing. The gap between "feel" and "value" scores indicates spiritual incongruence — a large discrepancy signals unmet spiritual needs and is associated with psychological distress. No clinical cut-off; used to open spiritual care conversations. | [doi.org/10.1023/A:1022915417601](https://doi.org/10.1023/A:1022915417601) |

---

## Paediatric & Youth Measures

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **RCADS** Revised Children's Anxiety & Depression Scale | `rcads_child.md`, `rcads_parent.md` | 47-item child/parent-report covering 6 DSM-aligned subscales: separation anxiety, social phobia, generalised anxiety, panic, OCD, and MDD. | Subscale T-scores: <65 Normal; 65–69 Borderline clinical; **≥70 = Clinical range** (above 98th percentile). Both child and parent versions administered; discordance is clinically informative. | [corc.uk.net](https://www.corc.uk.net/outcome-experience-measures/revised-childrens-anxiety-and-depression-scale-rcads/) |
| **SDQ** Strengths & Difficulties Questionnaire (4–10) | `sdq_parent_or_teacher_4to10.md`, `sdq_impact_parent_5to10.md` | 25-item parent/teacher report across 5 subscales: emotional, conduct, hyperactivity, peer problems, and prosocial behaviour. | Total Difficulties: 0–13 Normal; 14–16 Borderline; **≥17 Abnormal**. SDQ Impact supplement: ≥2 parent, ≥3 teacher/self = significant impact. Subscale profiles guide diagnosis (high emotional = anxiety/depression; high conduct = externalising). | [sdqinfo.org](https://www.sdqinfo.org/) |
| **PSC-17** Pediatric Symptom Checklist | `psc17.md` | 17-item parent-report covering internalising, attention, and externalising subscales. | Externalising ≥7; Internalising ≥5; Attention ≥7 = subscale positive. Total ≥15 = positive screen for psychosocial impairment. Positive screen warrants referral for further assessment. | [brightfutures.aap.org](https://brightfutures.aap.org/Bright%20Futures%20Documents/PSC-17.pdf) |
| **SNAP-IV** (Parent/Teacher, 6–17) | `snapiv_parent_or_teacher_6to17.md` | 26-item ADHD rating scale aligned to DSM-IV criteria. Separate subscales for inattention, hyperactivity/impulsivity, and oppositional defiant disorder. | Each item 0–3; subscale means ≥2.0 = elevated. Inattention ≥1.5, HI ≥1.5 commonly used cut-offs in Australian services. Requires both parent and teacher report for diagnostic consideration. | [adhd.net](https://www.adhd.net/SNAP-IV-Form.pdf) |
| **BAFFS** | `baffs.md` | Brief measure of functional impairment in children/young people. | Higher scores = greater impairment. Used alongside symptom scales to assess real-world impact of presentation. | — |
| **AQ-10** (Parent, 5–10) | `aq10_p_5to10.md` | 10-item autism screening tool for adults and children (parent version for 5–10 age group). | **≥6 = Positive screen** for autism; refer for formal diagnostic assessment. Sensitivity ~88%, specificity ~91%. | [autismresearch.ac.uk](https://www.autismresearch.ac.uk/aq-10-autism-spectrum-quotient-10-item-version/) |
| **APA Level 1 Cross-Cutting Symptom Screen** (6–17, parent) | `apa_level_1_crosscutting_symptom_p_6to17.md` | DSM-5 Level 1 cross-cutting screen covering 12 domains of psychopathology in children and youth (parent-rated). | Each domain rated 0–4. Any domain ≥2 = positive screen for that domain; proceed to Level 2 measure or clinical interview for that specific area. | [psychiatry.org](https://www.psychiatry.org/psychiatrists/practice/dsm/educational-resources/dsm-5-fact-sheets) |
| **APA Level 1 Alcohol & Substances** (6–17, parent) | `apa_level_1_alcohol_and_substances_p_6to17.md` | DSM-5 Level 1 substance use screen for 6–17 age group (parent-rated). | ≥1 = positive screen; proceed to substance-specific Level 2 or AUDIT/ASSIST youth version. | [psychiatry.org](https://www.psychiatry.org/psychiatrists/practice/dsm/educational-resources/dsm-5-fact-sheets) |

---

## Physical Health

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **Physical Activity (IPAQ)** | `ipaq.md`, `physical_health_physical_activity.md`, `pa_parent_5to10.md` | International Physical Activity Questionnaire measuring activity across transport, work, domestic, and leisure domains. | Low: <600 MET-min/week; Moderate: 600–3000; High: >3000. Low activity + mental health diagnosis = priority for behavioural activation intervention. | [ipaq.ki.se](http://www.ipaq.ki.se/) |
| **BMI & Waist** | `bmi_and_waist.md` | Body mass index and waist circumference measurement. | BMI: <18.5 Underweight; 18.5–24.9 Normal; 25–29.9 Overweight; ≥30 Obese. Waist >94cm (men) / >80cm (women) = increased cardiometabolic risk. Critical in eating disorder monitoring and antipsychotic side-effect review. | [who.int/health-topics/obesity](https://www.who.int/health-topics/obesity) |
| **Physical Health History** | `physical_health_history.md`, `physical_health_history_ageing.md`, `physical_health_history_butterfly.md` | Structured history of current medications, diagnoses, allergies, and recent physical health events. | Not scored — clinician reviews for medication interactions, comorbidities, and physical health monitoring requirements. | — |
| **Eating Pattern / Nutrition** | `physical_health_pattern_of_eating.md`, `nutrition_hba.md`, `nutrition_p_5to10.md` | Structured intake of dietary patterns, meal frequency, and nutritional risk indicators. | No composite score; flags disordered eating patterns, nutritional restriction, and need for dietitian referral. | — |
| **Amenorrhea** | `physical_health_amenorrhea.md` | Assessment of menstrual irregularity in eating disorder contexts. | Any secondary amenorrhea in the context of low weight/restrictive eating = medical urgency. Signals hypothalamic suppression and bone density risk. | — |
| **Fluid Intake** | `physical_health_fluid_intake.md` | Assessment of hydration in eating disorder contexts. | <1.5L/day = dehydration risk; excessive intake (>4L/day) in purging behaviours = electrolyte risk. | — |
| **Weight Fluctuations** | `physical_health_weight_fluctuations.md` | Tracks weight change over time. | ≥10% weight loss in 6 months = significant; ≥20% = medical emergency in eating disorder context. | — |
| **HITS** (Parent, 5–10) | `hits_parent_5to10.md` | Hurt, Insult, Threaten, Scream — 4-item domestic violence screen for parent/caregiver context. | **≥11 = Positive screen** for intimate partner violence. Any endorsed "hurt" item requires immediate safety assessment. | [doi.org/10.1097/00006250-200308000-00015](https://doi.org/10.1097/00006250-200308000-00015) |
| **DVSAT TIMP** | `dvsat_timp.md` | Domestic violence safety assessment tool in TIMP context. | Clinician-rated; any identified risk triggers safety planning protocol and mandatory reporting assessment. | — |
| **Cognition** | `cognition_hba.md`, `physical_health_physical_cognitive.md`, `cognitive_behaviour__ubwell.md` | Cognitive screening items covering memory, concentration, and processing speed. | Subjective cognitive complaints + objective impairment = refer for formal neuropsychological assessment. Multiple cognitive symptoms post-illness onset = rule out medical cause. | — |

---

## Demographic & Contextual

| Instrument | Files | Description | Score Interpretation | Source |
|---|---|---|---|---|
| **Demographics** | `demographics.md`, `demo_aus_individual_question_set.md`, `demo_aus_clinician_question_set.md`, `demo_ahs_individual_question_set.md`, `demo_ahs_clinician_question_set.md`, `demo_london_individual_question_set.md`, `demo_london_clinician_question_set.md` | Standard demographic capture (age, gender, cultural background, ATSI status, address, referral source). | Not scored. Informs cultural formulation, social determinants of health, and service access barriers. | — |
| **Mental Health History** | `mental_health_history.md` | Previous diagnoses, hospitalisations, medications, and treatment history. | Not scored. Establishes clinical stage baseline and informs risk stratification. | — |
| **Family Mental Health History** | `family_mental_health_history.md`, `family_mental_health_history_ageing.md`, `family_mental_health_history_butterfly.md` | First-degree relative psychiatric history, suicide, and substance use. | Not scored. Family history of bipolar disorder, psychosis, or suicide significantly elevates risk; informs genetic counselling considerations. | — |
| **Help-Seeking History** | `helpseeking_history.md` | Prior engagement with mental health services, barriers to help-seeking, and treatment preferences. | Not scored. Low prior engagement + high stigma = higher engagement risk; informs motivational interviewing approach. | — |
| **NEET Status** | `neet_status.md`, `youth_not_in_education_or_employment.md` | Identifies young people not in education, employment, or training. | NEET status alone is a significant social determinant of poor mental health. Requires vocational/educational pathway planning as part of recovery goals. | [aihw.gov.au](https://www.aihw.gov.au/reports/australias-youth/education-employment) |
| **School Participation & Attendance** | `school_participation_and_attendance.md` | School attendance and engagement for children and youth. | <80% attendance = at-risk threshold; <50% = significant educational disengagement requiring coordinated school/clinical response. | — |
| **Patient-Centredness** | `patientcentredness.md` | Measures alignment between client goals and care received. | Not scored numerically; qualitative review of goal concordance and therapeutic alliance. | — |
| **Older Adult Intake** | `oa_intake_qs.md` | Intake questionnaire for OpenArms older adult population. | Not scored — structured history to guide comprehensive geriatric assessment. | — |

---

*Last updated: March 2026. Scoring thresholds reflect general published guidelines; always apply clinical judgement and population-specific norms when interpreting results.*
