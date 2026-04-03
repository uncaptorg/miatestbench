"use client";

import { Mic, Square, Play, LoaderCircle, Activity, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const DEFAULT_ENVIRONMENT_OPTIONS: EnvironmentOption[] = [
  { key: "local", label: "Local", isConfigured: true },
  { key: "staging", label: "Staging", isConfigured: true },
  { key: "production", label: "Production", isConfigured: true },
];

type SessionResponse = {
  session_id: string;
};

type FeedbackResponse = {
  summary_notes?: string;
  prompt_questions?: string[];
  last_sequence_processed?: number | null;
  last_modified_date_utc?: string;
  next_expected_sequence?: number;
  illness_type_stage_and_trajectory_score?: number | null;
  illness_type_stage_and_trajectory_rationale?: string | null;
  suicidal_thoughts_and_behaviours_score?: number | null;
  suicidal_thoughts_and_behaviours_rationale?: string | null;
  social_and_occupational_functioning_score?: number | null;
  social_and_occupational_functioning_rationale?: string | null;
  alcohol_and_substance_misuse_score?: number | null;
  alcohol_and_substance_misuse_rationale?: string | null;
  physical_health_score?: number | null;
  physical_health_rationale?: string | null;
  audio_transcription?: string | null;
  ooda_reasoning?: string | null;
  last_transcription_completed_at?: string | null;
  transcription_ms?: number | null;
  llm_ms?: number | null;
  observe_score?: number | null;
  orient_score?: number | null;
  decide_score?: number | null;
  knowns?: string[] | null;
  unknowns?: string[] | null;
  assumptions?: string[] | null;
  assessment_message?: string | null;
  why_this_question?: string | null;
  kb_evidence?: string[] | null;
  kb_evidence_sources?: string[] | null;
};

type SessionInfoResponse = {
  session_id?: string;
  status?: string;
  failure_reason?: string | null;
  assumptions?: string[];
  missing_information?: string[];
  summary?: string | null;
  // Risk
  suicidality_risk_rating?: string | null;
  risk_score?: number | null;
  risk?: string | null;
  // Clinical reasoning
  inferences?: string | null;
  differential_diagnosis?: string | null;
  root_cause?: string | null;
  prognosis?: string | null;
  interventions?: string | null;
  key_insights?: string[];
  // Treatment
  likely_treatment_goals?: string[];
  first_line_treatment?: string[];
  second_line_treatment?: string[];
  further_assessment_steps?: string[];
  // Domain scores
  risk_assessment_score?: number | null;
  risk_assessment_score_reason?: string[];
  functioning_score?: number | null;
  functioning_score_reason?: string[];
  comorbidity_score?: number | null;
  comorbidity_score_reason?: string[];
  physical_health_score?: number | null;
  physical_health_score_reason?: string[];
  illness_type_score?: number | null;
  illness_type_score_reason?: string[];
};

type TranscriptionSegment = {
  start_seconds?: number;
  end_seconds?: number;
  text?: string;
  speaker?: string;
  role?: string;
};

type TranscriptionResponse = {
  segments?: TranscriptionSegment[];
  summary?: string;
};

type UploadResponse = {
  last_sequence_processed?: number;
};

type FeedbackScoreKey =
  | "illness_type_stage_and_trajectory_score"
  | "suicidal_thoughts_and_behaviours_score"
  | "social_and_occupational_functioning_score"
  | "alcohol_and_substance_misuse_score"
  | "physical_health_score";

type FeedbackRationaleKey =
  | "illness_type_stage_and_trajectory_rationale"
  | "suicidal_thoughts_and_behaviours_rationale"
  | "social_and_occupational_functioning_rationale"
  | "alcohol_and_substance_misuse_rationale"
  | "physical_health_rationale";

type FeedbackScores = Record<FeedbackScoreKey, number | null>;
type FeedbackRationales = Record<FeedbackRationaleKey, string | null>;
type SessionMode = "audio" | "text";

const SCORE_FIELDS: Array<{ key: FeedbackScoreKey; rationaleKey: FeedbackRationaleKey; label: string }> = [
  { key: "illness_type_stage_and_trajectory_score", rationaleKey: "illness_type_stage_and_trajectory_rationale", label: "Illness Type Stage & Trajectory" },
  { key: "suicidal_thoughts_and_behaviours_score", rationaleKey: "suicidal_thoughts_and_behaviours_rationale", label: "Suicidal Thoughts & Behaviours" },
  { key: "social_and_occupational_functioning_score", rationaleKey: "social_and_occupational_functioning_rationale", label: "Social & Occupational Functioning" },
  { key: "alcohol_and_substance_misuse_score", rationaleKey: "alcohol_and_substance_misuse_rationale", label: "Alcohol & Substance Misuse" },
  { key: "physical_health_score", rationaleKey: "physical_health_rationale", label: "Physical Health" },
];

const createDefaultFeedbackScores = (): FeedbackScores => ({
  illness_type_stage_and_trajectory_score: null,
  suicidal_thoughts_and_behaviours_score: null,
  social_and_occupational_functioning_score: null,
  alcohol_and_substance_misuse_score: null,
  physical_health_score: null,
});

const createDefaultFeedbackRationales = (): FeedbackRationales => ({
  illness_type_stage_and_trajectory_rationale: null,
  suicidal_thoughts_and_behaviours_rationale: null,
  social_and_occupational_functioning_rationale: null,
  alcohol_and_substance_misuse_rationale: null,
  physical_health_rationale: null,
});

const RECORDING_TIMESLICE_MS = 5000;
const POLLING_INTERVAL_MS = 3000;
const SESSION_UPDATE_MAX_POLLS = 20;
const PROXY_BASE_PATH = "/api/mia";

type OptionalDemographicsInput = {
  gender: string;
  gender_at_birth: string;
  sexual_identity: string;
  postcode: string;
  state: string;
  country: string;
  relationship_status: string;
  living_circumstances: string;
  support_level: string;
  has_supportive_adult: "" | "true" | "false";
  employed: "" | "true" | "false";
  employment_status: string;
  currently_studying: "" | "true" | "false";
  has_disability: "" | "true" | "false";
  nature_of_disability: string;
  assistance_needed: string;
  prescription_medication: string;
  previous_counseling_types: string;
};

type OptionalDemographicsFieldMeta = {
  key: keyof OptionalDemographicsInput;
  label: string;
  input: "text" | "boolean";
  options?: string[];
  helperText?: string;
};

const GENDER_OPTIONS = [
  "male",
  "female",
  "transgender",
  "transgender_female",
  "transgender_male",
  "non_binary",
  "gender_queer",
  "gender_fluid",
  "gender_neutral",
  "androgynous",
  "two_spirit",
  "neither_gender_identity",
  "not_sure",
  "prefer_not_to_answer",
  "other",
];

const GENDER_AT_BIRTH_OPTIONS = ["male_at_birth", "female_at_birth", "intersex", "prefer_not_to_answer"];

const SEXUAL_IDENTITY_OPTIONS = [
  "straight",
  "gay",
  "lesbian",
  "bisexual",
  "asexual",
  "queer",
  "pansexual",
  "demisexual",
  "two_spirit",
  "not_sure",
  "questioning",
  "prefer_not_to_answer",
  "other",
];

const AUSTRALIAN_STATE_OPTIONS = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];

const COUNTRY_OPTIONS = ["AU"];

const RELATIONSHIP_STATUS_OPTIONS = ["single", "living_with", "not_living_with", "separated", "divorced", "widowed"];

const LIVING_CIRCUMSTANCES_OPTIONS = [
  "own",
  "family",
  "shared",
  "retirement",
  "nursing",
  "homeless",
  "other_living_circumstances",
];

const SUPPORT_LEVEL_OPTIONS = ["independent", "partially_supported", "dependent"];

const EMPLOYMENT_STATUS_OPTIONS = ["full_time", "part_time_regular", "part_time_irregular", "casual", "other"];

const NATURE_OF_DISABILITY_OPTIONS = [
  "pain_related",
  "flexibility",
  "mobility",
  "mental_health_related",
  "seeing",
  "hearing",
  "learning",
  "memory",
  "developmental",
  "dexterity_agility",
  "unknown",
  "prefer_not_to_answer",
  "other",
];

const ASSISTANCE_NEEDED_OPTIONS = ["needed", "not_needed", "already_obtained"];

const PREVIOUS_COUNSELING_TYPE_OPTIONS = [
  "general_counseling",
  "cbt",
  "trauma_cbt",
  "emdr",
  "play_art_therapy",
  "cognitive_processing_therapy",
  "dialectical_behavioural_therapy",
  "narrative_therapy",
  "system_family_therapy",
  "not_sure",
  "other",
];

const EMPTY_OPTIONAL_DEMOGRAPHICS: OptionalDemographicsInput = {
  gender: "",
  gender_at_birth: "",
  sexual_identity: "",
  postcode: "",
  state: "",
  country: "",
  relationship_status: "",
  living_circumstances: "",
  support_level: "",
  has_supportive_adult: "",
  employed: "",
  employment_status: "",
  currently_studying: "",
  has_disability: "",
  nature_of_disability: "",
  assistance_needed: "",
  prescription_medication: "",
  previous_counseling_types: "",
};

const OPTIONAL_DEMOGRAPHICS_FIELDS: OptionalDemographicsFieldMeta[] = [
  { key: "gender", label: "Gender", input: "text", options: GENDER_OPTIONS },
  { key: "gender_at_birth", label: "Gender At Birth", input: "text", options: GENDER_AT_BIRTH_OPTIONS },
  { key: "sexual_identity", label: "Sexual Identity", input: "text", options: SEXUAL_IDENTITY_OPTIONS },
  { key: "postcode", label: "Postcode", input: "text" },
  { key: "state", label: "State", input: "text", options: AUSTRALIAN_STATE_OPTIONS },
  { key: "country", label: "Country", input: "text", options: COUNTRY_OPTIONS },
  {
    key: "relationship_status",
    label: "Relationship Status",
    input: "text",
    options: RELATIONSHIP_STATUS_OPTIONS,
  },
  {
    key: "living_circumstances",
    label: "Living Circumstances",
    input: "text",
    options: LIVING_CIRCUMSTANCES_OPTIONS,
  },
  { key: "support_level", label: "Support Level", input: "text", options: SUPPORT_LEVEL_OPTIONS },
  { key: "has_supportive_adult", label: "Has Supportive Adult", input: "boolean" },
  { key: "employed", label: "Employed", input: "boolean" },
  { key: "employment_status", label: "Employment Status", input: "text", options: EMPLOYMENT_STATUS_OPTIONS },
  { key: "currently_studying", label: "Currently Studying", input: "boolean" },
  { key: "has_disability", label: "Has Disability", input: "boolean" },
  {
    key: "nature_of_disability",
    label: "Nature Of Disability",
    input: "text",
    options: NATURE_OF_DISABILITY_OPTIONS,
  },
  { key: "assistance_needed", label: "Assistance Needed", input: "text", options: ASSISTANCE_NEEDED_OPTIONS },
  { key: "prescription_medication", label: "Prescription Medication", input: "text" },
  {
    key: "previous_counseling_types",
    label: "Previous Counseling Types",
    input: "text",
    options: PREVIOUS_COUNSELING_TYPE_OPTIONS,
    helperText: "Select one counseling type here. Use JSON override for multiple values.",
  },
];

const DEFAULT_CLIENT_DEMOGRAPHICS = {
  age: 30,
  gender: "Female",
  genderAtBirth: "Female",
  sexualIdentity: "Heterosexual",
  state: "NSW",
  postcode: "2000",
  country: "AU",
  context: "",
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const getErrorMessage = async (response: Response, fallback: string) => {
  const text = await response.text().catch(() => "");
  return text || fallback;
};

const getExpectedSequenceFromError = (errorPayload: string): number | null => {
  const extractFromText = (text: string) => {
    const match = text.match(/expected\s+(\d+)\s*,\s*got\s+\d+/i);
    return match ? Number(match[1]) : null;
  };

  try {
    const parsed = JSON.parse(errorPayload) as { detail?: string };
    if (typeof parsed.detail === "string") {
      return extractFromText(parsed.detail);
    }
  } catch {
    return extractFromText(errorPayload);
  }

  return extractFromText(errorPayload);
};

export default function MiaAudioTestBenchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptionPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldFinalizeOnStopRef = useRef(false);
  const sequenceNumberRef = useRef(0);
  const didHydrateFromUrlRef = useRef(false);

  const [proxyToken, setProxyToken] = useState("");
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");
  const [isLoadingAudioInputs, setIsLoadingAudioInputs] = useState(false);
  const [environmentOptions, setEnvironmentOptions] = useState<EnvironmentOption[]>(DEFAULT_ENVIRONMENT_OPTIONS);
  const [selectedEnvironment, setSelectedEnvironment] = useState<MiaEnvironment>("local");
  const [sessionMode, setSessionMode] = useState<SessionMode>("audio");
  const [clientAge, setClientAge] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.age);
  const [clientOptionalDemographics, setClientOptionalDemographics] = useState<OptionalDemographicsInput>(
    EMPTY_OPTIONAL_DEMOGRAPHICS,
  );
  const [clientAssessmentsJson, setClientAssessmentsJson] = useState("");
  const [clientEventsJson, setClientEventsJson] = useState("");
  const [clientNotesJson, setClientNotesJson] = useState("");
  const [clientGoalsJson, setClientGoalsJson] = useState("");
  const [clientContextOverrideJson, setClientContextOverrideJson] = useState("");
  const [enableGuidance, setEnableGuidance] = useState(true);
  const [guidanceIntervalSeconds, setGuidanceIntervalSeconds] = useState(10);
  const [draftClientAge, setDraftClientAge] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.age);
  const [draftClientOptionalDemographics, setDraftClientOptionalDemographics] = useState<OptionalDemographicsInput>(
    EMPTY_OPTIONAL_DEMOGRAPHICS,
  );
  const [draftClientAssessmentsJson, setDraftClientAssessmentsJson] = useState("");
  const [draftClientEventsJson, setDraftClientEventsJson] = useState("");
  const [draftClientNotesJson, setDraftClientNotesJson] = useState("");
  const [draftClientGoalsJson, setDraftClientGoalsJson] = useState("");
  const [draftClientContextOverrideJson, setDraftClientContextOverrideJson] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [isClientContextModalOpen, setIsClientContextModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const [fileSendProgress, setFileSendProgress] = useState("");
  const [fileChunkSizeKb, setFileChunkSizeKb] = useState(240);
  const [fileChunkDelayMs, setFileChunkDelayMs] = useState(15000);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [finalizeOnStop, setFinalizeOnStop] = useState(true);

  const [sequenceNumber, setSequenceNumber] = useState(0);
  const [lastSequenceProcessed, setLastSequenceProcessed] = useState<number | null>(null);
  const [lastModifiedDateUtc, setLastModifiedDateUtc] = useState("");
  const [nextExpectedSequence, setNextExpectedSequence] = useState<number | null>(null);
  const [summaryNotes, setSummaryNotes] = useState("");
  const [promptQuestions, setPromptQuestions] = useState<string[]>([]);
  const [knowns, setKnowns] = useState<string[]>([]);
  const [unknowns, setUnknowns] = useState<string[]>([]);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [assessmentMessage, setAssessmentMessage] = useState<string>("");
  const [whyThisQuestion, setWhyThisQuestion] = useState<string>("");
  const [kbEvidence, setKbEvidence] = useState<string[]>([]);
  const [kbEvidenceSources, setKbEvidenceSources] = useState<string[]>([]);
  const [feedbackScores, setFeedbackScores] = useState<FeedbackScores>(createDefaultFeedbackScores);
  const [feedbackRationales, setFeedbackRationales] = useState<FeedbackRationales>(createDefaultFeedbackRationales);
  const [liveTranscription, setLiveTranscription] = useState<string>("");
  const [oodaReasoning, setOodaReasoning] = useState<string>("");
  const [status, setStatus] = useState("IDLE");

  // Response timer (end-to-end: chunk upload → scores arrive)
  const processingStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [lastResponseMs, setLastResponseMs] = useState<number | null>(null);
  const prevLastModifiedRef = useRef<string>("");
  // Server-side timing breakdown from the API
  const [lastTranscriptionMs, setLastTranscriptionMs] = useState<number | null>(null);
  const [lastLlmMs, setLastLlmMs] = useState<number | null>(null);
  // OODA stage quality scores (1-5)
  const [observeScore, setObserveScore] = useState<number | null>(null);
  const [orientScore, setOrientScore] = useState<number | null>(null);
  const [decideScore, setDecideScore] = useState<number | null>(null);
  const [sessionSummary, setSessionSummary] = useState("");
  const [sessionAssumptions, setSessionAssumptions] = useState<string[]>([]);
  const [sessionMissingInformation, setSessionMissingInformation] = useState<string[]>([]);
  const [sessionFailureReason, setSessionFailureReason] = useState("");
  // Rich session fields
  const [sessionRiskRating, setSessionRiskRating] = useState<string | null>(null);
  const [sessionRiskScore, setSessionRiskScore] = useState<number | null>(null);
  const [sessionRisk, setSessionRisk] = useState<string | null>(null);
  const [sessionInferences, setSessionInferences] = useState<string | null>(null);
  const [sessionDifferentialDiagnosis, setSessionDifferentialDiagnosis] = useState<string | null>(null);
  const [sessionRootCause, setSessionRootCause] = useState<string | null>(null);
  const [sessionPrognosis, setSessionPrognosis] = useState<string | null>(null);
  const [sessionInterventions, setSessionInterventions] = useState<string | null>(null);
  const [sessionKeyInsights, setSessionKeyInsights] = useState<string[]>([]);
  const [sessionTreatmentGoals, setSessionTreatmentGoals] = useState<string[]>([]);
  const [sessionFirstLineTreatment, setSessionFirstLineTreatment] = useState<string[]>([]);
  const [sessionSecondLineTreatment, setSessionSecondLineTreatment] = useState<string[]>([]);
  const [sessionFurtherAssessment, setSessionFurtherAssessment] = useState<string[]>([]);
  const [sessionDomainScores, setSessionDomainScores] = useState<{
    risk: number | null; riskReasons: string[];
    functioning: number | null; functioningReasons: string[];
    comorbidity: number | null; comorbidityReasons: string[];
    physicalHealth: number | null; physicalHealthReasons: string[];
    illnessType: number | null; illnessTypeReasons: string[];
  } | null>(null);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([]);
  const [isFetchingTranscription, setIsFetchingTranscription] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState("");
  const [awaitingReadyTranscription, setAwaitingReadyTranscription] = useState(false);
  const [isSessionEditModalOpen, setIsSessionEditModalOpen] = useState(false);
  const [sessionEditNotes, setSessionEditNotes] = useState("");
  const [isUpdatingSession, setIsUpdatingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasSession = sessionId.trim().length > 0;
  const selectedOptionalDemographicsCount = useMemo(
    () =>
      OPTIONAL_DEMOGRAPHICS_FIELDS.reduce((count, field) => {
        const value = clientOptionalDemographics[field.key];
        return value ? count + 1 : count;
      }, 0),
    [clientOptionalDemographics],
  );
  const hasClientContextOverride = clientContextOverrideJson.trim().length > 0;

  const clearSession = () => {
    stopPolling();
    stopTranscriptionPolling();
    setSessionId("");
    persistSessionInUrl("", selectedEnvironment);
    syncSequenceNumber(0);
    setLastSequenceProcessed(null);
    setLastModifiedDateUtc("");
    setNextExpectedSequence(null);
    setSummaryNotes("");
    setPromptQuestions([]);
    setFeedbackScores(createDefaultFeedbackScores());
    setFeedbackRationales(createDefaultFeedbackRationales());
    setLiveTranscription("");
    setOodaReasoning("");
    setSessionSummary("");
    setSessionAssumptions([]);
    setSessionMissingInformation([]);
    setSessionFailureReason("");
    setSessionRiskRating(null);
    setSessionRiskScore(null);
    setSessionRisk(null);
    setSessionInferences(null);
    setSessionDifferentialDiagnosis(null);
    setSessionRootCause(null);
    setSessionPrognosis(null);
    setSessionInterventions(null);
    setSessionKeyInsights([]);
    setSessionTreatmentGoals([]);
    setSessionFirstLineTreatment([]);
    setSessionSecondLineTreatment([]);
    setSessionFurtherAssessment([]);
    setSessionDomainScores(null);
    setTranscriptionText("");
    setTranscriptionSegments([]);
    setTranscriptionError("");
    setAwaitingReadyTranscription(false);
    setStatus("IDLE");
    setErrorMessage("");
    setFileSendProgress("");
    setIsSendingFile(false);
    setElapsedMs(null);
    setLastResponseMs(null);
    setLastTranscriptionMs(null);
    setLastLlmMs(null);
    setObserveScore(null);
    setOrientScore(null);
    setDecideScore(null);
    setKbEvidence([]);
    setKbEvidenceSources([]);
    processingStartTimeRef.current = null;
    prevLastModifiedRef.current = "";
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };
  const transcriptionAvailable = status === "COMPLETED";
  const isAudioMode = sessionMode === "audio";

  const headers = useMemo<HeadersInit>(
    () => ({
      ...(proxyToken.trim() ? { "x-mia-token": proxyToken.trim() } : {}),
      "x-mia-environment": selectedEnvironment,
    }),
    [proxyToken, selectedEnvironment],
  );

  const buildUrl = (path: string) => {
    return `${PROXY_BASE_PATH}${path}`;
  };

  const syncSequenceNumber = (nextSequence: number) => {
    sequenceNumberRef.current = nextSequence;
    setSequenceNumber(nextSequence);
  };

  const persistSessionInUrl = useCallback(
    (nextSessionId: string, environment: MiaEnvironment) => {
      const params = new URLSearchParams();

      if (nextSessionId.trim()) {
        params.set("sessionId", nextSessionId.trim());
        params.set("env", environment);
      }

      const query = params.toString();
      router.replace(query ? `/mia-audio-test-bench?${query}` : "/mia-audio-test-bench");
    },
    [router],
  );

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const stopTranscriptionPolling = () => {
    if (transcriptionPollingRef.current) {
      clearInterval(transcriptionPollingRef.current);
      transcriptionPollingRef.current = null;
    }
  };

  const openClientContextModal = () => {
    setDraftClientAge(clientAge);
    setDraftClientOptionalDemographics(clientOptionalDemographics);
    setDraftClientAssessmentsJson(clientAssessmentsJson);
    setDraftClientEventsJson(clientEventsJson);
    setDraftClientNotesJson(clientNotesJson);
    setDraftClientGoalsJson(clientGoalsJson);
    setDraftClientContextOverrideJson(clientContextOverrideJson);
    setIsClientContextModalOpen(true);
  };

  const closeClientContextModal = () => {
    setIsClientContextModalOpen(false);
  };

  const saveClientContext = () => {
    setClientAge(Number.isFinite(draftClientAge) ? Math.max(0, draftClientAge) : 0);
    setClientOptionalDemographics(draftClientOptionalDemographics);
    setClientAssessmentsJson(draftClientAssessmentsJson.trim());
    setClientEventsJson(draftClientEventsJson.trim());
    setClientNotesJson(draftClientNotesJson.trim());
    setClientGoalsJson(draftClientGoalsJson.trim());
    setClientContextOverrideJson(draftClientContextOverrideJson.trim());
    setIsClientContextModalOpen(false);
  };

  const openSessionEditModal = () => {
    setSessionEditNotes("");
    setIsSessionEditModalOpen(true);
  };

  const closeSessionEditModal = useCallback(() => {
    if (isUpdatingSession) {
      return;
    }
    setIsSessionEditModalOpen(false);
  }, [isUpdatingSession]);

  const loadAudioInputs = useCallback(async () => {
    setIsLoadingAudioInputs(true);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((device) => device.kind === "audioinput");
      setAudioInputs(inputs);

      setSelectedAudioInputId((previousId) => {
        if (!previousId && inputs.length > 0) {
          return inputs[0].deviceId;
        }

        if (previousId && !inputs.some((input) => input.deviceId === previousId)) {
          return inputs[0]?.deviceId ?? "";
        }

        return previousId;
      });
    } catch {
      setErrorMessage("Could not load microphone devices.");
    } finally {
      setIsLoadingAudioInputs(false);
    }
  }, []);

  const fetchTranscription = useCallback(
    async (currentSessionId: string, silentIfNotReady = false) => {
      if (!currentSessionId) {
        return;
      }

      setIsFetchingTranscription(true);
      setTranscriptionError("");

      try {
        const response = await fetch(buildUrl(`/v1/mia/sessions/${currentSessionId}/transcription`), {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          if (silentIfNotReady) {
            return;
          }
          throw new Error(await getErrorMessage(response, "Failed to fetch transcription."));
        }

        const data = (await response.json()) as TranscriptionResponse;
        setTranscriptionSegments(Array.isArray(data.segments) ? data.segments : []);
        setTranscriptionText(typeof data.summary === "string" ? data.summary : "");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch transcription.";
        setTranscriptionError(message);
      } finally {
        setIsFetchingTranscription(false);
      }
    },
    [headers],
  );

  const startTranscriptionPolling = useCallback(
    (currentSessionId: string) => {
      stopTranscriptionPolling();
      void fetchTranscription(currentSessionId, true);
      transcriptionPollingRef.current = setInterval(() => {
        void fetchTranscription(currentSessionId, true);
      }, POLLING_INTERVAL_MS);
    },
    [fetchTranscription],
  );

  const pollFeedbackAndSessionInfo = useCallback(async (currentSessionId: string) => {
    if (!currentSessionId) {
      return null;
    }

    try {
      const [feedbackRes, sessionInfoRes] = await Promise.all([
        fetch(buildUrl(`/v1/mia/sessions/${currentSessionId}/feedback`), {
          method: "GET",
          headers,
        }),
        fetch(buildUrl(`/v1/mia/sessions/${currentSessionId}`), {
          method: "GET",
          headers,
        }),
      ]);

      if (feedbackRes.ok) {
        const feedback = (await feedbackRes.json()) as FeedbackResponse;
        if (typeof feedback.summary_notes === "string") {
          setSummaryNotes(feedback.summary_notes);
        }
        if (Array.isArray(feedback.prompt_questions)) {
          setPromptQuestions(feedback.prompt_questions);
        }
        if (Array.isArray(feedback.knowns)) setKnowns(feedback.knowns);
        if (Array.isArray(feedback.unknowns)) setUnknowns(feedback.unknowns);
        if (Array.isArray(feedback.assumptions)) setAssumptions(feedback.assumptions);
        if (typeof feedback.assessment_message === "string") setAssessmentMessage(feedback.assessment_message);
        if (typeof feedback.why_this_question === "string") setWhyThisQuestion(feedback.why_this_question);
        if (Array.isArray(feedback.kb_evidence)) setKbEvidence(feedback.kb_evidence);
        if (Array.isArray(feedback.kb_evidence_sources)) setKbEvidenceSources(feedback.kb_evidence_sources);
        if (typeof feedback.last_sequence_processed === "number") {
          setLastSequenceProcessed(feedback.last_sequence_processed);
        }
        if (typeof feedback.last_modified_date_utc === "string") {
          setLastModifiedDateUtc(feedback.last_modified_date_utc);
        }
        if (typeof feedback.next_expected_sequence === "number") {
          setNextExpectedSequence(feedback.next_expected_sequence);
        }

        setFeedbackScores({
          illness_type_stage_and_trajectory_score:
            typeof feedback.illness_type_stage_and_trajectory_score === "number"
              ? feedback.illness_type_stage_and_trajectory_score
              : null,
          suicidal_thoughts_and_behaviours_score:
            typeof feedback.suicidal_thoughts_and_behaviours_score === "number"
              ? feedback.suicidal_thoughts_and_behaviours_score
              : null,
          social_and_occupational_functioning_score:
            typeof feedback.social_and_occupational_functioning_score === "number"
              ? feedback.social_and_occupational_functioning_score
              : null,
          alcohol_and_substance_misuse_score:
            typeof feedback.alcohol_and_substance_misuse_score === "number"
              ? feedback.alcohol_and_substance_misuse_score
              : null,
          physical_health_score:
            typeof feedback.physical_health_score === "number" ? feedback.physical_health_score : null,
        });
        setFeedbackRationales({
          illness_type_stage_and_trajectory_rationale:
            typeof feedback.illness_type_stage_and_trajectory_rationale === "string"
              ? feedback.illness_type_stage_and_trajectory_rationale
              : null,
          suicidal_thoughts_and_behaviours_rationale:
            typeof feedback.suicidal_thoughts_and_behaviours_rationale === "string"
              ? feedback.suicidal_thoughts_and_behaviours_rationale
              : null,
          social_and_occupational_functioning_rationale:
            typeof feedback.social_and_occupational_functioning_rationale === "string"
              ? feedback.social_and_occupational_functioning_rationale
              : null,
          alcohol_and_substance_misuse_rationale:
            typeof feedback.alcohol_and_substance_misuse_rationale === "string"
              ? feedback.alcohol_and_substance_misuse_rationale
              : null,
          physical_health_rationale:
            typeof feedback.physical_health_rationale === "string" ? feedback.physical_health_rationale : null,
        });
        if (typeof feedback.audio_transcription === "string" && feedback.audio_transcription) {
          setLiveTranscription(feedback.audio_transcription);
        }
        if (typeof feedback.ooda_reasoning === "string" && feedback.ooda_reasoning) {
          setOodaReasoning(feedback.ooda_reasoning);
        }
        // Stop timer when a new scored response arrives
        if (
          typeof feedback.last_modified_date_utc === "string" &&
          feedback.last_modified_date_utc &&
          feedback.last_modified_date_utc !== prevLastModifiedRef.current
        ) {
          if (processingStartTimeRef.current !== null) {
            const elapsed = Date.now() - processingStartTimeRef.current;
            setLastResponseMs(elapsed);
          }
          setElapsedMs(null);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          processingStartTimeRef.current = null;
          prevLastModifiedRef.current = feedback.last_modified_date_utc;
          // Capture server-side breakdown
          if (typeof feedback.transcription_ms === "number") setLastTranscriptionMs(feedback.transcription_ms);
          if (typeof feedback.llm_ms === "number") setLastLlmMs(feedback.llm_ms);
          if (typeof feedback.observe_score === "number") setObserveScore(feedback.observe_score);
          if (typeof feedback.orient_score === "number") setOrientScore(feedback.orient_score);
          if (typeof feedback.decide_score === "number") setDecideScore(feedback.decide_score);
        }
      }

      if (sessionInfoRes.ok) {
        const info = (await sessionInfoRes.json()) as SessionInfoResponse;
        const nextStatus = info.status ?? "UNKNOWN";
        setStatus(nextStatus);
        setSessionSummary(typeof info.summary === "string" ? info.summary : "");
        setSessionAssumptions(Array.isArray(info.assumptions) ? info.assumptions : []);
        setSessionMissingInformation(Array.isArray(info.missing_information) ? info.missing_information : []);
        setSessionFailureReason(typeof info.failure_reason === "string" ? info.failure_reason : "");
        setSessionRiskRating(info.suicidality_risk_rating ?? null);
        setSessionRiskScore(info.risk_score ?? null);
        setSessionRisk(info.risk ?? null);
        setSessionInferences(info.inferences ?? null);
        setSessionDifferentialDiagnosis(info.differential_diagnosis ?? null);
        setSessionRootCause(info.root_cause ?? null);
        setSessionPrognosis(info.prognosis ?? null);
        setSessionInterventions(info.interventions ?? null);
        setSessionKeyInsights(Array.isArray(info.key_insights) ? info.key_insights : []);
        setSessionTreatmentGoals(Array.isArray(info.likely_treatment_goals) ? info.likely_treatment_goals : []);
        setSessionFirstLineTreatment(Array.isArray(info.first_line_treatment) ? info.first_line_treatment : []);
        setSessionSecondLineTreatment(Array.isArray(info.second_line_treatment) ? info.second_line_treatment : []);
        setSessionFurtherAssessment(Array.isArray(info.further_assessment_steps) ? info.further_assessment_steps : []);
        if (
          info.risk_assessment_score !== undefined ||
          info.functioning_score !== undefined ||
          info.illness_type_score !== undefined
        ) {
          setSessionDomainScores({
            risk: info.risk_assessment_score ?? null,
            riskReasons: Array.isArray(info.risk_assessment_score_reason) ? info.risk_assessment_score_reason : [],
            functioning: info.functioning_score ?? null,
            functioningReasons: Array.isArray(info.functioning_score_reason) ? info.functioning_score_reason : [],
            comorbidity: info.comorbidity_score ?? null,
            comorbidityReasons: Array.isArray(info.comorbidity_score_reason) ? info.comorbidity_score_reason : [],
            physicalHealth: info.physical_health_score ?? null,
            physicalHealthReasons: Array.isArray(info.physical_health_score_reason) ? info.physical_health_score_reason : [],
            illnessType: info.illness_type_score ?? null,
            illnessTypeReasons: Array.isArray(info.illness_type_score_reason) ? info.illness_type_score_reason : [],
          });
        }

        if (nextStatus === "COMPLETED") {
          if (awaitingReadyTranscription && !isFetchingTranscription) {
            setAwaitingReadyTranscription(false);
            void fetchTranscription(currentSessionId);
          }
          stopPolling();
          stopTranscriptionPolling();
        } else if (nextStatus === "ERROR") {
          setAwaitingReadyTranscription(false);
          stopPolling();
          stopTranscriptionPolling();
        }

        return nextStatus;
      }

      return null;
    } catch {
      setErrorMessage("Polling failed. Check network/API availability.");
      return null;
    }
  }, [awaitingReadyTranscription, fetchTranscription, headers, isFetchingTranscription]);

  const pollUntilSessionUpdated = async (currentSessionId: string) => {
    let sawNonCompletedStatus = false;

    for (let attempt = 0; attempt < SESSION_UPDATE_MAX_POLLS; attempt += 1) {
      const nextStatus = await pollFeedbackAndSessionInfo(currentSessionId);

      if (nextStatus && nextStatus !== "COMPLETED") {
        sawNonCompletedStatus = true;
      }

      if (nextStatus === "COMPLETED" && (sawNonCompletedStatus || attempt > 0)) {
        return true;
      }

      await sleep(POLLING_INTERVAL_MS);
    }

    return false;
  };

  const submitSessionNotesUpdate = async (
    currentSessionId: string,
    notes: string,
    fallbackMessage: string,
  ) => {
    const response = await fetch(buildUrl(`/v1/mia/sessions/${currentSessionId}`), {
      method: "PUT",
      headers: {
        ...headers,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        notes,
      }),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, fallbackMessage));
    }

    setStatus("THINKING");
    return pollUntilSessionUpdated(currentSessionId);
  };

  const updateSessionInformation = async () => {
    if (!hasSession || !sessionEditNotes.trim()) {
      return;
    }

    setIsUpdatingSession(true);
    setErrorMessage("");

    try {
      const didComplete = await submitSessionNotesUpdate(
        sessionId,
        sessionEditNotes.trim(),
        "Failed to update session information.",
      );
      if (!didComplete) {
        setErrorMessage("Session update is taking longer than expected. Polling will continue when manually refreshed.");
      }

      setIsSessionEditModalOpen(false);
      setSessionEditNotes("");
      void pollFeedbackAndSessionInfo(sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update session information.";
      setErrorMessage(message);
    } finally {
      setIsUpdatingSession(false);
    }
  };

  const startPolling = useCallback((currentSessionId: string) => {
    stopPolling();
    void pollFeedbackAndSessionInfo(currentSessionId);
    pollingRef.current = setInterval(() => {
      void pollFeedbackAndSessionInfo(currentSessionId);
    }, POLLING_INTERVAL_MS);
  }, [pollFeedbackAndSessionInfo]);

  const uploadAudioChunk = async (blob: Blob, isFinalChunk: boolean) => {
    if (!hasSession) {
      return;
    }

    const sendChunk = async (sequence: number) => {
      const formData = new FormData();
      formData.append("audio", blob, `chunk-${sequence}.webm`);
      formData.append("sequence_number", String(sequence));
      formData.append("is_final_chunk", String(isFinalChunk));

      const response = await fetch(buildUrl(`/v1/mia/sessions/${sessionId}/audio`), {
        method: "POST",
        headers,
        body: formData,
      });

      return response;
    };

    let currentSequence = sequenceNumberRef.current;

    setIsUploading(true);
    try {
      let response = await sendChunk(currentSequence);

      if (!response.ok) {
        const errorText = await getErrorMessage(response, "Upload failed");
        const expectedSequence = getExpectedSequenceFromError(errorText);

        if (typeof expectedSequence === "number" && expectedSequence !== currentSequence) {
          syncSequenceNumber(expectedSequence);
          currentSequence = expectedSequence;
          response = await sendChunk(currentSequence);
        } else {
          throw new Error(errorText);
        }
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Upload failed"));
      }

      const upload = (await response.json().catch(() => ({}))) as UploadResponse;
      if (typeof upload.last_sequence_processed === "number") {
        setLastSequenceProcessed(upload.last_sequence_processed);
      }

      if (isFinalChunk) {
        setAwaitingReadyTranscription(true);
        setTranscriptionError("");
        startPolling(sessionId);
        startTranscriptionPolling(sessionId);
      }

      // Start/restart timer on every chunk if not already running
      if (processingStartTimeRef.current === null) {
        processingStartTimeRef.current = Date.now();
        setElapsedMs(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          if (processingStartTimeRef.current !== null) {
            setElapsedMs(Date.now() - processingStartTimeRef.current);
          }
        }, 100);
      }

      syncSequenceNumber(currentSequence + 1);
      setErrorMessage("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrorMessage(`Audio upload failed for sequence ${currentSequence}: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const sendAudioFile = async (file: File) => {
    if (!hasSession) {
      setErrorMessage("Start a session before sending a file.");
      return;
    }

    const CHUNK_SIZE_BYTES = fileChunkSizeKb * 1024;
    const INTER_CHUNK_DELAY_MS = fileChunkDelayMs;

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);

    setIsSendingFile(true);
    setErrorMessage("");
    syncSequenceNumber(0);

    // Start polling immediately — same as live recording
    startPolling(sessionId);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE_BYTES;
        const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
        const chunk = file.slice(start, end, file.type || "audio/webm");
        const isFinalChunk = i === totalChunks - 1;

        setFileSendProgress(`Chunk ${i + 1} / ${totalChunks}`);
        await uploadAudioChunk(chunk, isFinalChunk);

        if (!isFinalChunk) {
          await sleep(INTER_CHUNK_DELAY_MS);
        }
      }

      setFileSendProgress("All chunks sent.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "File send failed.";
      setErrorMessage(message);
    } finally {
      setIsSendingFile(false);
      setTimeout(() => setFileSendProgress(""), 3000);
    }
  };

  const startSession = async () => {
    setIsStartingSession(true);
    setErrorMessage("");

    try {
      if (sessionMode === "text" && !clinicalNotes.trim()) {
        throw new Error("Text mode requires clinical notes.");
      }

      const normalizedAge = Number.isFinite(clientAge) ? Math.trunc(clientAge) : Number.NaN;
      const normalizedClinicalNotes = clinicalNotes.trim();
      const normalizedContextOverride = clientContextOverrideJson.trim();

      if (!Number.isFinite(normalizedAge) || normalizedAge < 5 || normalizedAge > 120) {
        throw new Error(
          "Client context requires a valid demographics.age value between 5 and 120 in the Client Context modal.",
        );
      }

      const parseOptionalArrayJson = (fieldLabel: string, value: string, maxLength?: number) => {
        const normalizedValue = value.trim();
        if (!normalizedValue) {
          return undefined;
        }

        let parsedValue: unknown;
        try {
          parsedValue = JSON.parse(normalizedValue);
        } catch {
          throw new Error(`${fieldLabel} must be valid JSON.`);
        }

        if (!Array.isArray(parsedValue)) {
          throw new Error(`${fieldLabel} must be a JSON array.`);
        }

        if (typeof maxLength === "number" && parsedValue.length > maxLength) {
          throw new Error(`${fieldLabel} exceeds max length ${maxLength}.`);
        }

        return parsedValue;
      };

      let clientContextPayload: Record<string, unknown>;

      if (normalizedContextOverride) {
        let parsedOverride: unknown;
        try {
          parsedOverride = JSON.parse(normalizedContextOverride);
        } catch {
          throw new Error("Client context override must be valid JSON.");
        }

        if (!parsedOverride || typeof parsedOverride !== "object" || Array.isArray(parsedOverride)) {
          throw new Error("Client context override must be a JSON object.");
        }

        clientContextPayload = parsedOverride as Record<string, unknown>;
      } else {
        const demographics: Record<string, unknown> = {
          age: normalizedAge,
        };

        for (const field of OPTIONAL_DEMOGRAPHICS_FIELDS) {
          const fieldValue = clientOptionalDemographics[field.key];

          if (field.input === "boolean") {
            if (fieldValue === "true") {
              demographics[field.key] = true;
            }
            if (fieldValue === "false") {
              demographics[field.key] = false;
            }
            continue;
          }

          const normalizedValue = fieldValue.trim();
          if (!normalizedValue) {
            continue;
          }

          if (field.key === "previous_counseling_types") {
            const counselingTypes = normalizedValue.includes(",")
              ? normalizedValue
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean)
              : [normalizedValue];

            if (counselingTypes.length > 0) {
              demographics[field.key] = counselingTypes;
            }
            continue;
          }

          demographics[field.key] = normalizedValue;
        }

        const assessments = parseOptionalArrayJson("Client context assessments", clientAssessmentsJson, 1);
        const events = parseOptionalArrayJson("Client context events", clientEventsJson, 10);
        const notes = parseOptionalArrayJson("Client context notes", clientNotesJson, 10);
        const goals = parseOptionalArrayJson("Client context goals", clientGoalsJson, 10);

        clientContextPayload = {
          demographics,
          ...(assessments ? { assessments } : {}),
          ...(events ? { events } : {}),
          ...(notes ? { notes } : {}),
          ...(goals ? { goals } : {}),
        };
      }

      const payload: {
        mode: SessionMode;
        enable_guidance: boolean;
        guidance_interval_seconds?: number;
        clinical_notes?: string;
        client_context: Record<string, unknown>;
      } = {
        mode: sessionMode,
        enable_guidance: isAudioMode ? enableGuidance : false,
        ...(isAudioMode && enableGuidance ? { guidance_interval_seconds: guidanceIntervalSeconds } : {}),
        client_context: clientContextPayload,
      };

      if (normalizedClinicalNotes) {
        payload.clinical_notes = normalizedClinicalNotes;
      }

      const response = await fetch(buildUrl("/v1/mia/sessions"), {
        method: "POST",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Session start failed"));
      }

      const data = (await response.json()) as SessionResponse;
      setSessionId(data.session_id);
      persistSessionInUrl(data.session_id, selectedEnvironment);
      syncSequenceNumber(0);
      setLastSequenceProcessed(null);
      setLastModifiedDateUtc("");
      setNextExpectedSequence(null);
      setSummaryNotes("");
      setPromptQuestions([]);
      setFeedbackScores(createDefaultFeedbackScores());
      setFeedbackRationales(createDefaultFeedbackRationales());
      setLiveTranscription("");
      setOodaReasoning("");
      setSessionSummary("");
      setSessionAssumptions([]);
      setSessionMissingInformation([]);
      setSessionFailureReason("");
      setSessionRiskRating(null);
      setSessionRiskScore(null);
      setSessionRisk(null);
      setSessionInferences(null);
      setSessionDifferentialDiagnosis(null);
      setSessionRootCause(null);
      setSessionPrognosis(null);
      setSessionInterventions(null);
      setSessionKeyInsights([]);
      setSessionTreatmentGoals([]);
      setSessionFirstLineTreatment([]);
      setSessionSecondLineTreatment([]);
      setSessionFurtherAssessment([]);
      setSessionDomainScores(null);
      setTranscriptionText("");
      setTranscriptionSegments([]);
      setTranscriptionError("");
      setAwaitingReadyTranscription(false);
      stopTranscriptionPolling();
      setStatus("INITIALISING");
      setErrorMessage("");
      void pollFeedbackAndSessionInfo(data.session_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create session.";
      setErrorMessage(message);
    } finally {
      setIsStartingSession(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }

    shouldFinalizeOnStopRef.current = finalizeOnStop;
    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setIsRecording(false);

    if (finalizeOnStop) {
      setAwaitingReadyTranscription(true);
      setStatus("THINKING");
      startPolling(sessionId);
    } else {
      stopPolling();
    }
  };

  const startRecording = async () => {
    if (!isAudioMode) {
      setErrorMessage("Recording is only available for audio mode sessions.");
      return;
    }

    if (!hasSession) {
      setErrorMessage("Start a session before recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedAudioInputId ? { deviceId: { exact: selectedAudioInputId } } : true,
      });
      mediaStreamRef.current = stream;

      void loadAudioInputs();

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (!event.data || event.data.size === 0) {
          return;
        }

        const isFinalChunk = shouldFinalizeOnStopRef.current;
        if (isFinalChunk) {
          shouldFinalizeOnStopRef.current = false;
        }

        void uploadAudioChunk(event.data, isFinalChunk);
      };

      recorder.onstop = () => {
        setStatus("THINKING");
      };

      recorder.start(RECORDING_TIMESLICE_MS);
      setIsRecording(true);
      setErrorMessage("");
      startPolling(sessionId);
    } catch {
      setErrorMessage("Microphone access failed.");
    }
  };

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
    void loadAudioInputs();

    return () => {
      stopPolling();
      stopTranscriptionPolling();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [loadAudioInputs]);

  useEffect(() => {
    if (!isClientContextModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeClientContextModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isClientContextModalOpen]);

  useEffect(() => {
    if (!isSessionEditModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSessionEditModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSessionEditModalOpen, closeSessionEditModal]);

  useEffect(() => {
    sessionStorage.setItem("miaAudioBench.environment", selectedEnvironment);
    sessionStorage.setItem("miaAudioBench.proxyToken", proxyToken);
  }, [selectedEnvironment, proxyToken]);

  useEffect(() => {
    if (!sessionId.trim()) {
      return;
    }

    sessionStorage.setItem("miaAudioBench.sessionId", sessionId.trim());
  }, [sessionId]);

  useEffect(() => {
    if (didHydrateFromUrlRef.current) {
      return;
    }

    // Restore environment and proxy token from URL or sessionStorage
    const envFromUrl = searchParams.get("env")?.trim() as MiaEnvironment | undefined;
    const envFromStorage = sessionStorage.getItem("miaAudioBench.environment")?.trim() as MiaEnvironment | undefined;
    const envToHydrate = envFromUrl || envFromStorage;
    if (envToHydrate === "local" || envToHydrate === "staging" || envToHydrate === "production") {
      setSelectedEnvironment(envToHydrate);
    }

    const tokenFromStorage = sessionStorage.getItem("miaAudioBench.proxyToken");
    if (typeof tokenFromStorage === "string") {
      setProxyToken(tokenFromStorage);
    }

    const sessionIdFromUrl = searchParams.get("sessionId")?.trim();
    const sessionIdFromStorage = sessionStorage.getItem("miaAudioBench.sessionId")?.trim();
    const sessionIdToHydrate = sessionIdFromUrl || sessionIdFromStorage;

    if (!sessionIdToHydrate) {
      didHydrateFromUrlRef.current = true;
      return;
    }

    didHydrateFromUrlRef.current = true;
    setSessionId(sessionIdToHydrate);

    const resolvedEnv = (envToHydrate === "local" || envToHydrate === "staging" || envToHydrate === "production")
      ? envToHydrate
      : "local";
    persistSessionInUrl(sessionIdToHydrate, resolvedEnv);
    setErrorMessage("");
    setStatus("INITIALISING");
    startPolling(sessionIdToHydrate);
  }, [persistSessionInUrl, searchParams, startPolling]);

  useEffect(() => {
    if (!isAudioMode) {
      setEnableGuidance(false);
      setFinalizeOnStop(false);
    }
  }, [isAudioMode]);

  useEffect(() => {
    if (!hasSession || !sessionId) {
      return;
    }

    if (status === "THINKING" || status === "WAITING_FOR_AUDIO") {
      if (!pollingRef.current) {
        startPolling(sessionId);
      }
      return;
    }

    if (status === "COMPLETED" || status === "ERROR") {
      stopPolling();
      return;
    }

    if (!awaitingReadyTranscription) {
      stopPolling();
    }
  }, [awaitingReadyTranscription, hasSession, sessionId, startPolling, status]);

  const SCORE_MAX = 100;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
        <header className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">MIA Audio Test Bench</h1>
          <p className="mt-2 text-sm text-slate-600">
            Uses a same-origin proxy to avoid browser CORS issues while streaming audio chunks.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-1">
            <h2 className="mb-4 text-base font-semibold">Connection</h2>
            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Session Mode</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSessionMode("audio")}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      sessionMode === "audio"
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Audio Session
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionMode("text")}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      sessionMode === "text"
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Text Session
                  </button>
                </div>
              </div>

              {sessionMode === "audio" ? (
                <>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Microphone
                    <select
                      value={selectedAudioInputId}
                      onChange={(event) => setSelectedAudioInputId(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                      disabled={isLoadingAudioInputs || audioInputs.length === 0}
                    >
                      {audioInputs.length === 0 ? (
                        <option value="">No microphones found</option>
                      ) : (
                        audioInputs.map((input, index) => (
                          <option key={input.deviceId} value={input.deviceId}>
                            {input.label || `Microphone ${index + 1}`}
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => void loadAudioInputs()}
                    disabled={isLoadingAudioInputs}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoadingAudioInputs ? "Refreshing microphones..." : "Refresh microphone list"}
                  </button>
                </>
              ) : null}

              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                Clinical Notes
                <textarea
                  value={clinicalNotes}
                  onChange={(event) => setClinicalNotes(event.target.value)}
                  placeholder={sessionMode === "text" ? "Required for text sessions" : "Optional"}
                  className="mt-1 min-h-36 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                />
              </label>

              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                Environment
                <select
                  value={selectedEnvironment}
                  onChange={(event) => {
                    const nextEnv = event.target.value as MiaEnvironment;
                    setSelectedEnvironment(nextEnv);
                    if (sessionId.trim()) {
                      persistSessionInUrl(sessionId, nextEnv);
                    }
                  }}
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

              {isAudioMode ? (
                <>
                  <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <span>Enable Guidance</span>
                    <input
                      type="checkbox"
                      checked={enableGuidance}
                      onChange={(event) => setEnableGuidance(event.target.checked)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </label>
                  {enableGuidance && (
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Guidance Interval (seconds)
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="range"
                          min={5}
                          max={60}
                          step={5}
                          value={guidanceIntervalSeconds}
                          onChange={(event) => setGuidanceIntervalSeconds(Number(event.target.value))}
                          className="flex-1 accent-indigo-600"
                        />
                        <span className="w-8 text-center text-sm font-semibold text-indigo-700">
                          {guidanceIntervalSeconds}s
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-400">Lower = faster updates, higher LLM cost. Default: 10s</p>
                    </label>
                  )}
                </>
              ) : null}

              <div className="rounded-md border border-slate-200 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Client Context</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Required: demographics.age. Optional fields are only sent when populated.
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      <li>Age: {clientAge}</li>
                      <li>Optional Demographics Set: {selectedOptionalDemographicsCount}</li>
                      <li>Assessments JSON: {clientAssessmentsJson ? "Included" : "Not set"}</li>
                      <li>Events JSON: {clientEventsJson ? "Included" : "Not set"}</li>
                      <li>Notes JSON: {clientNotesJson ? "Included" : "Not set"}</li>
                      <li>Goals JSON: {clientGoalsJson ? "Included" : "Not set"}</li>
                      <li>JSON Override: {hasClientContextOverride ? "Enabled" : "Disabled"}</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={openClientContextModal}
                    className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit in Modal
                  </button>
                </div>
              </div>

              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Proxy path: <span className="font-mono">/api/mia/*</span>
              </p>

              {errorMessage ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={startSession}
                  disabled={isStartingSession || isRecording}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStartingSession ? <LoaderCircle className="animate-spin" size={16} /> : <Play size={16} />}
                  {sessionMode === "audio" ? "Start Audio Session" : "Start Text Session"}
                </button>

                {sessionMode !== "audio" ? (
                  <div className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">
                    Recording disabled in text mode
                  </div>
                ) : !isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!hasSession}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Mic size={16} /> Record
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    <Square size={16} /> Stop
                  </button>
                )}
              </div>

              {isAudioMode ? (
                <div className="rounded-md border border-slate-200 px-3 py-3 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Send Audio File</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-slate-500">
                      Chunk size (KB)
                      <input
                        type="number"
                        min={10}
                        max={2048}
                        value={fileChunkSizeKb}
                        onChange={(e) => setFileChunkSizeKb(Number(e.target.value))}
                        disabled={isSendingFile}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none ring-indigo-500 focus:ring disabled:opacity-50"
                      />
                    </label>
                    <label className="block text-xs text-slate-500">
                      Delay between chunks (ms)
                      <input
                        type="number"
                        min={500}
                        max={60000}
                        step={500}
                        value={fileChunkDelayMs}
                        onChange={(e) => setFileChunkDelayMs(Number(e.target.value))}
                        disabled={isSendingFile}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none ring-indigo-500 focus:ring disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.webm,.wav,.mp3,.ogg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void sendAudioFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!hasSession || isSendingFile || isRecording || status !== "WAITING_FOR_AUDIO"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSendingFile ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}
                    {isSendingFile ? `Sending... ${fileSendProgress}` : "Pick & Send Audio File"}
                  </button>
                  {!hasSession && (
                    <p className="text-xs text-amber-600">Start a session first.</p>
                  )}
                  {hasSession && status !== "WAITING_FOR_AUDIO" && !isSendingFile && (
                    <p className="text-xs text-amber-600">Session must be in WAITING_FOR_AUDIO status. Current: {status}</p>
                  )}
                  {isSendingFile && (
                    <p className="text-xs text-slate-500">Next chunk in {fileChunkDelayMs / 1000}s — feedback updates between chunks.</p>
                  )}
                </div>
              ) : null}

              {isAudioMode ? (
                <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span>Finalize on stop (send final chunk)</span>
                  <input
                    type="checkbox"
                    checked={finalizeOnStop}
                    onChange={(event) => setFinalizeOnStop(event.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </label>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-base font-semibold">Session Status</h2>
                <p className="text-xs text-slate-500">Session ID: {sessionId || "Not started"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearSession}
                  disabled={isRecording || isSendingFile}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  New Session
                </button>
                <Link
                  href={hasSession ? `/mia-audio-test-bench/care-plan/${sessionId}` : "/mia-audio-test-bench"}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Care Plans
                </Link>
                <Link
                  href={hasSession ? `/mia-audio-test-bench/questionnaires/${sessionId}` : "/mia-audio-test-bench"}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Questionnaires
                </Link>
                <button
                  type="button"
                  onClick={() => void fetchTranscription(sessionId)}
                  disabled={!hasSession || !transcriptionAvailable || isFetchingTranscription}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isFetchingTranscription ? "Loading..." : "View Transcription"}
                </button>
                <span className="inline-flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-xs font-semibold">
                  <Activity size={14} /> {status}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Telemetry</h3>
                  {elapsedMs !== null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                      Waiting… {(elapsedMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {lastResponseMs !== null && elapsedMs === null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                      End-to-end {(lastResponseMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                {(lastTranscriptionMs !== null || lastLlmMs !== null) && (
                  <div className="mb-2 flex flex-wrap gap-2 text-xs">
                    {lastTranscriptionMs !== null && (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 font-mono text-blue-700">
                        transcription {(lastTranscriptionMs / 1000).toFixed(2)}s
                      </span>
                    )}
                    {lastLlmMs !== null && (
                      <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 font-mono text-purple-700">
                        llm {(lastLlmMs / 1000).toFixed(2)}s
                      </span>
                    )}
                    {lastTranscriptionMs !== null && lastLlmMs !== null && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
                        interval ~{guidanceIntervalSeconds}s
                      </span>
                    )}
                  </div>
                )}
                {(observeScore !== null || orientScore !== null || decideScore !== null) && (
                  <div className="mb-2 flex flex-wrap gap-2 text-xs">
                    {(["O", "Ri", "D"] as const).map((label, i) => {
                      const score = [observeScore, orientScore, decideScore][i];
                      const fullLabel = ["Observe", "Orient", "Decide"][i];
                      if (score === null) return null;
                      const colour =
                        score >= 4 ? "bg-green-50 text-green-700" :
                        score === 3 ? "bg-yellow-50 text-yellow-700" :
                        "bg-red-50 text-red-700";
                      const dots = Array.from({ length: 5 }, (_, j) => (
                        <span key={j} className={`inline-block h-1.5 w-1.5 rounded-full ${j < score ? (score >= 4 ? "bg-green-500" : score === 3 ? "bg-yellow-400" : "bg-red-400") : "bg-slate-200"}`} />
                      ));
                      return (
                        <span key={label} title={`${fullLabel}: ${score}/5`} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono ${colour}`}>
                          {label} {dots} {score}/5
                        </span>
                      );
                    })}
                  </div>
                )}
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>last_sequence_processed: {lastSequenceProcessed ?? "—"}</li>
                  <li>last_modified_date_utc: {lastModifiedDateUtc || "—"}</li>
                  <li>
                    last_modified_date_local: {" "}
                    {lastModifiedDateUtc ? new Date(lastModifiedDateUtc).toLocaleString() : "—"}
                  </li>
                  <li>next_expected_sequence: {nextExpectedSequence ?? "—"}</li>
                  <li>next_upload_sequence: {sequenceNumber}</li>
                  <li>recorder_state: {isRecording ? "RECORDING" : "STOPPED"}</li>
                  <li>upload_state: {isUploading ? "UPLOADING" : "IDLE"}</li>
                </ul>
              </div>

              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Session Information</h3>
                  <button
                    type="button"
                    onClick={openSessionEditModal}
                    disabled={!hasSession || isUpdatingSession}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingSession ? "Updating..." : "Request Edit"}
                  </button>
                </div>
                <ul className="mb-3 space-y-1 text-xs text-slate-500">
                  <li>session_id: {sessionId || "-"}</li>
                  <li>status: {status}</li>
                  <li>last_sequence_processed: {lastSequenceProcessed ?? "-"} &nbsp;|&nbsp; next_expected: {nextExpectedSequence ?? "-"}</li>
                </ul>

                {/* Risk Banner — shown only when data is present */}
                {(sessionRiskRating || sessionRiskScore != null) && (
                  <div className={`mb-3 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
                    sessionRiskRating === "High" ? "bg-red-50 border border-red-200 text-red-800" :
                    sessionRiskRating === "Moderate" ? "bg-amber-50 border border-amber-200 text-amber-800" :
                    "bg-green-50 border border-green-200 text-green-800"
                  }`}>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      sessionRiskRating === "High" ? "bg-red-100 text-red-700" :
                      sessionRiskRating === "Moderate" ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {sessionRiskRating ?? "—"}
                    </span>
                    <span>Suicide Risk Rating</span>
                    {sessionRiskScore != null && (
                      <span className="ml-auto text-xs font-normal opacity-70">Risk score: {sessionRiskScore}/10</span>
                    )}
                  </div>
                )}

                {sessionRisk && (
                  <div className="mb-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Narrative</p>
                    <p className="text-sm text-slate-700">{sessionRisk}</p>
                  </div>
                )}

                {/* Summary */}
                <div className="mb-3 rounded-md border border-slate-200 bg-white p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Clinical Summary</p>
                  <div className="text-sm text-slate-700 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                    <ReactMarkdown>{sessionSummary || "-"}</ReactMarkdown>
                  </div>
                </div>

                {/* Inferences / Formulation */}
                {sessionInferences && (
                  <div className="mb-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Cross-Domain Inferences</p>
                    <p className="text-sm text-slate-700">{sessionInferences}</p>
                  </div>
                )}

                {/* Differential Diagnosis */}
                {sessionDifferentialDiagnosis && (
                  <div className="mb-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Differential Diagnosis</p>
                    <p className="text-sm text-slate-700">{sessionDifferentialDiagnosis}</p>
                  </div>
                )}

                {/* Root Cause + Prognosis side by side */}
                {(sessionRootCause || sessionPrognosis) && (
                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                    {sessionRootCause && (
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Root Cause</p>
                        <p className="text-sm text-slate-700">{sessionRootCause}</p>
                      </div>
                    )}
                    {sessionPrognosis && (
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Prognosis</p>
                        <p className="text-sm text-slate-700">{sessionPrognosis}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Key Insights */}
                {sessionKeyInsights.length > 0 && (
                  <div className="mb-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Key Insights</p>
                    <ul className="flex flex-col gap-1.5">
                      {sessionKeyInsights.map((insight, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Domain Scores */}
                {sessionDomainScores && (
                  <div className="mb-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Assessment Completeness (1–5)</p>
                    <div className="space-y-2">
                      {([
                        { label: "Risk Assessment", score: sessionDomainScores.risk, reasons: sessionDomainScores.riskReasons },
                        { label: "Functioning", score: sessionDomainScores.functioning, reasons: sessionDomainScores.functioningReasons },
                        { label: "Comorbidity", score: sessionDomainScores.comorbidity, reasons: sessionDomainScores.comorbidityReasons },
                        { label: "Physical Health", score: sessionDomainScores.physicalHealth, reasons: sessionDomainScores.physicalHealthReasons },
                        { label: "Illness Type & Trajectory", score: sessionDomainScores.illnessType, reasons: sessionDomainScores.illnessTypeReasons },
                      ] as { label: string; score: number | null; reasons: string[] }[]).map(({ label, score, reasons }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">{label}</span>
                            <span className={`font-semibold ${score != null && score >= 4 ? "text-green-600" : score != null && score >= 2 ? "text-amber-600" : "text-red-500"}`}>
                              {score != null ? `${score}/5` : "—"}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${score != null && score >= 4 ? "bg-green-400" : score != null && score >= 2 ? "bg-amber-400" : "bg-red-400"}`}
                              style={{ width: score != null ? `${(score / 5) * 100}%` : "0%" }}
                            />
                          </div>
                          {reasons.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {reasons.map((r, ri) => (
                                <li key={ri} className="text-[11px] text-slate-500">• {r}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Treatment & Next Steps */}
                {(sessionTreatmentGoals.length > 0 || sessionFirstLineTreatment.length > 0 || sessionSecondLineTreatment.length > 0 || sessionFurtherAssessment.length > 0) && (
                  <div className="mb-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Treatment & Next Steps</p>

                    {sessionFurtherAssessment.length > 0 && (
                      <div className="mb-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Further Assessment Steps</p>
                        <ul className="space-y-1">
                          {sessionFurtherAssessment.map((s, i) => (
                            <li key={i} className="flex gap-2 text-sm text-slate-700">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {sessionTreatmentGoals.length > 0 && (
                      <div className="mb-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Likely Treatment Goals</p>
                        <ul className="space-y-1">
                          {sessionTreatmentGoals.map((g, i) => (
                            <li key={i} className="flex gap-2 text-sm text-slate-700">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-400" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {sessionFirstLineTreatment.length > 0 && (
                      <div className="mb-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">First-Line Treatment Options</p>
                        <ul className="space-y-1">
                          {sessionFirstLineTreatment.map((t, i) => (
                            <li key={i} className="flex gap-2 text-sm text-slate-700">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {sessionSecondLineTreatment.length > 0 && (
                      <div className="mb-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Second-Line Treatment Options</p>
                        <ul className="space-y-1">
                          {sessionSecondLineTreatment.map((t, i) => (
                            <li key={i} className="flex gap-2 text-sm text-slate-700">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Assumptions & Missing Info */}
                {sessionAssumptions.length > 0 && (
                  <div className="mb-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Assumptions</p>
                    <div className="text-sm text-slate-700 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
                      <ReactMarkdown>{sessionAssumptions.map((item) => `- ${item}`).join("\n")}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {sessionMissingInformation.length > 0 && (
                  <div className="mb-3 rounded-md border border-amber-100 bg-amber-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Missing Information</p>
                    <div className="text-sm text-amber-800 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
                      <ReactMarkdown>{sessionMissingInformation.map((item) => `- ${item}`).join("\n")}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {sessionFailureReason && (
                  <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">Failure Reason</p>
                    <div className="text-sm text-red-700 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
                      <ReactMarkdown>{sessionFailureReason}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {status === "THINKING" && (
                  <p className="mt-2 text-xs text-slate-500">Polling in progress while session is THINKING...</p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold">Summary Notes</h3>
                <div className="min-h-40 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                  {summaryNotes || "Waiting for feedback..."}
                </div>
              </div>

              <div className="rounded-lg border bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold">Suggested Next Questions</h3>
                {promptQuestions.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                    {promptQuestions.map((question, index) => (
                      <li key={`${index}-${question}`}>{question}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No questions yet.</p>
                )}
              </div>
            </div>

            {/* Assessment Awareness Panel */}
            {(assessmentMessage || knowns.length > 0 || unknowns.length > 0 || assumptions.length > 0 || whyThisQuestion) && (
              <div className="mt-4 rounded-lg border bg-white p-4">
                <h3 className="mb-4 text-sm font-semibold">Assessment Awareness</h3>

                {assessmentMessage && (
                  <div className="mb-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm leading-relaxed text-teal-900">
                    {assessmentMessage}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  {knowns.length > 0 && (
                    <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-teal-600">What We Know</div>
                      <ul className="flex flex-col gap-1.5">
                        {knowns.map((k, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-700">
                            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-400" />
                            {k}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {unknowns.length > 0 && (
                    <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-600">What We&apos;re Exploring</div>
                      <ul className="flex flex-col gap-1.5">
                        {unknowns.map((u, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-700">
                            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {assumptions.length > 0 && (
                    <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Working Assumptions</div>
                      <ul className="flex flex-col gap-1.5">
                        {assumptions.map((a, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-600 italic">
                            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {whyThisQuestion && (
                  <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-indigo-500">Why These Questions</div>
                    <p className="text-xs leading-relaxed text-indigo-900">{whyThisQuestion}</p>
                  </div>
                )}
              </div>
            )}

            {kbEvidence.length > 0 && (
              <div className="mt-4 rounded-lg border bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold">Knowledge Bank — Evidence used this pass</h3>
                <div className="flex flex-col gap-2">
                  {kbEvidence.map((chunk, i) => {
                    if (!chunk?.trim()) return null;
                    const sourceName = kbEvidenceSources[i];
                    return (
                      <div key={i} className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-indigo-900">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-bold text-indigo-400">#{i + 1}</span>
                          {sourceName && (
                            <span className="rounded bg-indigo-200 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 truncate max-w-[240px]" title={sourceName}>
                              {sourceName}
                            </span>
                          )}
                        </div>
                        {chunk.trim()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-lg border bg-slate-50 p-4">
              <h3 className="mb-4 text-sm font-semibold">Feedback Scores</h3>
              <div className="space-y-4">
                {SCORE_FIELDS.map((field) => {
                  const value = feedbackScores[field.key];
                  const rationale = feedbackRationales[field.rationaleKey];
                  const widthPercent =
                    value === null ? 0 : Math.max(0, Math.min(100, (value / SCORE_MAX) * 100));

                  return (
                    <div key={field.key}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                        <span>{field.label}</span>
                        <span className="font-semibold">{value ?? "—"}{value === null ? "" : "/100"}</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-indigo-600 transition-all"
                          style={{ width: `${value === null ? 0 : widthPercent}%` }}
                        />
                      </div>
                      {rationale ? (
                        <p className="mt-1 text-xs text-slate-500 italic">{rationale}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {(liveTranscription || oodaReasoning) ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {liveTranscription ? (
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <h3 className="mb-1 text-sm font-semibold">Live Transcription</h3>
                    <p className="mb-2 text-xs text-slate-500">Accumulated raw transcript (updates each chunk)</p>
                    <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {liveTranscription}
                    </div>
                  </div>
                ) : null}
                {oodaReasoning ? (
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <h3 className="mb-1 text-sm font-semibold">OODA Reasoning</h3>
                    <p className="mb-2 text-xs text-slate-500">LLM chain-of-thought before scoring (last pass)</p>
                    <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
                      {oodaReasoning}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Session Transcription</h2>
              <span className="text-xs text-slate-500">Available when status is COMPLETED</span>
            </div>

            {transcriptionAvailable ? (
              <>
                <textarea
                  value={transcriptionText}
                  readOnly
                  placeholder="Session transcription summary will appear here after processing completes."
                  className="min-h-40 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                />

                {transcriptionSegments.length > 0 ? (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold">Segments</h3>
                <div className="space-y-2">
                  {transcriptionSegments.map((segment, index) => (
                    <div key={`${segment.start_seconds}-${segment.end_seconds}-${index}`} className="rounded-md border border-slate-200 p-3">
                      <div className="mb-1 text-xs text-slate-500">
                        {(segment.start_seconds ?? 0).toFixed(1)}s - {(segment.end_seconds ?? 0).toFixed(1)}s
                        {segment.speaker ? ` • ${segment.speaker}` : ""}
                        {segment.role ? ` • ${segment.role}` : ""}
                      </div>
                      <p className="text-sm text-slate-700">{segment.text || ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Transcription details will appear automatically after final chunk upload when the session reaches COMPLETED.
              </p>
            )}

            {transcriptionError ? (
              <p className="mt-3 text-sm text-rose-700">{transcriptionError}</p>
            ) : null}
          </div>
        </section>

        {errorMessage ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-lg rounded-xl border border-rose-200 bg-white shadow-xl">
              <div className="flex items-center gap-2 border-b border-rose-100 bg-rose-50 px-5 py-3 rounded-t-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                <h2 className="text-sm font-semibold text-rose-800">Error</h2>
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
                              <li key={idx} className="rounded-md border border-rose-100 bg-rose-50/50 p-3">
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-200 text-xs font-bold text-rose-700">
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-rose-800">{err.msg || "Unknown error"}</p>
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
                  className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isClientContextModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Client Context</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Required-only prefill is applied. Optional fields are sent only when populated.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeClientContextModal}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 max-h-[72vh] space-y-5 overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-3 rounded-md border border-slate-200 p-3">
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Age *
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={draftClientAge}
                      onChange={(event) => setDraftClientAge(Number(event.target.value))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                    />
                  </label>
                  <p className="col-span-2 self-end text-xs text-slate-500">
                    Required by validation. Every other field in this modal is optional.
                  </p>
                </div>

                <div className="rounded-md border border-slate-200 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Optional Demographics</p>
                  <p className="mt-1 text-xs text-slate-500">Set any fields you want to include in demographics.</p>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {OPTIONAL_DEMOGRAPHICS_FIELDS.map((field) => (
                      <label key={field.key} className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                        {field.label}
                        {field.input === "boolean" ? (
                          <select
                            value={draftClientOptionalDemographics[field.key]}
                            onChange={(event) =>
                              setDraftClientOptionalDemographics((previous) => ({
                                ...previous,
                                [field.key]: event.target.value as OptionalDemographicsInput[typeof field.key],
                              }))
                            }
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm normal-case outline-none ring-indigo-500 focus:ring"
                          >
                            <option value="">Not set</option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : field.options ? (
                          <select
                            value={draftClientOptionalDemographics[field.key]}
                            onChange={(event) =>
                              setDraftClientOptionalDemographics((previous) => ({
                                ...previous,
                                [field.key]: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm normal-case outline-none ring-indigo-500 focus:ring"
                          >
                            <option value="">Not set</option>
                            {field.options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={draftClientOptionalDemographics[field.key]}
                            onChange={(event) =>
                              setDraftClientOptionalDemographics((previous) => ({
                                ...previous,
                                [field.key]: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-indigo-500 focus:ring"
                          />
                        )}
                        {field.helperText ? <span className="mt-1 block text-[11px] text-slate-400">{field.helperText}</span> : null}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Assessments JSON (array)
                    <textarea
                      value={draftClientAssessmentsJson}
                      onChange={(event) => setDraftClientAssessmentsJson(event.target.value)}
                      placeholder='[ { "completed_at": "2026-03-01T09:00:00Z", "questionnaire": { ... } } ]'
                      className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none ring-indigo-500 focus:ring"
                    />
                  </label>

                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Events JSON (array)
                    <textarea
                      value={draftClientEventsJson}
                      onChange={(event) => setDraftClientEventsJson(event.target.value)}
                      placeholder='[ { "title": "...", "created_at": "2026-03-10T14:00:00Z" } ]'
                      className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none ring-indigo-500 focus:ring"
                    />
                  </label>

                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Notes JSON (array)
                    <textarea
                      value={draftClientNotesJson}
                      onChange={(event) => setDraftClientNotesJson(event.target.value)}
                      placeholder='[ { "text": "...", "occurred_at": "2026-03-10T14:30:00Z" } ]'
                      className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none ring-indigo-500 focus:ring"
                    />
                  </label>

                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Goals JSON (array)
                    <textarea
                      value={draftClientGoalsJson}
                      onChange={(event) => setDraftClientGoalsJson(event.target.value)}
                      placeholder='[ { "title": "...", "status": "active", "actions": [] } ]'
                      className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none ring-indigo-500 focus:ring"
                    />
                  </label>
                </div>

                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Client Context JSON Override (object)
                  <textarea
                    value={draftClientContextOverrideJson}
                    onChange={(event) => setDraftClientContextOverrideJson(event.target.value)}
                    placeholder='{"demographics":{"age":34},"notes":[]}'
                    className="mt-2 min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none ring-indigo-500 focus:ring"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    When provided, this override replaces all selections above for client_context.
                  </span>
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDraftClientAge(DEFAULT_CLIENT_DEMOGRAPHICS.age);
                    setDraftClientOptionalDemographics(EMPTY_OPTIONAL_DEMOGRAPHICS);
                    setDraftClientAssessmentsJson("");
                    setDraftClientEventsJson("");
                    setDraftClientNotesJson("");
                    setDraftClientGoalsJson("");
                    setDraftClientContextOverrideJson("");
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset Required Only
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeClientContextModal}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveClientContext}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Save Client Context
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isSessionEditModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Request Session Information Edit</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Add notes for how the session information should be updated.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeSessionEditModal}
                  disabled={isUpdatingSession}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close
                </button>
              </div>

              <label className="mt-5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Notes
                <textarea
                  value={sessionEditNotes}
                  onChange={(event) => setSessionEditNotes(event.target.value)}
                  placeholder="Describe the corrections or additional information for this session"
                  className="mt-2 min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                />
              </label>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeSessionEditModal}
                  disabled={isUpdatingSession}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void updateSessionInformation()}
                  disabled={isUpdatingSession || !sessionEditNotes.trim()}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingSession ? "Submitting..." : "Submit Edit Request"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
