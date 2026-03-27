"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  LoaderCircle,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ChevronDown,
  X,
  AlertTriangle,
} from "lucide-react";

type MiaEnvironment = "local" | "staging" | "production";

type EnvironmentOption = {
  key: MiaEnvironment;
  label: string;
  isConfigured: boolean;
};

type QuestionnaireAnswer = {
  question: string;
  answer: string | null;
  confidence: number | null;
  unable_to_answer: boolean;
};

type QuestionSetResult = {
  question_set: string;
  status: string;
  answers: QuestionnaireAnswer[];
  error: string | null;
};

type QuestionnaireResponse = {
  request_id: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  failure_reason: string | null;
  results: QuestionSetResult[];
};

const PROXY_BASE_PATH = "/api/mia";
const POLLING_INTERVAL_MS = 3000;

const QUESTION_SETS = [
  "alcohol_use_disorders_identification_test__consumption",
  "altman_selfrating_mania_scale",
  "apa_level_1_alcohol_and_substances_p_6to17",
  "apa_level_1_crosscutting_symptom_p_6to17",
  "aq10_p_5to10",
  "asrm__bmc_mania_screen",
  "assist_alcohol_use",
  "assist_cannabis_lite",
  "assist_cannabis_use",
  "assist_lite_alcohol_use",
  "assist_lite_cannabis_use",
  "assist_lite_tobacco_use",
  "assist_other_drug_use_lite",
  "assist_other_substance_use",
  "assist_other_substance_use_no_cannabis",
  "assist_tobacco_lite",
  "assist_tobacco_use",
  "auditc_plus",
  "auditc_plus_short",
  "baffs",
  "bmc_mania_screen",
  "bmc_psychosis_screen",
  "bmc_sleepwake_cycle_psqi_mctq",
  "bmi_and_waist",
  "bnssiat_adapted",
  "brief_nonsuicidal_selfinjury_assessment_tool",
  "brs",
  "cape6",
  "cgis_clinician",
  "cgis_individual",
  "cgis_individualuniq",
  "cgis_support",
  "child__youth_resilience_measure",
  "childrens_social_understanding_scale",
  "clinical_global_impressionseverity_scale",
  "clinical_stage__clinician_input",
  "cognition_hba",
  "cognitive_behaviour__ubwell",
  "columbia_suicide_severity_rating_scale",
  "current_need__clinician_input",
  "dar5",
  "demo_ahs_clinician_question_set",
  "demo_ahs_individual_question_set",
  "demo_aus_clinician_question_set",
  "demo_aus_individual_question_set",
  "demo_london_clinician_question_set",
  "demo_london_individual_question_set",
  "demographics",
  "dvprs",
  "dvsat_timp",
  "eating_disorder_examination_questionnaire",
  "ede_adapted",
  "eq5dy_clinician",
  "eq5dy_individual",
  "eq5dy_individualuniq",
  "eq5dy_support",
  "euroqol_group_standard_measure_of_health_status",
  "family_mental_health_history",
  "family_mental_health_history_ageing",
  "family_mental_health_history_butterfly",
  "gad7",
  "gds15",
  "helpseeking_history",
  "hits_parent_5to10",
  "inventory_of_complicated_grief",
  "ipaq",
  "k10",
  "k10_plus",
  "kessler_10",
  "kessler_10_2",
  "lq_p_5to10",
  "maas",
  "mental_health_history",
  "neet_status",
  "nodsclip",
  "nutrition_hba",
  "nutrition_p_5to10",
  "oa_intake_qs",
  "oasis",
  "ocicv5",
  "overall_anxiety_severity_and_impairment_scale",
  "pa_parent_5to10",
  "parenting_stress_scale_p_5to10",
  "patientcentredness",
  "pcl5",
  "pcptsd5_and_pclc",
  "pedsql_child_1318",
  "pedsql_child_812",
  "pedsql_parent_1318",
  "pedsql_parent_57",
  "pedsql_parent_812",
  "phq9",
  "physical_health_amenorrhea",
  "physical_health_child5to10_p",
  "physical_health_fluid_intake",
  "physical_health_history",
  "physical_health_history_ageing",
  "physical_health_history_butterfly",
  "physical_health_pattern_of_eating",
  "physical_health_physical_activity",
  "physical_health_physical_cognitive",
  "physical_health_weight_fluctuations",
  "pittsburgh_sleep_quality_index",
  "pq16",
  "primary_care_ptsd_screen_for_dsm_5",
  "prodromal_questionnaire",
  "psc17",
  "ptsd5",
  "qa_questionset__name",
  "qids",
  "quick_inventory_of_depressive_symptomatology",
  "rcads_child",
  "rcads_parent",
  "recovering_quality_of_life__10_item",
  "school_participation_and_attendance",
  "schusters_sss",
  "screen_time_p_5to10",
  "sdq_impact_parent_5to10",
  "sdq_parent_or_teacher_4to10",
  "sidas_and_cssrs",
  "sidas_and_cssrs_mind_plasticity",
  "sleep_older_adults_psqi__isi__stop",
  "snapiv_parent_or_teacher_6to17",
  "sofas_clinician",
  "sofas_individual",
  "sofas_support",
  "sphere12",
  "spiritual_health_and_lifeorientation_measure",
  "suicidal_ideation_attributes_scale",
  "validated_disability_assessment_tool_name",
  "whodas_20_12",
  "work__social_adjustment_scale",
  "world_health_organisation_disability_assessment_schedule",
  "wsas",
  "youth_not_in_education_or_employment",
];

const formatSetName = (name: string) =>
  name
    .replace(/_+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function QuestionnairePage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [selectedEnvironment, setSelectedEnvironment] = useState<MiaEnvironment>("local");
  const [proxyToken, setProxyToken] = useState("");
  const [environmentOptions, setEnvironmentOptions] = useState<EnvironmentOption[]>([]);

  const [selectedSets, setSelectedSets] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [requestId, setRequestId] = useState<string | null>(null);
  const [questionnaireStatus, setQuestionnaireStatus] = useState<string | null>(null);
  const [results, setResults] = useState<QuestionSetResult[]>([]);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const headers = useMemo<HeadersInit>(
    () => ({
      ...(proxyToken.trim() ? { "x-mia-token": proxyToken.trim() } : {}),
      "x-mia-environment": selectedEnvironment,
    }),
    [proxyToken, selectedEnvironment],
  );

  const buildUrl = (path: string) => `${PROXY_BASE_PATH}${path}`;

  // Load environment options
  useEffect(() => {
    const loadEnvironments = async () => {
      try {
        const response = await fetch("/api/mia/environments", { method: "GET" });
        if (response.ok) {
          const data = await response.json();
          if (data.environments) {
            setEnvironmentOptions(data.environments);
          }
          if (data.defaultEnvironment) {
            setSelectedEnvironment(data.defaultEnvironment);
          }
        }
      } catch {
        // Fallback handled by empty array
      }
    };
    loadEnvironments();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const pollResults = useCallback(
    (pollRequestId: string) => {
      setIsPolling(true);

      const poll = async () => {
        try {
          const response = await fetch(
            buildUrl(`/v1/mia/questionnaires/${pollRequestId}`),
            { method: "GET", headers },
          );

          if (!response.ok) {
            const body = await response.text();
            throw new Error(`Failed to fetch results (${response.status}): ${body}`);
          }

          const data: QuestionnaireResponse = await response.json();
          setQuestionnaireStatus(data.status);

          if (data.status === "COMPLETED") {
            setResults(data.results ?? []);
            stopPolling();
          } else if (data.status === "FAILED") {
            setFailureReason(data.failure_reason ?? "Unknown error");
            setErrorMessage(data.failure_reason ?? "Questionnaire processing failed.");
            stopPolling();
          }
          // PROCESSING — keep polling
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : String(err));
          stopPolling();
        }
      };

      // Immediate first poll then interval
      poll();
      pollingRef.current = setInterval(poll, POLLING_INTERVAL_MS);
    },
    [headers, stopPolling],
  );

  const submitQuestionnaires = async () => {
    if (selectedSets.length === 0) {
      setErrorMessage("Select at least one question set.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setResults([]);
    setFailureReason(null);
    setQuestionnaireStatus(null);
    setRequestId(null);

    try {
      const response = await fetch(buildUrl("/v1/mia/questionnaires"), {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question_sets: selectedSets,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Submission failed (${response.status}): ${body}`);
      }

      const data = await response.json();
      setRequestId(data.request_id);
      setQuestionnaireStatus("PROCESSING");
      pollResults(data.request_id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSet = (name: string) => {
    setSelectedSets((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const removeSet = (name: string) => {
    setSelectedSets((prev) => prev.filter((s) => s !== name));
  };

  const filteredSets = QUESTION_SETS.filter((s) =>
    formatSetName(s).toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return "text-slate-400";
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.5) return "text-amber-500";
    return "text-red-500";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "PROCESSING":
      case "PENDING":
        return <LoaderCircle className="h-4 w-4 animate-spin text-indigo-500" />;
      default:
        return null;
    }
  };

  const isBusy = isSubmitting || isPolling;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900">Questionnaire Submission</h1>
      </div>

      {/* Session info */}
      <div className="mb-6 rounded-lg border bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">Session ID:</span>{" "}
          <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">{sessionId}</code>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Submit question sets to be answered from the completed session context.
        </p>
      </div>

      {/* Error modal */}
      {errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-red-200 bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-3 rounded-t-xl">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-sm font-semibold text-red-800">Error</h2>
            </div>
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              {(() => {
                try {
                  const parsed = JSON.parse(errorMessage);
                  if (parsed?.detail && Array.isArray(parsed.detail)) {
                    return (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-700">
                          {parsed.detail.length} validation error{parsed.detail.length > 1 ? "s" : ""}
                        </p>
                        <ul className="space-y-2">
                          {parsed.detail.map((err: { type?: string; loc?: (string | number)[]; msg?: string; input?: unknown }, idx: number) => (
                            <li key={idx} className="rounded-md border border-red-100 bg-red-50/50 p-3">
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-200 text-xs font-bold text-red-700">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-red-800">{err.msg || "Unknown error"}</p>
                                  {err.loc && (
                                    <p className="mt-1 text-xs text-slate-600">
                                      <span className="font-medium">Location:</span>{" "}
                                      <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">{err.loc.join(" → ")}</code>
                                    </p>
                                  )}
                                  {err.type && (
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      <span className="font-medium">Type:</span> {err.type}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  if (typeof parsed?.detail === "string") {
                    return <p className="text-sm text-slate-800">{parsed.detail}</p>;
                  }
                } catch {
                  // not JSON — fall through to raw display
                }
                return (
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-slate-50 p-3 text-xs text-slate-800 font-mono">
                    {errorMessage}
                  </pre>
                );
              })()}
            </div>
            <div className="flex justify-end border-t px-5 py-3">
              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Environment & Token */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Environment</label>
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value as MiaEnvironment)}
            disabled={isBusy}
            className="w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            {environmentOptions.length > 0
              ? environmentOptions.map((env) => (
                  <option key={env.key} value={env.key}>
                    {env.label}
                  </option>
                ))
              : ["local", "staging", "production"].map((env) => (
                  <option key={env} value={env}>
                    {env.charAt(0).toUpperCase() + env.slice(1)}
                  </option>
                ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            API Token <span className="text-slate-400">(optional override)</span>
          </label>
          <input
            type="password"
            value={proxyToken}
            onChange={(e) => setProxyToken(e.target.value)}
            disabled={isBusy}
            placeholder="Leave blank to use server default"
            className="w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Question set multi-select dropdown */}
      <div className="mb-6">
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Question Sets
        </label>

        {/* Selected pills */}
        {selectedSets.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selectedSets.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700"
              >
                {formatSetName(s)}
                <button
                  type="button"
                  onClick={() => removeSet(s)}
                  disabled={isBusy}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-indigo-200 disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            disabled={isBusy}
            className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            <span>
              {selectedSets.length === 0
                ? "Select question sets…"
                : `${selectedSets.length} selected`}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute z-30 mt-1 w-full rounded-md border bg-white shadow-lg">
              <div className="border-b p-2">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search question sets…"
                  className="w-full rounded border px-2 py-1.5 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <ul className="max-h-60 overflow-y-auto py-1">
                {filteredSets.length === 0 && (
                  <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
                )}
                {filteredSets.map((s) => {
                  const isSelected = selectedSets.includes(s);
                  return (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => toggleSet(s)}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                          isSelected ? "bg-indigo-50 text-indigo-700" : "text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {formatSetName(s)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={submitQuestionnaires}
        disabled={isBusy || selectedSets.length === 0}
        className="mb-8 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : isPolling ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <ClipboardList className="h-4 w-4" />
            Submit Questionnaires
          </>
        )}
      </button>

      {/* Status */}
      {questionnaireStatus && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            {getStatusIcon(questionnaireStatus)}
            <span>
              Status: <span className="font-semibold">{questionnaireStatus}</span>
            </span>
            {requestId && (
              <span className="ml-2 text-xs text-slate-400">
                Request: {requestId}
              </span>
            )}
          </div>

        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((qsr) => (
            <div
              key={qsr.question_set}
              className="rounded-lg border bg-white shadow-sm"
            >
              {/* Question set header */}
              <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-3">
                {getStatusIcon(qsr.status)}
                <h2 className="text-sm font-semibold text-slate-800">
                  {formatSetName(qsr.question_set)}
                </h2>
                <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                  {qsr.answers?.length ?? 0} questions
                </span>
              </div>

              {qsr.error && (
                <div className="border-b bg-red-50 px-4 py-2 text-sm text-red-600">
                  {qsr.error}
                </div>
              )}

              {/* Answers table */}
              {qsr.answers && qsr.answers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2 font-medium">#</th>
                        <th className="px-4 py-2 font-medium">Question</th>
                        <th className="px-4 py-2 font-medium">Answer</th>
                        <th className="px-4 py-2 font-medium text-center">Confidence</th>
                        <th className="px-4 py-2 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qsr.answers.map((a, idx) => (
                        <tr
                          key={idx}
                          className="border-b last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-4 py-2 text-xs text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="max-w-md px-4 py-2 text-slate-700">
                            {a.question}
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-900">
                            {a.unable_to_answer ? (
                              <span className="italic text-slate-400">Unable to answer</span>
                            ) : (
                              a.answer ?? "—"
                            )}
                          </td>
                          <td className={`px-4 py-2 text-center font-mono text-xs ${getConfidenceColor(a.confidence)}`}>
                            {a.confidence !== null
                              ? `${(a.confidence * 100).toFixed(0)}%`
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {a.unable_to_answer ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                                <AlertTriangle className="h-3 w-3" />
                                N/A
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                <CheckCircle2 className="h-3 w-3" />
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="mt-8">
        <Link
          href={`/mia-audio-test-bench?sessionId=${sessionId}`}
          className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          ← Back to Audio Test Bench
        </Link>
      </div>
    </main>
  );
}
