"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Send, Radio, CheckCircle, FileSearch, Edit3, ClipboardList, RefreshCw, FileText, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const getMermaid = () =>
  (
    window as Window & {
      mermaid?: {
        initialize: (config: unknown) => void;
        render: (id: string, text: string) => Promise<{ svg: string }>;
      };
    }
  ).mermaid;

const flowChart = `
flowchart TD
    A(["▶ Start Audio Session<br/><small>POST /session<br/>mode=#quot;audio#quot;</small>"]):::start --> B["Send Audio Chunk<br/><small>POST /audio</small>"]
    B --> C["Poll for Feedback<br/><small>GET /feedback</small>"]
    C --> D{Audio Finished?}
    D -- No --> B
    D -- "Yes<br/><small>POST /audio<br/>final_chunk=true</small>" --> E["Get Session Details<br/><small>GET /session/{session_id}</small>"]
    E -- status=COMPLETED --> F["Review & Edit Session Details<br/><small>Put /session/{session_id}</small>"]
    F --> G{More Edits?}
    G -- Yes --> E
    G -- No --> H["Generate Care Plan<br/><small>POST /generate-care-plan</small>"]
    H --> I["Review & Edit Care Plan<br/><small>POST /generate-care-plan (with notes)<br/>GET /care-plan</small>"]
    I --> J{More Changes?}
    J -- Yes --> I
    J -- No --> K(["✓ Complete"]):::done

    classDef start fill:#6366f1,stroke:#4338ca,color:#fff,rx:20
    classDef done fill:#22c55e,stroke:#16a34a,color:#fff,rx:20
`;

const textFlowChart = `
flowchart TD
    A(["▶ Create Session<br/><small>POST /session<br/>mode=#quot;text#quot;</small>"]):::start --> B["Get Session Details<br/><small>GET /session/{session_id}</small>"]
    B -- status=COMPLETED --> C["Review & Edit Session Details<br/><small>PUT /session/{id}</small>"]
    C --> D{More Edits?}
    D -- Yes --> B
    D -- No --> E["Generate Care Plan<br/><small>POST /generate-care-plan</small>"]
    E --> F["Review & Edit Care Plan<br/><small>POST /generate-care-plan (with notes)<br/>GET /care-plan</small>"]
    F --> G{More Changes?}
    G -- Yes --> F
    G -- No --> H(["✓ Complete"]):::done

    classDef start fill:#0ea5e9,stroke:#0284c7,color:#fff,rx:20
    classDef done fill:#22c55e,stroke:#16a34a,color:#fff,rx:20
`;

type Phase = {
  id: number;
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  endpoints?: string[];
  loop?: string;
  colorFrom: string;
  colorTo: string;
  iconColor: string;
};

const phases: Phase[] = [
  {
    id: 1,
    icon: Mic,
    label: "Phase 1",
    title: "Start Audio Session",
    description:
      "Initialize a new clinical session. The API returns a unique session_id that must be passed with every subsequent request in this session.",
    endpoints: ["POST /start-session"],
    colorFrom: "from-indigo-50",
    colorTo: "to-white",
    iconColor: "text-indigo-500",
  },
  {
    id: 2,
    icon: Send,
    label: "Phase 2",
    title: "Send Audio",
    description:
      "Stream audio chunks to the API in real time. Each chunk is associated with the session_id and timestamped for ordering.",
    endpoints: ["POST /audio"],
    colorFrom: "from-violet-50",
    colorTo: "to-white",
    iconColor: "text-violet-500",
  },
  {
    id: 3,
    icon: Radio,
    label: "Phase 3",
    title: "Poll for Feedback",
    description:
      "While audio is streaming, poll the feedback endpoint to receive real-time clinical indicators, suggested questions, and domain completeness signals.",
    endpoints: ["GET /session-feedback"],
    loop: "Repeats until audio is marked as finished",
    colorFrom: "from-sky-50",
    colorTo: "to-white",
    iconColor: "text-sky-500",
  },
  {
    id: 4,
    icon: CheckCircle,
    label: "Phase 4",
    title: "Audio Finished",
    description:
      "Submit a final chunk with finish=true to signal the end of the audio stream. The API transitions the session into post-processing mode.",
    endpoints: ["POST /audio (final_chunk=true)"],
    colorFrom: "from-teal-50",
    colorTo: "to-white",
    iconColor: "text-teal-500",
  },
  {
    id: 5,
    icon: FileSearch,
    label: "Phase 5",
    title: "Get Session Details",
    description:
      "Poll the session details endpoint to retrieve the transcription summary, clinical assumptions, and flagged missing information once processing is complete.",
    endpoints: ["GET /session/details"],
    colorFrom: "from-emerald-50",
    colorTo: "to-white",
    iconColor: "text-emerald-500",
  },
  {
    id: 6,
    icon: Edit3,
    label: "Phase 6",
    title: "Edit Session Details",
    description:
      "The clinician reviews the session summary and can submit corrections or additional context. This loop continues until the clinician is satisfied.",
    endpoints: ["POST /session/{id}/update"],
    loop: "Edit loop — repeats until clinician confirms",
    colorFrom: "from-amber-50",
    colorTo: "to-white",
    iconColor: "text-amber-500",
  },
  {
    id: 7,
    icon: ClipboardList,
    label: "Phase 7",
    title: "Generate & Edit Care Plan",
    description:
      "Trigger care plan generation from the finalised session. The clinician can then iteratively edit and refine the care plan through an update loop until it is approved.",
    endpoints: ["POST /generate-care-plan", "POST /generate-care-plan (with notes)", "GET /care-plan/{id}"],
    loop: "Edit loop — repeats until care plan is approved",
    colorFrom: "from-rose-50",
    colorTo: "to-white",
    iconColor: "text-rose-500",
  },
];

function exportToPng(ref: React.RefObject<HTMLDivElement | null>, filename: string) {
  const svgEl = ref.current?.querySelector("svg");
  if (!svgEl) return;

  const svgData = new XMLSerializer().serializeToString(svgEl);
  // Use a data URI (not a blob URL) so the canvas is never tainted by
  // cross-origin resources embedded in the SVG (e.g. CDN-loaded fonts).
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0);
    const a = document.createElement("a");
    a.download = filename;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  img.src = dataUri;
}

export default function AudioUseCasePage() {
  const [activeTab, setActiveTab] = useState<"flow" | "text-flow" | "phases">("flow");
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isRenderingText, setIsRenderingText] = useState(false);
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const textDiagramRef = useRef<HTMLDivElement | null>(null);

  // Load mermaid once
  useEffect(() => {
    const initMermaid = () => {
      const mermaid = getMermaid();
      if (mermaid) {
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          flowchart: { curve: "basis", padding: 20 },
        });
        setMermaidLoaded(true);
      }
    };

    if (!getMermaid()) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js";
      script.async = true;
      script.onload = initMermaid;
      document.body.appendChild(script);
    } else {
      initMermaid();
    }
  }, []);

  // Render audio flow diagram
  useEffect(() => {
    let isMounted = true;
    const render = async () => {
      const mermaid = getMermaid();
      if (
        activeTab === "flow" &&
        mermaidLoaded &&
        mermaid &&
        diagramRef.current
      ) {
        setIsRendering(true);
        try {
          const id = `audio-flow-${Date.now()}`;
          diagramRef.current.innerHTML = "";
          const { svg } = await mermaid.render(id, flowChart);
          if (isMounted && diagramRef.current) {
            diagramRef.current.innerHTML = svg;
          }
        } catch (err) {
          console.error("Mermaid render error:", err);
        } finally {
          if (isMounted) setIsRendering(false);
        }
      }
    };
    render();
    return () => {
      isMounted = false;
    };
  }, [activeTab, mermaidLoaded]);

  // Render text-mode flow diagram
  useEffect(() => {
    let isMounted = true;
    const render = async () => {
      const mermaid = getMermaid();
      if (
        activeTab === "text-flow" &&
        mermaidLoaded &&
        mermaid &&
        textDiagramRef.current
      ) {
        setIsRenderingText(true);
        try {
          const id = `text-flow-${Date.now()}`;
          textDiagramRef.current.innerHTML = "";
          const { svg } = await mermaid.render(id, textFlowChart);
          if (isMounted && textDiagramRef.current) {
            textDiagramRef.current.innerHTML = svg;
          }
        } catch (err) {
          console.error("Mermaid text render error:", err);
        } finally {
          if (isMounted) setIsRenderingText(false);
        }
      }
    };
    render();
    return () => {
      isMounted = false;
    };
  }, [activeTab, mermaidLoaded]);

  const PhaseCard = ({ phase }: { phase: Phase }) => {
    const Icon = phase.icon;
    return (
      <div
        className={`rounded-2xl border bg-gradient-to-br ${phase.colorFrom} ${phase.colorTo} p-6 shadow-sm hover:shadow-md transition-shadow`}
      >
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 shrink-0 ${phase.iconColor}`}>
            <Icon size={28} />
          </div>
          <div className="min-w-0">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {phase.label}
            </span>
            <h3 className="mb-2 text-base font-bold text-slate-900">
              {phase.title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              {phase.description}
            </p>
            {phase.endpoints && phase.endpoints.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {phase.endpoints.map((ep) => (
                  <code
                    key={ep}
                    className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 ring-1 ring-slate-200"
                  >
                    {ep}
                  </code>
                ))}
              </div>
            )}
            {phase.loop && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                <RefreshCw size={11} />
                {phase.loop}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Page header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Mic size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Audio Use Case
              </h1>
              <p className="text-sm text-slate-500">
                End-to-end clinical audio session flow
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
            <button
              onClick={() => setActiveTab("flow")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                activeTab === "flow"
                  ? "bg-white shadow-sm text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Audio Flow
            </button>
            <button
              onClick={() => setActiveTab("text-flow")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                activeTab === "text-flow"
                  ? "bg-white shadow-sm text-sky-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Text Mode Flow
            </button>
            <button
              onClick={() => setActiveTab("phases")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                activeTab === "phases"
                  ? "bg-white shadow-sm text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Phases
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl p-4 md:p-8">
        {activeTab === "flow" ? (
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Audio Session — Full Flow
              </span>
              <div className="flex items-center gap-3">
                {(isRendering || !mermaidLoaded) && (
                  <span className="flex items-center gap-1.5 text-xs text-indigo-500 font-medium">
                    <RefreshCw size={12} className="animate-spin" />
                    Rendering…
                  </span>
                )}
                {!isRendering && mermaidLoaded && (
                  <button
                    onClick={() => exportToPng(diagramRef, "audio-flow.png")}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                  >
                    <Download size={12} />
                    Export PNG
                  </button>
                )}
              </div>
            </div>
            <div className="relative min-h-[560px] flex items-center justify-center p-6">
              {(isRendering || !mermaidLoaded) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80">
                  <RefreshCw size={32} className="animate-spin text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-500">
                    Generating diagram…
                  </span>
                </div>
              )}
              <div
                ref={diagramRef}
                className="w-full overflow-x-auto flex justify-center"
              />
            </div>
          </div>
        ) : activeTab === "text-flow" ? (
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-sky-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Text Mode — Session &amp; Care Plan Flow
                </span>
              </div>
              <div className="flex items-center gap-3">
                {(isRenderingText || !mermaidLoaded) && (
                  <span className="flex items-center gap-1.5 text-xs text-sky-500 font-medium">
                    <RefreshCw size={12} className="animate-spin" />
                    Rendering…
                  </span>
                )}
                {!isRenderingText && mermaidLoaded && (
                  <button
                    onClick={() => exportToPng(textDiagramRef, "text-mode-flow.png")}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm hover:border-sky-300 hover:text-sky-600 transition-colors"
                  >
                    <Download size={12} />
                    Export PNG
                  </button>
                )}
              </div>
            </div>
            <div className="relative min-h-[480px] flex items-center justify-center p-6">
              {(isRenderingText || !mermaidLoaded) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80">
                  <RefreshCw size={32} className="animate-spin text-sky-400" />
                  <span className="text-sm font-semibold text-sky-500">
                    Generating diagram…
                  </span>
                </div>
              )}
              <div
                ref={textDiagramRef}
                className="w-full overflow-x-auto flex justify-center"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {phases.map((phase) => (
              <PhaseCard key={phase.id} phase={phase} />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t bg-white/50 py-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
        <p>© 2024 MIA Integration Pilot • Audio Use Case</p>
      </footer>
    </div>
  );
}
