"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type MiaEnvironment = "local" | "staging" | "production";

type EnvironmentOption = {
  key: MiaEnvironment;
  label: string;
  isConfigured: boolean;
};

type EnvironmentResponse = {
  defaultEnvironment?: MiaEnvironment;
  environments?: EnvironmentOption[];
};

type GenerateCarePlanResponse = {
  plan_id: string;
};

type CarePlanResponse = {
  status?: string;
  content?: unknown;
  reasoning_trace_summary?: string[] | string;
};

const DEFAULT_ENVIRONMENT_OPTIONS: EnvironmentOption[] = [
  { key: "local", label: "Local", isConfigured: true },
  { key: "staging", label: "Staging", isConfigured: true },
  { key: "production", label: "Production", isConfigured: true },
];

const POLLING_INTERVAL_MS = 3000;
const PLAN_POLL_MAX_ATTEMPTS = 60;
const PROXY_BASE_PATH = "/api/mia";

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const getErrorMessage = async (response: Response, fallback: string) => {
  const text = await response.text().catch(() => "");
  return text || fallback;
};

export default function MiaCarePlanPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = typeof params?.sessionId === "string" ? params.sessionId : "";

  const [environmentOptions, setEnvironmentOptions] = useState<EnvironmentOption[]>(DEFAULT_ENVIRONMENT_OPTIONS);
  const [selectedEnvironment, setSelectedEnvironment] = useState<MiaEnvironment>("local");
  const [proxyToken, setProxyToken] = useState("");
  const [planType, setPlanType] = useState<"bmc" | "mental_health_plan">("mental_health_plan");
  const [notes, setNotes] = useState("");

  const [planId, setPlanId] = useState("");
  const [planStatus, setPlanStatus] = useState("IDLE");
  const [planContent, setPlanContent] = useState<unknown>(null);
  const [reasoningSummary, setReasoningSummary] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const headers = useMemo<HeadersInit>(
    () => ({
      ...(proxyToken.trim() ? { "x-mia-token": proxyToken.trim() } : {}),
      "x-mia-environment": selectedEnvironment,
    }),
    [proxyToken, selectedEnvironment],
  );

  const buildUrl = (path: string) => `${PROXY_BASE_PATH}${path}`;

  useEffect(() => {
    const savedEnvironment = sessionStorage.getItem("miaAudioBench.environment");
    const savedToken = sessionStorage.getItem("miaAudioBench.proxyToken");

    if (savedEnvironment === "local" || savedEnvironment === "staging" || savedEnvironment === "production") {
      setSelectedEnvironment(savedEnvironment);
    }

    if (typeof savedToken === "string") {
      setProxyToken(savedToken);
    }

    if (sessionId.trim()) {
      sessionStorage.setItem("miaAudioBench.sessionId", sessionId.trim());
    }
  }, [sessionId]);

  useEffect(() => {
    const loadEnvironmentOptions = async () => {
      try {
        const response = await fetch("/api/mia/environments", { method: "GET" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as EnvironmentResponse;
        if (Array.isArray(data.environments) && data.environments.length > 0) {
          setEnvironmentOptions(data.environments);
        }

        if (data.defaultEnvironment) {
          setSelectedEnvironment(data.defaultEnvironment);
        }
      } catch {
        setEnvironmentOptions(DEFAULT_ENVIRONMENT_OPTIONS);
      }
    };

    void loadEnvironmentOptions();
  }, []);

  const pollCarePlan = async (currentPlanId: string) => {
    setIsPolling(true);

    try {
      for (let attempt = 0; attempt < PLAN_POLL_MAX_ATTEMPTS; attempt += 1) {
        const response = await fetch(buildUrl(`/v1/mia/care-plans/${currentPlanId}`), {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response, "Failed to poll care plan."));
        }

        const data = (await response.json()) as CarePlanResponse;
        const nextStatus = data.status ?? "UNKNOWN";
        setPlanStatus(nextStatus);

        const trace = data.reasoning_trace_summary;
        if (Array.isArray(trace)) {
          setReasoningSummary(trace.filter((item): item is string => typeof item === "string"));
        } else if (typeof trace === "string" && trace.trim()) {
          setReasoningSummary([trace]);
        } else {
          setReasoningSummary([]);
        }

        if (nextStatus === "READY") {
          setPlanContent(data.content ?? null);
          return;
        }

        if (nextStatus === "ERROR" || nextStatus === "FAILED") {
          throw new Error("Care plan generation failed.");
        }

        await sleep(POLLING_INTERVAL_MS);
      }

      throw new Error("Care plan is taking longer than expected. Please try polling again.");
    } finally {
      setIsPolling(false);
    }
  };

  const requestCarePlan = async (requestedNotes?: string) => {
    if (!sessionId) {
      setErrorMessage("Missing session id in route.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setPlanContent(null);
    setReasoningSummary([]);

    try {
      const trimmedNotes = (requestedNotes ?? notes).trim();
      const body: Record<string, unknown> = {
        session_id: sessionId,
        plan_type: planType,
      };

      if (trimmedNotes) {
        body.notes = trimmedNotes;
      }

      const response = await fetch(buildUrl("/v1/mia/care-plans"), {
        method: "POST",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to request care plan."));
      }

      const data = (await response.json()) as GenerateCarePlanResponse;
      setPlanId(data.plan_id);
      setPlanStatus("PROCESSING");
      await pollCarePlan(data.plan_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to request care plan.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = () => {
    setEditNotes("");
    setIsEditModalOpen(true);
  };

  const closeEditModal = useCallback(() => {
    if (isSubmitting || isPolling) {
      return;
    }
    setIsEditModalOpen(false);
  }, [isSubmitting, isPolling]);

  const submitEditRequest = async () => {
    const trimmed = editNotes.trim();
    if (!trimmed) {
      return;
    }

    await requestCarePlan(trimmed);
    setIsEditModalOpen(false);
    setEditNotes("");
  };

  useEffect(() => {
    if (!isEditModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeEditModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isEditModalOpen, closeEditModal]);

  const formattedPlanContent =
    planContent === null || typeof planContent === "undefined" ? "" : JSON.stringify(planContent, null, 2);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
        <header className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">MIA Care Plan</h1>
              <p className="mt-2 text-sm text-slate-600">Session ID: {sessionId || "Missing"}</p>
            </div>
            <Link
              href={sessionId ? `/mia-audio-test-bench?sessionId=${sessionId}` : "/mia-audio-test-bench"}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to Audio Test Bench
            </Link>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Request Care Plan</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Environment
              <select
                value={selectedEnvironment}
                onChange={(event) => setSelectedEnvironment(event.target.value as MiaEnvironment)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
              >
                {environmentOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                    {option.isConfigured ? "" : " (fallback)"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Proxy Token (optional)
              <input
                type="password"
                value={proxyToken}
                onChange={(event) => setProxyToken(event.target.value)}
                placeholder="Only needed if server env token is not set"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
              />
            </label>

            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Plan Type
              <select
                value={planType}
                onChange={(event) => setPlanType(event.target.value as "bmc" | "mental_health_plan")}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
              >
                <option value="mental_health_plan">mental_health_plan</option>
                <option value="bmc">bmc</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional clinician notes for generation"
              className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void requestCarePlan()}
              disabled={!sessionId || isSubmitting || isPolling}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting || isPolling ? "Processing..." : "Generate Care Plan"}
            </button>

            <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              status: {planStatus}
            </span>
            <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              plan_id: {planId || "-"}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Care Plan JSON</h2>
            <button
              type="button"
              onClick={openEditModal}
              disabled={!formattedPlanContent || isSubmitting || isPolling}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Request Edit
            </button>
          </div>

          {formattedPlanContent ? (
            <pre className="max-h-[32rem] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
              {formattedPlanContent}
            </pre>
          ) : (
            <p className="text-sm text-slate-500">Care plan content will appear here after generation finishes.</p>
          )}

          {reasoningSummary.length > 0 ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-2 text-sm font-semibold">Reasoning Summary</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {reasoningSummary.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {isEditModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Request Care Plan Edit</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Add notes describing the changes you want and a new care plan will be generated.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSubmitting || isPolling}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close
                </button>
              </div>

              <label className="mt-5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Edit Notes
                <textarea
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  placeholder="Describe requested updates to the care plan"
                  className="mt-2 min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                />
              </label>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSubmitting || isPolling}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitEditRequest()}
                  disabled={!editNotes.trim() || isSubmitting || isPolling}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting || isPolling ? "Submitting..." : "Submit Edit Request"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
