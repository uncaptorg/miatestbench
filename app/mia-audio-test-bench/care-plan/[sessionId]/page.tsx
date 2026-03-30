"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type MiaEnvironment = "local" | "staging" | "production";
type EnvironmentOption = { key: MiaEnvironment; label: string; isConfigured: boolean };
type EnvironmentResponse = { defaultEnvironment?: MiaEnvironment; environments?: EnvironmentOption[] };

type OodaReasoning = {
  observe?: string; observeScore?: number | null
  orient?: string;  orientScore?: number | null
  decide?: string;  decideScore?: number | null
  act?: string
};

type ShortTermAim = {
  title?: string;
  priority?: string;
  interventions?: { name?: string; description?: string }[];
  progressMonitoring?: string[];
  nextSteps?: string[];
};

type ClinicianPlanBMC = {
  clientInformation?: { name?: string; age?: string; gender?: string };
  presentingConcern?: string;
  backgroundInformation?: string;
  riskAssessment?: { narrative?: string; emergencyContacts?: string; safetyPlan?: string; followUp?: string };
  workingHypothesis?: string;
  monitoringAndEvaluation?: {
    frequencyOfSessions?: string;
    salientFactorsToMonitor?: string;
    recommendedOutcomeMeasures?: string;
    feedbackMechanism?: string;
  };
  shortTermAims?: ShortTermAim[];
  longTermAims?: string[];
  informationGaps?: string[];
};

type ClinicianPlanGP = {
  formTitle?: string;
  mbsItems?: Record<string, boolean>;
  clientInformation?: { name?: string; age?: string; gender?: string };
  patientWellbeingAssessment?: {
    reasonsForPresenting?: string;
    patientHistory?: { medicalBiological?: string; mentalHealthPsychological?: string; socialHistory?: string };
    medicationsAndPsychotropics?: { currentMedications?: string; previousMedications?: string };
    mentalStateExamination?: Record<string, string>;
    riskAssessment?: string;
    provisionalDiagnosis?: string;
    caseFormulation?: { predisposing?: string; precipitating?: string; perpetuating?: string; protective?: string };
    assessmentOutcomeToolUsed?: string;
    assessmentOutcomeResults?: string;
  };
  personalManagementPlan?: {
    identifiedIssues?: string;
    goals?: string;
    treatmentsAndInterventions?: string;
    referrals?: string;
    interventionRelapsePreventionPlan?: string;
  };
  crisisPlan?: { emergencyContacts?: string; safetyPlan?: string; followUp?: string };
  informationGaps?: string[];
};

type PatientPlan = {
  whatWeAreSeeing?: string;
  priorityAreas?: { title?: string; urgency?: string; description?: string }[];
  goals?: { title?: string; description?: string }[];
  howWeGetThere?: { approach?: string; description?: string }[];
  safetyText?: string;
  whatComesNext?: string[];
};

type CarePlanResponse = {
  status?: string;
  failure_reason?: string;
  clinician_plan?: ClinicianPlanBMC & ClinicianPlanGP;
  patient_plan?: PatientPlan;
  ooda_reasoning?: OodaReasoning;
  kb_evidence_chunks?: string[];
  kb_evidence_sources?: string[];
  reasoning_trace_summary?: string;
};

type GenerateCarePlanResponse = { plan_id: string };

const DEFAULT_ENVIRONMENT_OPTIONS: EnvironmentOption[] = [
  { key: "local", label: "Local", isConfigured: true },
  { key: "staging", label: "Staging", isConfigured: true },
  { key: "production", label: "Production", isConfigured: true },
];

const POLLING_INTERVAL_MS = 3000;
const PLAN_POLL_MAX_ATTEMPTS = 60;
const PROXY_BASE_PATH = "/api/mia";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const getErrorMessage = async (response: Response, fallback: string) =>
  (await response.text().catch(() => "")) || fallback;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreDots({ score }: { score?: number | null }) {
  if (score == null) return null;
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          title={`${score}/5`}
          className={`h-2 w-2 rounded-full ${
            n <= score
              ? score >= 4 ? "bg-teal-500" : score >= 3 ? "bg-amber-400" : "bg-red-400"
              : "bg-slate-200"
          }`}
        />
      ))}
      <span className="ml-1 font-mono text-[10px] font-bold text-slate-400">{score}/5</span>
    </div>
  );
}

function OodaCards({ ooda }: { ooda: OodaReasoning }) {
  const steps: { textKey: keyof OodaReasoning; scoreKey?: keyof OodaReasoning; label: string; title: string }[] = [
    { textKey: "observe", scoreKey: "observeScore", label: "OBSERVE", title: "Gather context" },
    { textKey: "orient",  scoreKey: "orientScore",  label: "ORIENT",  title: "Map to priorities" },
    { textKey: "decide",  scoreKey: "decideScore",  label: "DECIDE",  title: "Confidence check" },
    { textKey: "act",                               label: "ACT",     title: "Generate draft" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {steps.map((s) => {
        const score = s.scoreKey != null ? (ooda[s.scoreKey] as number | null | undefined) : undefined;
        return (
          <div key={s.textKey} className="rounded-xl border bg-white p-4 shadow-sm">
            <span className="mb-2 inline-block rounded bg-teal-50 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-700">
              {s.label}
            </span>
            <div className="mb-1 text-sm font-bold text-slate-800">{s.title}</div>
            <div className="text-xs leading-relaxed text-slate-500">{ooda[s.textKey] as string ?? "—"}</div>
            <ScoreDots score={score} />
          </div>
        );
      })}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string }) {
  if (!value || value === "unknown") return null;
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="text-sm leading-relaxed text-slate-700">{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-teal-600">{children}</div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${className}`}>{children}</div>
  );
}

function priorityColor(priority?: string) {
  const p = (priority ?? "").toUpperCase();
  if (p === "HIGH") return "bg-teal-50 text-teal-700 border-teal-200";
  if (p === "MEDIUM") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function urgencyDot(urgency?: string) {
  const u = (urgency ?? "").toLowerCase();
  if (u === "high") return "bg-red-500";
  if (u === "medium") return "bg-amber-500";
  return "bg-slate-400";
}

function ClinicianBMCView({ plan }: { plan: ClinicianPlanBMC }) {
  const info = plan.clientInformation;
  const risk = plan.riskAssessment;
  const monitoring = plan.monitoringAndEvaluation;
  return (
    <div className="flex flex-col gap-5">
      {/* Client info strip */}
      {info && (
        <div className="grid grid-cols-3 gap-3">
          {[["Name", info.name], ["Age", info.age], ["Gender", info.gender]].map(([label, val]) =>
            val && val !== "unknown" ? (
              <div key={label} className="rounded-lg border bg-slate-50 px-4 py-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
                <div className="text-sm font-semibold text-slate-800">{val}</div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {/* Presenting concern + Background */}
      <div className="grid gap-4 md:grid-cols-2">
        {plan.presentingConcern && plan.presentingConcern !== "unknown" && (
          <div>
            <SectionLabel>Presenting Concern</SectionLabel>
            <p className="text-sm leading-relaxed text-slate-700">{plan.presentingConcern}</p>
          </div>
        )}
        {plan.backgroundInformation && plan.backgroundInformation !== "unknown" && (
          <div>
            <SectionLabel>Background Information</SectionLabel>
            <p className="text-sm leading-relaxed text-slate-700">{plan.backgroundInformation}</p>
          </div>
        )}
      </div>

      {/* Risk assessment */}
      {risk && risk.narrative && risk.narrative !== "unknown" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-red-700">⚠ Risk Assessment</div>
          <p className="mb-4 text-sm leading-relaxed text-red-900">{risk.narrative}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {risk.emergencyContacts && risk.emergencyContacts !== "unknown" && (
              <div className="rounded-lg border border-red-200 bg-white p-3">
                <div className="mb-1 text-[10px] font-bold text-red-700">Emergency contacts</div>
                <div className="text-xs leading-relaxed text-red-800">{risk.emergencyContacts}</div>
              </div>
            )}
            {risk.safetyPlan && risk.safetyPlan !== "unknown" && (
              <div className="rounded-lg border border-red-200 bg-white p-3">
                <div className="mb-1 text-[10px] font-bold text-red-700">Safety plan</div>
                <div className="text-xs leading-relaxed text-red-800">{risk.safetyPlan}</div>
              </div>
            )}
            {risk.followUp && risk.followUp !== "unknown" && (
              <div className="rounded-lg border border-red-200 bg-white p-3">
                <div className="mb-1 text-[10px] font-bold text-red-700">Follow-up</div>
                <div className="text-xs leading-relaxed text-red-800">{risk.followUp}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Working hypothesis + Monitoring */}
      <div className="grid gap-4 md:grid-cols-2">
        {plan.workingHypothesis && plan.workingHypothesis !== "unknown" && (
          <div>
            <SectionLabel>Working Hypothesis / Formulation</SectionLabel>
            <p className="text-sm leading-relaxed text-slate-700">{plan.workingHypothesis}</p>
          </div>
        )}
        {monitoring && (
          <div className="rounded-lg border bg-slate-50 p-4">
            <SectionLabel>Care Plan Overview</SectionLabel>
            <div className="flex flex-col gap-2 text-sm">
              {monitoring.frequencyOfSessions && monitoring.frequencyOfSessions !== "unknown" && (
                <div><strong>Frequency:</strong> <span className="text-slate-500">{monitoring.frequencyOfSessions}</span></div>
              )}
              {monitoring.salientFactorsToMonitor && monitoring.salientFactorsToMonitor !== "unknown" && (
                <div><strong>Monitor:</strong> <span className="text-slate-500">{monitoring.salientFactorsToMonitor}</span></div>
              )}
              {monitoring.recommendedOutcomeMeasures && monitoring.recommendedOutcomeMeasures !== "unknown" && (
                <div><strong>Measures:</strong> <span className="text-slate-500">{monitoring.recommendedOutcomeMeasures}</span></div>
              )}
              {monitoring.feedbackMechanism && monitoring.feedbackMechanism !== "unknown" && (
                <div><strong>Feedback:</strong> <span className="text-slate-500">{monitoring.feedbackMechanism}</span></div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Short-term aims */}
      {plan.shortTermAims && plan.shortTermAims.length > 0 && (
        <div>
          <SectionLabel>Short-term Aims</SectionLabel>
          <div className="flex flex-col gap-3">
            {plan.shortTermAims.map((aim, i) => (
              <div key={i} className="overflow-hidden rounded-xl border">
                <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aim {i + 1}</span>
                    <span className="text-sm font-bold text-slate-800">{aim.title}</span>
                  </div>
                  {aim.priority && (
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityColor(aim.priority)}`}>
                      {aim.priority}
                    </span>
                  )}
                </div>
                <div className="grid md:grid-cols-3 divide-y md:divide-x md:divide-y-0 divide-slate-100">
                  <div className="p-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-teal-600">Interventions</div>
                    <ul className="flex flex-col gap-2">
                      {(aim.interventions ?? []).map((iv, j) => (
                        <li key={j} className="text-xs leading-relaxed text-slate-500">
                          {iv.name && <strong className="text-slate-700">{iv.name}</strong>}
                          {iv.name && iv.description ? " — " : ""}
                          {iv.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-teal-600">Progress Monitoring</div>
                    <ul className="flex flex-col gap-1">
                      {(aim.progressMonitoring ?? []).map((m, j) => (
                        <li key={j} className="text-xs leading-relaxed text-slate-500">{m}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-teal-600">Next Steps</div>
                    <ul className="flex flex-col gap-1">
                      {(aim.nextSteps ?? []).map((s, j) => (
                        <li key={j} className="text-xs leading-relaxed text-slate-500">{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Long-term aims + Information gaps */}
      <div className="grid gap-4 md:grid-cols-2">
        {plan.longTermAims && plan.longTermAims.length > 0 && (
          <div className="rounded-lg border bg-slate-50 p-4">
            <SectionLabel>Long-term Aims</SectionLabel>
            <ul className="flex flex-col gap-1">
              {plan.longTermAims.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-teal-500 font-bold">—</span>{a}</li>
              ))}
            </ul>
          </div>
        )}
        {plan.informationGaps && plan.informationGaps.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-amber-700">Flagged — information gaps</div>
            <ul className="flex flex-col gap-1">
              {plan.informationGaps.map((g, i) => (
                <li key={i} className="flex gap-2 text-sm text-amber-800"><span className="font-bold">—</span>{g}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ClinicianGPView({ plan }: { plan: ClinicianPlanGP }) {
  const assess = plan.patientWellbeingAssessment;
  const mgmt = plan.personalManagementPlan;
  const crisis = plan.crisisPlan;
  const selectedMbs = Object.entries(plan.mbsItems ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");
  return (
    <div className="flex flex-col gap-5">
      {/* Client info + MBS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {plan.clientInformation?.name && plan.clientInformation.name !== "unknown" && (
          <div className="rounded-lg border bg-slate-50 px-4 py-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Name</div>
            <div className="text-sm font-semibold text-slate-800">{plan.clientInformation.name}</div>
          </div>
        )}
        {plan.clientInformation?.age && plan.clientInformation.age !== "unknown" && (
          <div className="rounded-lg border bg-slate-50 px-4 py-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Age</div>
            <div className="text-sm font-semibold text-slate-800">{plan.clientInformation.age}</div>
          </div>
        )}
        {selectedMbs && (
          <div className="rounded-lg border bg-teal-50 px-4 py-3 md:col-span-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-teal-600">MBS Items</div>
            <div className="text-sm font-semibold text-teal-800">{selectedMbs}</div>
          </div>
        )}
      </div>

      {assess && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoField label="Reasons for Presenting" value={assess.reasonsForPresenting} />
            <InfoField label="Provisional Diagnosis" value={assess.provisionalDiagnosis} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <InfoField label="Medical / Biological History" value={assess.patientHistory?.medicalBiological} />
            <InfoField label="Mental Health History" value={assess.patientHistory?.mentalHealthPsychological} />
            <InfoField label="Social History" value={assess.patientHistory?.socialHistory} />
          </div>
          {assess.riskAssessment && assess.riskAssessment !== "unknown" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-700">⚠ Risk Assessment</div>
              <p className="text-sm leading-relaxed text-red-900">{assess.riskAssessment}</p>
            </div>
          )}
          {assess.caseFormulation && (
            <div>
              <SectionLabel>Case Formulation</SectionLabel>
              <div className="grid gap-3 md:grid-cols-2">
                <InfoField label="Predisposing" value={assess.caseFormulation.predisposing} />
                <InfoField label="Precipitating" value={assess.caseFormulation.precipitating} />
                <InfoField label="Perpetuating" value={assess.caseFormulation.perpetuating} />
                <InfoField label="Protective" value={assess.caseFormulation.protective} />
              </div>
            </div>
          )}
        </>
      )}

      {mgmt && (
        <div>
          <SectionLabel>Personal Management Plan</SectionLabel>
          <div className="flex flex-col gap-3">
            <InfoField label="Identified Issues" value={mgmt.identifiedIssues} />
            <InfoField label="Goals" value={mgmt.goals} />
            <InfoField label="Treatments & Interventions" value={mgmt.treatmentsAndInterventions} />
            <InfoField label="Referrals" value={mgmt.referrals} />
            <InfoField label="Relapse Prevention" value={mgmt.interventionRelapsePreventionPlan} />
          </div>
        </div>
      )}

      {crisis && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-red-700">⚠ Crisis Plan</div>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoField label="Emergency Contacts" value={crisis.emergencyContacts} />
            <InfoField label="Safety Plan" value={crisis.safetyPlan} />
            <InfoField label="Follow-up" value={crisis.followUp} />
          </div>
        </div>
      )}

      {plan.informationGaps && plan.informationGaps.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-amber-700">Flagged — information gaps</div>
          <ul className="flex flex-col gap-1">
            {plan.informationGaps.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-800"><span className="font-bold">—</span>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PatientView({ plan }: { plan: PatientPlan }) {
  return (
    <div className="flex flex-col gap-5">
      {plan.whatWeAreSeeing && (
        <div className="rounded-lg border bg-slate-50 p-4">
          <SectionLabel>What we&apos;re seeing</SectionLabel>
          <p className="text-sm leading-relaxed text-slate-700">{plan.whatWeAreSeeing}</p>
        </div>
      )}

      {plan.priorityAreas && plan.priorityAreas.length > 0 && (
        <div>
          <SectionLabel>What matters most right now</SectionLabel>
          <div className="flex flex-col gap-2">
            {plan.priorityAreas.map((area, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border bg-slate-50 px-4 py-3">
                <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${urgencyDot(area.urgency)}`} />
                <div>
                  <div className="text-sm font-bold text-slate-800">{area.title}</div>
                  <div className="text-xs text-slate-500">{area.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.goals && plan.goals.length > 0 && (
        <div>
          <SectionLabel>Your goals</SectionLabel>
          <div className="flex flex-col gap-2">
            {plan.goals.map((goal, i) => (
              <div key={i} className="overflow-hidden rounded-xl border">
                <div className="border-b bg-slate-50 px-4 py-3">
                  <span className="text-sm font-bold text-slate-800">Goal {i + 1} · {goal.title}</span>
                </div>
                <div className="px-4 py-3 text-sm leading-relaxed text-slate-600">{goal.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.howWeGetThere && plan.howWeGetThere.length > 0 && (
        <div>
          <SectionLabel>How we&apos;ll get there</SectionLabel>
          <div className="flex flex-col gap-2">
            {plan.howWeGetThere.map((item, i) => (
              <div key={i} className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <strong>{item.approach}</strong>
                {item.description ? `: ${item.description}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.safetyText && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-700">If things get harder before next session</div>
          <p className="text-sm leading-relaxed text-red-900">{plan.safetyText}</p>
        </div>
      )}

      {plan.whatComesNext && plan.whatComesNext.length > 0 && (
        <div className="rounded-lg border bg-slate-50 p-4">
          <SectionLabel>What comes next</SectionLabel>
          <ul className="flex flex-col gap-2">
            {plan.whatComesNext.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="font-bold text-teal-500">→</span>{item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs italic leading-relaxed text-slate-400">
        This plan was prepared by MIA based on your session. It has not been finalised until your clinician reviews and approves it.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

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
  const [clinicianPlan, setClinicianPlan] = useState<CarePlanResponse["clinician_plan"]>(null);
  const [patientPlan, setPatientPlan] = useState<PatientPlan | null>(null);
  const [oodaReasoning, setOodaReasoning] = useState<OodaReasoning | null>(null);
  const [kbEvidenceChunks, setKbEvidenceChunks] = useState<string[]>([]);
  const [kbEvidenceSources, setKbEvidenceSources] = useState<string[]>([]);
  const [reasoningSummary, setReasoningSummary] = useState("");
  const [currentPlanType, setCurrentPlanType] = useState<"bmc" | "mental_health_plan">("mental_health_plan");

  const [activeView, setActiveView] = useState<"clinician" | "patient">("clinician");
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
    if (typeof savedToken === "string") setProxyToken(savedToken);
    if (sessionId.trim()) sessionStorage.setItem("miaAudioBench.sessionId", sessionId.trim());
  }, [sessionId]);

  useEffect(() => {
    const loadEnvironmentOptions = async () => {
      try {
        const response = await fetch("/api/mia/environments", { method: "GET" });
        if (!response.ok) return;
        const data = (await response.json()) as EnvironmentResponse;
        if (Array.isArray(data.environments) && data.environments.length > 0) setEnvironmentOptions(data.environments);
        if (data.defaultEnvironment) setSelectedEnvironment(data.defaultEnvironment);
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
        const response = await fetch(buildUrl(`/v1/mia/care-plans/${currentPlanId}`), { method: "GET", headers });
        if (!response.ok) throw new Error(await getErrorMessage(response, "Failed to poll care plan."));

        const data = (await response.json()) as CarePlanResponse;
        const nextStatus = data.status ?? "UNKNOWN";
        setPlanStatus(nextStatus);

        if (nextStatus === "READY") {
          setClinicianPlan(data.clinician_plan ?? null);
          setPatientPlan(data.patient_plan ?? null);
          setOodaReasoning(data.ooda_reasoning ?? null);
          setKbEvidenceChunks(Array.isArray(data.kb_evidence_chunks) ? data.kb_evidence_chunks : []);
          setKbEvidenceSources(Array.isArray(data.kb_evidence_sources) ? data.kb_evidence_sources : []);
          setReasoningSummary(typeof data.reasoning_trace_summary === "string" ? data.reasoning_trace_summary : "");
          return;
        }
        if (nextStatus === "ERROR" || nextStatus === "FAILED") {
          throw new Error(data.failure_reason ?? "Care plan generation failed.");
        }
        await sleep(POLLING_INTERVAL_MS);
      }
      throw new Error("Care plan is taking longer than expected. Please try again.");
    } finally {
      setIsPolling(false);
    }
  };

  const requestCarePlan = async (requestedNotes?: string) => {
    if (!sessionId) { setErrorMessage("Missing session id in route."); return; }
    setIsSubmitting(true);
    setErrorMessage("");
    setClinicianPlan(null);
    setPatientPlan(null);
    setOodaReasoning(null);
    setKbEvidenceChunks([]);
    setKbEvidenceSources([]);
    setReasoningSummary("");
    setCurrentPlanType(planType);

    try {
      const trimmedNotes = (requestedNotes ?? notes).trim();
      const body: Record<string, unknown> = { session_id: sessionId, plan_type: planType };
      if (trimmedNotes) body.notes = trimmedNotes;

      const response = await fetch(buildUrl("/v1/mia/care-plans"), {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Failed to request care plan."));

      const data = (await response.json()) as GenerateCarePlanResponse;
      setPlanId(data.plan_id);
      setPlanStatus("PROCESSING");
      await pollCarePlan(data.plan_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to request care plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = () => { setEditNotes(""); setIsEditModalOpen(true); };
  const closeEditModal = useCallback(() => {
    if (isSubmitting || isPolling) return;
    setIsEditModalOpen(false);
  }, [isSubmitting, isPolling]);

  const submitEditRequest = async () => {
    const trimmed = editNotes.trim();
    if (!trimmed) return;
    await requestCarePlan(trimmed);
    setIsEditModalOpen(false);
    setEditNotes("");
  };

  useEffect(() => {
    if (!isEditModalOpen) return;
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeEditModal(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isEditModalOpen, closeEditModal]);

  const hasContent = clinicianPlan !== null || patientPlan !== null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 md:px-8">

        {/* Header */}
        <header className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-teal-600">MIA · Care Plan Generation</div>
              <h1 className="text-2xl font-semibold">AI-Drafted Care Plan</h1>
              <p className="mt-1 text-sm text-slate-400">Session: {sessionId || "Missing"}</p>
            </div>
            <Link
              href={sessionId ? `/mia-audio-test-bench?sessionId=${sessionId}` : "/mia-audio-test-bench"}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Back to Session
            </Link>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
        )}

        {/* Generate form */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Generate Care Plan</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Environment
              <select
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value as MiaEnvironment)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
              >
                {environmentOptions.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}{o.isConfigured ? "" : " (fallback)"}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Plan Type
              <select
                value={planType}
                onChange={(e) => setPlanType(e.target.value as "bmc" | "mental_health_plan")}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
              >
                <option value="mental_health_plan">GP Mental Health Plan</option>
                <option value="bmc">BMC Care Plan</option>
              </select>
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Proxy Token (optional)
              <input
                type="password"
                value={proxyToken}
                onChange={(e) => setProxyToken(e.target.value)}
                placeholder="Only needed if not set server-side"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
              />
            </label>
          </div>
          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Clinician Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context or specific areas to address"
              className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void requestCarePlan()}
              disabled={!sessionId || isSubmitting || isPolling}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting || isPolling ? "Generating…" : "Generate Care Plan"}
            </button>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              planStatus === "READY" ? "border-teal-200 bg-teal-50 text-teal-700"
              : planStatus === "PROCESSING" ? "border-amber-200 bg-amber-50 text-amber-700"
              : planStatus === "FAILED" ? "border-red-200 bg-red-50 text-red-700"
              : "border-slate-200 bg-slate-50 text-slate-600"
            }`}>
              {planStatus}
            </span>
            {planId && <span className="text-xs text-slate-400">plan: {planId}</span>}
          </div>
        </Card>

        {/* Reasoning summary */}
        {reasoningSummary && (
          <Card>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-teal-600">Reasoning Summary</div>
            <p className="text-sm leading-relaxed text-slate-600">{reasoningSummary}</p>
          </Card>
        )}

        {/* BMC Knowledge Bank Evidence */}
        {kbEvidenceChunks.length > 0 && (
          <div>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-teal-600">
              BMC Knowledge Bank — Evidence Used
            </div>
            <div className="flex flex-col gap-2">
              {kbEvidenceChunks.map((chunk, i) => {
                if (!chunk?.trim()) return null;
                const sourceName = kbEvidenceSources[i];
                return (
                  <div key={i} className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-indigo-400">[{i + 1}]</span>
                      {sourceName && (
                        <span
                          className="rounded bg-indigo-200 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 truncate max-w-[280px]"
                          title={sourceName}
                        >
                          {sourceName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs leading-relaxed text-indigo-900">{chunk.trim()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* OODA reasoning */}
        {oodaReasoning && (
          <div>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-teal-600">MIA OODA Loop — How this plan was built</div>
            <OodaCards ooda={oodaReasoning} />
          </div>
        )}

        {/* Care plan views */}
        {hasContent && (
          <div>
            {/* View toggle */}
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Care Plan</div>
              <div className="flex items-center gap-2">
                {hasContent && (
            <button
              type="button"
              onClick={openEditModal}
                    disabled={isSubmitting || isPolling}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Request Edit
            </button>
                )}
                <div className="flex rounded-lg border bg-slate-100 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveView("clinician")}
                    className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                      activeView === "clinician" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Clinician
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView("patient")}
                    className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                      activeView === "patient" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Patient
                  </button>
                </div>
              </div>
            </div>

            <Card>
              <div className="mb-4 flex items-center justify-between border-b pb-4">
                <span className="text-sm font-bold text-slate-700">
                  {activeView === "clinician" ? "Care Planning Report" : "Your Care Plan"}
                  {clinicianPlan?.clientInformation?.name ? ` — ${clinicianPlan.clientInformation.name}` : ""}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Draft — awaiting clinician review
                </span>
              </div>

              {activeView === "clinician" && clinicianPlan && (
                currentPlanType === "bmc"
                  ? <ClinicianBMCView plan={clinicianPlan as ClinicianPlanBMC} />
                  : <ClinicianGPView plan={clinicianPlan as ClinicianPlanGP} />
              )}
              {activeView === "patient" && patientPlan && (
                <PatientView plan={patientPlan} />
              )}
              {activeView === "patient" && !patientPlan && (
                <p className="text-sm text-slate-400">Patient plan not available.</p>
              )}

              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <span className="text-xs text-slate-400">Generated by MIA · Draft — clinician review required before use</span>
                <span className="text-xs text-slate-400">BMC Knowledge Bank grounded</span>
              </div>
            </Card>
          </div>
        )}

        {/* Edit modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Request Care Plan Edit</h2>
                  <p className="mt-1 text-sm text-slate-500">Add notes and a revised plan will be generated.</p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSubmitting || isPolling}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Close
                </button>
              </div>
              <label className="mt-5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Edit Notes
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Describe the changes you want"
                  className="mt-2 min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                />
              </label>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSubmitting || isPolling}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitEditRequest()}
                  disabled={!editNotes.trim() || isSubmitting || isPolling}
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting || isPolling ? "Submitting…" : "Submit Edit Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
