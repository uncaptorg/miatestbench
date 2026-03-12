"use client";

import { Mic, Square, Play, LoaderCircle, Activity } from "lucide-react";
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
  next_expected_sequence?: number;
  illness_type_stage_and_trajectory_score?: number;
  suicidal_thoughts_and_behaviours_score?: number;
  social_and_occupational_functioning_score?: number;
  alcohol_and_substance_misuse_score?: number;
  physical_health_score?: number;
};

type SessionInfoResponse = {
  status?: string;
  missing_information?: string[];
};

type TranscriptionSegment = {
  start?: number;
  end?: number;
  text?: string;
  speaker?: string;
};

type TranscriptionResponse = {
  segments?: TranscriptionSegment[];
  transcription?: string;
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

type FeedbackScores = Record<FeedbackScoreKey, number>;

const SCORE_FIELDS: Array<{ key: FeedbackScoreKey; label: string }> = [
  { key: "illness_type_stage_and_trajectory_score", label: "Illness Type Stage & Trajectory" },
  { key: "suicidal_thoughts_and_behaviours_score", label: "Suicidal Thoughts & Behaviours" },
  { key: "social_and_occupational_functioning_score", label: "Social & Occupational Functioning" },
  { key: "alcohol_and_substance_misuse_score", label: "Alcohol & Substance Misuse" },
  { key: "physical_health_score", label: "Physical Health" },
];

const createDefaultFeedbackScores = (): FeedbackScores => ({
  illness_type_stage_and_trajectory_score: 0,
  suicidal_thoughts_and_behaviours_score: 0,
  social_and_occupational_functioning_score: 0,
  alcohol_and_substance_misuse_score: 0,
  physical_health_score: 0,
});

const RECORDING_TIMESLICE_MS = 5000;
const POLLING_INTERVAL_MS = 3000;
const PROXY_BASE_PATH = "/api/mia";

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptionPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldFinalizeOnStopRef = useRef(false);
  const sequenceNumberRef = useRef(0);

  const [proxyToken, setProxyToken] = useState("");
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");
  const [isLoadingAudioInputs, setIsLoadingAudioInputs] = useState(false);
  const [environmentOptions, setEnvironmentOptions] = useState<EnvironmentOption[]>(DEFAULT_ENVIRONMENT_OPTIONS);
  const [selectedEnvironment, setSelectedEnvironment] = useState<MiaEnvironment>("local");
  const [clientAge, setClientAge] = useState(10);
  const [clientState, setClientState] = useState("NSW");
  const [clientPostcode, setClientPostcode] = useState("2200");
  const [clientCountry, setClientCountry] = useState("AU");
  const [enableGuidance, setEnableGuidance] = useState(true);
  const [clientContext, setClientContext] = useState("string");
  const [clinicContext, setClinicContext] = useState("string");
  const [sessionId, setSessionId] = useState("");
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [finalizeOnStop, setFinalizeOnStop] = useState(true);

  const [sequenceNumber, setSequenceNumber] = useState(0);
  const [lastSequenceProcessed, setLastSequenceProcessed] = useState<number | null>(null);
  const [nextExpectedSequence, setNextExpectedSequence] = useState<number | null>(null);
  const [summaryNotes, setSummaryNotes] = useState("");
  const [promptQuestions, setPromptQuestions] = useState<string[]>([]);
  const [feedbackScores, setFeedbackScores] = useState<FeedbackScores>(createDefaultFeedbackScores);
  const [status, setStatus] = useState("IDLE");
  const [missingInformation, setMissingInformation] = useState<string[]>([]);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([]);
  const [isFetchingTranscription, setIsFetchingTranscription] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState("");
  const [awaitingReadyTranscription, setAwaitingReadyTranscription] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasSession = sessionId.trim().length > 0;

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
        setTranscriptionText(typeof data.transcription === "string" ? data.transcription : "");
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

  const pollFeedbackAndSessionInfo = async (currentSessionId: string) => {
    if (!currentSessionId) {
      return;
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
        if (typeof feedback.next_expected_sequence === "number") {
          setNextExpectedSequence(feedback.next_expected_sequence);
        }

        setFeedbackScores({
          illness_type_stage_and_trajectory_score:
            typeof feedback.illness_type_stage_and_trajectory_score === "number"
              ? feedback.illness_type_stage_and_trajectory_score
              : 0,
          suicidal_thoughts_and_behaviours_score:
            typeof feedback.suicidal_thoughts_and_behaviours_score === "number"
              ? feedback.suicidal_thoughts_and_behaviours_score
              : 0,
          social_and_occupational_functioning_score:
            typeof feedback.social_and_occupational_functioning_score === "number"
              ? feedback.social_and_occupational_functioning_score
              : 0,
          alcohol_and_substance_misuse_score:
            typeof feedback.alcohol_and_substance_misuse_score === "number"
              ? feedback.alcohol_and_substance_misuse_score
              : 0,
          physical_health_score:
            typeof feedback.physical_health_score === "number" ? feedback.physical_health_score : 0,
        });
      }

      if (sessionInfoRes.ok) {
        const info = (await sessionInfoRes.json()) as SessionInfoResponse;
        const nextStatus = info.status ?? "UNKNOWN";
        setStatus(nextStatus);
        setMissingInformation(Array.isArray(info.missing_information) ? info.missing_information : []);

        if (nextStatus === "READY" && awaitingReadyTranscription && !isFetchingTranscription) {
          setAwaitingReadyTranscription(false);
          void fetchTranscription(currentSessionId);
          stopPolling();
          stopTranscriptionPolling();
        }
      }
    } catch {
      setErrorMessage("Polling failed. Check network/API availability.");
    }
  };

  const startPolling = (currentSessionId: string) => {
    stopPolling();
    void pollFeedbackAndSessionInfo(currentSessionId);
    pollingRef.current = setInterval(() => {
      void pollFeedbackAndSessionInfo(currentSessionId);
    }, POLLING_INTERVAL_MS);
  };

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
      } else {
        setLastSequenceProcessed(currentSequence);
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
      const normalizedAge = Number.isFinite(clientAge) ? Math.max(0, clientAge) : 0;

      const response = await fetch(buildUrl("/v1/mia/sessions"), {
        method: "POST",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          client: {
            age: normalizedAge,
            state: clientState,
            postcode: clientPostcode,
            country: clientCountry,
          },
          enable_guidance: enableGuidance,
          client_context: clientContext,
          clinic_context: clinicContext,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Session start failed"));
      }

      const data = (await response.json()) as SessionResponse;
      setSessionId(data.session_id);
      syncSequenceNumber(0);
      setLastSequenceProcessed(null);
      setNextExpectedSequence(null);
      setSummaryNotes("");
      setPromptQuestions([]);
      setFeedbackScores(createDefaultFeedbackScores());
      setMissingInformation([]);
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
      setStatus("PROCESSING");
      startPolling(sessionId);
    } else {
      stopPolling();
    }
  };

  const startRecording = async () => {
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
                Client Age
                <input
                  type="number"
                  min={0}
                  value={clientAge}
                  onChange={(event) => setClientAge(Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Client State
                  <input
                    value={clientState}
                    onChange={(event) => setClientState(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                  />
                </label>

                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Client Postcode
                  <input
                    value={clientPostcode}
                    onChange={(event) => setClientPostcode(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                  />
                </label>
              </div>

              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                Client Country
                <input
                  value={clientCountry}
                  onChange={(event) => setClientCountry(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                />
              </label>

              <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span>Enable Guidance</span>
                <input
                  type="checkbox"
                  checked={enableGuidance}
                  onChange={(event) => setEnableGuidance(event.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
              </label>

              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                Client Context
                <input
                  value={clientContext}
                  onChange={(event) => setClientContext(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                />
              </label>

              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                Clinic Context
                <input
                  value={clinicContext}
                  onChange={(event) => setClinicContext(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
                />
              </label>

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
                  Start Session
                </button>

                {!isRecording ? (
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

              <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span>Finalize on stop (send final chunk)</span>
                <input
                  type="checkbox"
                  checked={finalizeOnStop}
                  onChange={(event) => setFinalizeOnStop(event.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
              </label>
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
                  onClick={() => void fetchTranscription(sessionId)}
                  disabled={!hasSession || status !== "READY" || isFetchingTranscription}
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
                  <li>next_expected_sequence: {nextExpectedSequence ?? "—"}</li>
                  <li>next_upload_sequence: {sequenceNumber}</li>
                  <li>recorder_state: {isRecording ? "RECORDING" : "STOPPED"}</li>
                  <li>upload_state: {isUploading ? "UPLOADING" : "IDLE"}</li>
                </ul>
              </div>

              <div className="rounded-lg border bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-semibold">Missing Information</h3>
                {missingInformation.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {missingInformation.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No missing information reported.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">Summary Notes</h2>
            <div className="min-h-48 rounded-lg border bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {summaryNotes || "Waiting for feedback..."}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">Suggested Next Questions</h2>
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
        </section>

        <section>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Feedback Scores</h2>
            <div className="space-y-3">
              {SCORE_FIELDS.map((field) => {
                const value = feedbackScores[field.key] ?? 0;
                const widthPercent = Math.max(0, Math.min(100, (value / SCORE_MAX) * 100));

                return (
                  <div key={field.key}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                      <span>{field.label}</span>
                      <span className="font-semibold">{value}/100</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-indigo-600 transition-all"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Session Transcription</h2>
              <span className="text-xs text-slate-500">Available when status is READY</span>
            </div>

            {status === "READY" ? (
              <>
                <textarea
                  value={transcriptionText}
                  readOnly
                  placeholder="Transcription will appear here after processing completes."
                  className="min-h-40 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                />

                {transcriptionSegments.length > 0 ? (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold">Segments</h3>
                <div className="space-y-2">
                  {transcriptionSegments.map((segment, index) => (
                    <div key={`${segment.start}-${segment.end}-${index}`} className="rounded-md border border-slate-200 p-3">
                      <div className="mb-1 text-xs text-slate-500">
                        {(segment.start ?? 0).toFixed(1)}s - {(segment.end ?? 0).toFixed(1)}s
                        {segment.speaker ? ` • ${segment.speaker}` : ""}
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
                Transcription details will appear automatically after final chunk upload when status becomes READY.
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
      </main>
    </div>
  );
}
