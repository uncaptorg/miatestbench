"use client";

import { Mic, Square, Play, LoaderCircle, Activity } from "lucide-react";
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
  suicidal_thoughts_and_behaviours_score?: number | null;
  social_and_occupational_functioning_score?: number | null;
  alcohol_and_substance_misuse_score?: number | null;
  physical_health_score?: number | null;
};

type SessionInfoResponse = {
  session_id?: string;
  status?: string;
  failure_reason?: string | null;
  assumptions?: string[];
  missing_information?: string[];
  summary?: string | null;
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

type FeedbackScores = Record<FeedbackScoreKey, number | null>;
type SessionMode = "audio" | "text";

const SCORE_FIELDS: Array<{ key: FeedbackScoreKey; label: string }> = [
  { key: "illness_type_stage_and_trajectory_score", label: "Illness Type Stage & Trajectory" },
  { key: "suicidal_thoughts_and_behaviours_score", label: "Suicidal Thoughts & Behaviours" },
  { key: "social_and_occupational_functioning_score", label: "Social & Occupational Functioning" },
  { key: "alcohol_and_substance_misuse_score", label: "Alcohol & Substance Misuse" },
  { key: "physical_health_score", label: "Physical Health" },
];

const createDefaultFeedbackScores = (): FeedbackScores => ({
  illness_type_stage_and_trajectory_score: null,
  suicidal_thoughts_and_behaviours_score: null,
  social_and_occupational_functioning_score: null,
  alcohol_and_substance_misuse_score: null,
  physical_health_score: null,
});

const RECORDING_TIMESLICE_MS = 5000;
const POLLING_INTERVAL_MS = 3000;
const SESSION_UPDATE_MAX_POLLS = 20;
const PROXY_BASE_PATH = "/api/mia";

const DEFAULT_CLIENT_DEMOGRAPHICS = {
  age: 30,
  gender: "unknown",
  genderAtBirth: "unknown",
  sexualIdentity: "unknown",
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
  const [clientGender, setClientGender] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.gender);
  const [clientGenderAtBirth, setClientGenderAtBirth] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.genderAtBirth);
  const [clientSexualIdentity, setClientSexualIdentity] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.sexualIdentity);
  const [clientState, setClientState] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.state);
  const [clientPostcode, setClientPostcode] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.postcode);
  const [clientCountry, setClientCountry] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.country);
  const [enableGuidance, setEnableGuidance] = useState(true);
  const [clientContext, setClientContext] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.context);
  const [draftClientAge, setDraftClientAge] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.age);
  const [draftClientGender, setDraftClientGender] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.gender);
  const [draftClientGenderAtBirth, setDraftClientGenderAtBirth] = useState(
    DEFAULT_CLIENT_DEMOGRAPHICS.genderAtBirth,
  );
  const [draftClientSexualIdentity, setDraftClientSexualIdentity] = useState(
    DEFAULT_CLIENT_DEMOGRAPHICS.sexualIdentity,
  );
  const [draftClientState, setDraftClientState] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.state);
  const [draftClientPostcode, setDraftClientPostcode] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.postcode);
  const [draftClientCountry, setDraftClientCountry] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.country);
  const [draftClientContext, setDraftClientContext] = useState(DEFAULT_CLIENT_DEMOGRAPHICS.context);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [isClientContextModalOpen, setIsClientContextModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [finalizeOnStop, setFinalizeOnStop] = useState(true);

  const [sequenceNumber, setSequenceNumber] = useState(0);
  const [lastSequenceProcessed, setLastSequenceProcessed] = useState<number | null>(null);
  const [lastModifiedDateUtc, setLastModifiedDateUtc] = useState("");
  const [nextExpectedSequence, setNextExpectedSequence] = useState<number | null>(null);
  const [summaryNotes, setSummaryNotes] = useState("");
  const [promptQuestions, setPromptQuestions] = useState<string[]>([]);
  const [feedbackScores, setFeedbackScores] = useState<FeedbackScores>(createDefaultFeedbackScores);
  const [status, setStatus] = useState("IDLE");
  const [sessionSummary, setSessionSummary] = useState("");
  const [sessionAssumptions, setSessionAssumptions] = useState<string[]>([]);
  const [sessionMissingInformation, setSessionMissingInformation] = useState<string[]>([]);
  const [sessionFailureReason, setSessionFailureReason] = useState("");
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

  const persistSessionIdInUrl = useCallback(
    (nextSessionId: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextSessionId.trim()) {
        params.set("sessionId", nextSessionId.trim());
      } else {
        params.delete("sessionId");
      }

      const query = params.toString();
      router.replace(query ? `/mia-audio-test-bench?${query}` : "/mia-audio-test-bench");
    },
    [router, searchParams],
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
    setDraftClientGender(clientGender);
    setDraftClientGenderAtBirth(clientGenderAtBirth);
    setDraftClientSexualIdentity(clientSexualIdentity);
    setDraftClientState(clientState);
    setDraftClientPostcode(clientPostcode);
    setDraftClientCountry(clientCountry);
    setDraftClientContext(clientContext);
    setIsClientContextModalOpen(true);
  };

  const closeClientContextModal = () => {
    setIsClientContextModalOpen(false);
  };

  const saveClientContext = () => {
    setClientAge(Number.isFinite(draftClientAge) ? Math.max(0, draftClientAge) : 0);
    setClientGender(draftClientGender.trim());
    setClientGenderAtBirth(draftClientGenderAtBirth.trim());
    setClientSexualIdentity(draftClientSexualIdentity.trim());
    setClientState(draftClientState.trim());
    setClientPostcode(draftClientPostcode.trim());
    setClientCountry(draftClientCountry.trim());
    setClientContext(draftClientContext.trim());
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
      }

      if (sessionInfoRes.ok) {
        const info = (await sessionInfoRes.json()) as SessionInfoResponse;
        const nextStatus = info.status ?? "UNKNOWN";
        setStatus(nextStatus);
        setSessionSummary(typeof info.summary === "string" ? info.summary : "");
        setSessionAssumptions(Array.isArray(info.assumptions) ? info.assumptions : []);
        setSessionMissingInformation(Array.isArray(info.missing_information) ? info.missing_information : []);
        setSessionFailureReason(typeof info.failure_reason === "string" ? info.failure_reason : "");

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

      syncSequenceNumber(currentSequence + 1);
      setErrorMessage("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrorMessage(`Audio upload failed for sequence ${currentSequence}: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const startSession = async () => {
    setIsStartingSession(true);
    setErrorMessage("");

    try {
      if (sessionMode === "text" && !clinicalNotes.trim()) {
        throw new Error("Text mode requires clinical notes.");
      }

      const normalizedAge = Number.isFinite(clientAge) ? Math.max(0, clientAge) : 0;
      const normalizedGender = clientGender.trim();
      const normalizedGenderAtBirth = clientGenderAtBirth.trim();
      const normalizedSexualIdentity = clientSexualIdentity.trim();
      const normalizedState = clientState.trim();
      const normalizedPostcode = clientPostcode.trim();
      const normalizedCountry = clientCountry.trim();
      const normalizedClientContext = clientContext.trim();
      const normalizedClinicalNotes = clinicalNotes.trim();

      const hasRequiredDemographics =
        normalizedAge >= 0 &&
        Boolean(normalizedGender) &&
        Boolean(normalizedGenderAtBirth) &&
        Boolean(normalizedSexualIdentity) &&
        Boolean(normalizedPostcode) &&
        Boolean(normalizedState);

      if (!hasRequiredDemographics) {
        throw new Error(
          "Client context is required. Please complete Age, Gender, Gender At Birth, Sexual Identity, State, and Postcode in the Client Context modal.",
        );
      }

      const payload: {
        mode: SessionMode;
        enable_guidance: boolean;
        clinical_notes?: string;
        client_context: {
          demographics: {
            age: number;
            gender: string;
            gender_at_birth: string;
            sexual_identity: string;
            postcode: string;
            state: string;
            country?: string;
          };
          notes?: Array<{ text: string }>;
        };
      } = {
        mode: sessionMode,
        enable_guidance: isAudioMode ? enableGuidance : false,
        client_context: {
          demographics: {
            age: normalizedAge,
            gender: normalizedGender,
            gender_at_birth: normalizedGenderAtBirth,
            sexual_identity: normalizedSexualIdentity,
            postcode: normalizedPostcode,
            state: normalizedState,
            ...(normalizedCountry ? { country: normalizedCountry } : {}),
          },
          ...(normalizedClientContext
            ? {
                notes: [
                  {
                    text: normalizedClientContext,
                  },
                ],
              }
            : {}),
        },
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
      persistSessionIdInUrl(data.session_id);
      syncSequenceNumber(0);
      setLastSequenceProcessed(null);
      setLastModifiedDateUtc("");
      setNextExpectedSequence(null);
      setSummaryNotes("");
      setPromptQuestions([]);
      setFeedbackScores(createDefaultFeedbackScores());
      setSessionSummary("");
      setSessionAssumptions([]);
      setSessionMissingInformation([]);
      setSessionFailureReason("");
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

    const sessionIdFromUrl = searchParams.get("sessionId")?.trim();
    const sessionIdFromStorage = sessionStorage.getItem("miaAudioBench.sessionId")?.trim();
    const sessionIdToHydrate = sessionIdFromUrl || sessionIdFromStorage;

    if (!sessionIdToHydrate) {
      didHydrateFromUrlRef.current = true;
      return;
    }

    didHydrateFromUrlRef.current = true;
    setSessionId(sessionIdToHydrate);
    persistSessionIdInUrl(sessionIdToHydrate);
    setErrorMessage("");
    setStatus("INITIALISING");
    startPolling(sessionIdToHydrate);
  }, [persistSessionIdInUrl, searchParams, startPolling]);

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

    if (status === "THINKING") {
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

              {isAudioMode ? (
                <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span>Enable Guidance</span>
                  <input
                    type="checkbox"
                    checked={enableGuidance}
                    onChange={(event) => setEnableGuidance(event.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </label>
              ) : null}

              <div className="rounded-md border border-slate-200 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Client Context</p>
                    <p className="mt-1 text-sm text-slate-600">Required. Configure all fields via modal.</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      <li>Age: {clientAge}</li>
                      <li>Gender: {clientGender || "—"}</li>
                      <li>Gender At Birth: {clientGenderAtBirth || "—"}</li>
                      <li>Sexual Identity: {clientSexualIdentity || "—"}</li>
                      <li>
                        Location: {clientState || "—"}, {clientPostcode || "—"}, {clientCountry || "—"}
                      </li>
                      <li>Additional Context: {clientContext || "None"}</li>
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
                <Link
                  href={hasSession ? `/mia-audio-test-bench/care-plan/${sessionId}` : "/mia-audio-test-bench"}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Care Plans
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
                <h3 className="mb-2 text-sm font-semibold">Telemetry</h3>
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
                <div className="mb-2 flex items-center justify-between gap-2">
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
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>session_id: {sessionId || "-"}</li>
                  <li>status: {status}</li>
                  <li>last_sequence_processed: {lastSequenceProcessed ?? "-"}</li>
                  <li>next_expected_sequence: {nextExpectedSequence ?? "-"}</li>
                </ul>

                <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Summary (Markdown)</p>
                  <div className="text-sm text-slate-700 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                    <ReactMarkdown>{sessionSummary || "-"}</ReactMarkdown>
                  </div>
                </div>

                <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Failure Reason (Markdown)</p>
                  <div className="text-sm text-slate-700 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                    <ReactMarkdown>{sessionFailureReason || "-"}</ReactMarkdown>
                  </div>
                </div>

                <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Assumptions (Markdown)</p>
                  <div className="text-sm text-slate-700 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                    <ReactMarkdown>
                      {sessionAssumptions.length > 0
                        ? sessionAssumptions.map((item) => `- ${item}`).join("\n")
                        : "-"}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Missing Information (Markdown)</p>
                  <div className="text-sm text-slate-700 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                    <ReactMarkdown>
                      {sessionMissingInformation.length > 0
                        ? sessionMissingInformation.map((item) => `- ${item}`).join("\n")
                        : "-"}
                    </ReactMarkdown>
                  </div>
                </div>
                {status === "THINKING" ? (
                  <p className="mt-2 text-xs text-slate-500">Polling in progress while session is THINKING...</p>
                ) : null}
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

            <div className="mt-4 rounded-lg border bg-slate-50 p-4">
              <h3 className="mb-4 text-sm font-semibold">Feedback Scores</h3>
              <div className="space-y-3">
                {SCORE_FIELDS.map((field) => {
                  const value = feedbackScores[field.key];
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
                    </div>
                  );
                })}
              </div>
            </div>
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
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {isClientContextModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Client Context</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Configure structured demographics and optional context notes for this session.
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

              <div className="mt-5 grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Age *
                  <input
                    type="number"
                    min={0}
                    value={draftClientAge}
                    onChange={(event) => setDraftClientAge(Number(event.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                  />
                </label>

                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Gender *
                  <input
                    value={draftClientGender}
                    onChange={(event) => setDraftClientGender(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                  />
                </label>

                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Gender At Birth *
                  <input
                    value={draftClientGenderAtBirth}
                    onChange={(event) => setDraftClientGenderAtBirth(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                  />
                </label>

                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Sexual Identity *
                  <input
                    value={draftClientSexualIdentity}
                    onChange={(event) => setDraftClientSexualIdentity(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                  />
                </label>

                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  State *
                  <input
                    value={draftClientState}
                    onChange={(event) => setDraftClientState(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                  />
                </label>

                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Postcode *
                  <input
                    value={draftClientPostcode}
                    onChange={(event) => setDraftClientPostcode(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                  />
                </label>

                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 col-span-2">
                  Country
                  <input
                    value={draftClientCountry}
                    onChange={(event) => setDraftClientCountry(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                  />
                </label>
              </div>

              <label className="mt-5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Additional Context Notes
                <textarea
                  value={draftClientContext}
                  onChange={(event) => setDraftClientContext(event.target.value)}
                  placeholder="Optional client details, background, or notes"
                  className="mt-2 min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                />
              </label>

              <p className="mt-3 text-xs text-slate-500">Fields marked with * are required.</p>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDraftClientAge(DEFAULT_CLIENT_DEMOGRAPHICS.age);
                    setDraftClientGender(DEFAULT_CLIENT_DEMOGRAPHICS.gender);
                    setDraftClientGenderAtBirth(DEFAULT_CLIENT_DEMOGRAPHICS.genderAtBirth);
                    setDraftClientSexualIdentity(DEFAULT_CLIENT_DEMOGRAPHICS.sexualIdentity);
                    setDraftClientState(DEFAULT_CLIENT_DEMOGRAPHICS.state);
                    setDraftClientPostcode(DEFAULT_CLIENT_DEMOGRAPHICS.postcode);
                    setDraftClientCountry(DEFAULT_CLIENT_DEMOGRAPHICS.country);
                    setDraftClientContext(DEFAULT_CLIENT_DEMOGRAPHICS.context);
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset Defaults
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
