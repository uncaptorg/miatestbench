"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from 'react';
import { Activity, ClipboardCheck, FileText, ChevronRight, Info, Layers, RefreshCw, Send, Search, PlayCircle, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';


export default function MiaApiPage() {
  const [activeTab, setActiveTab] = useState('flow');
  const [isRendering, setIsRendering] = useState(false);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const mermaidRef = useRef<HTMLDivElement | null>(null);

  const getMermaid = () => (window as Window & { mermaid?: {
    initialize: (config: unknown) => void;
    render: (id: string, text: string) => Promise<{ svg: string }>;
  } }).mermaid;

  const mermaidChart = `
    sequenceDiagram
      autonumber
      participant Client as Innowell App
      participant Scribe as MIA Scribe Endpoint API
      participant Innowell as MIA Innowell Endpoint API
      participant Recs as MIA Care Plan Endpoint API

      Note over Client, Scribe: Phase 0: Session Initialization
      Client->>Scribe: POST /start-session (Patient Basic Details + Session Metadata)
      Scribe-->>Client: 201 Created (session_id)

      Note over Client, Scribe: Phase 1: Real-Time Session
      loop Every 15-30 seconds
          Client->>Scribe: POST /audio-chunk (session_id, data)
          Scribe-->>Client: 202 Accepted
          
          Client->>Scribe: GET /session-feedback (session_id)
          Scribe-->>Client: 200 OK ( 1-3 Questions + Domain Completeness Indicators)
      end

      Note over Client, Scribe: Phase 2: Post-Session Processing
      Client->>Scribe: POST /finalise-session (session_id)
      Scribe-->>Client: 202 Processing
      
      loop Until Processing Complete
          Client->>Scribe: GET /session/status (session_id)
          Scribe-->>Client: 200 OK (Status = processing | completed | failed)
      end
      Client->>Scribe: GET /session/details (session_id)
      Scribe-->>Client: 200 OK (Full Transcript, Summary Notes, Audio file url)

      Note over Client, Innowell: Phase 3: Questionnaire Automation
      Client->>Innowell: POST /map-questionnaire (session_id, context)
      Innowell-->>Client: 200 OK (Pre-filled Answers with confidence scores)

      Note over Client, Recs: Phase 4: Care Planning (Async)
      Client->>Recs: POST /generate-care-plan (session_id)
      Recs-->>Client: 202 Accepted (plan_id)
      
      loop Until Plan Ready (Status is 'completed')
          Client->>Recs: GET /care-plan/{plan_id}/status (Poll)
          Recs-->>Client: 200 OK (status: processing | completed | failed)
          Client->>Recs: GET /care-plan/{plan_id} (Retrieve final plan once completed)
          Recs-->>Client: 200 OK (Care Plan Details)
      end
      
      Note right of Client: Clinician Review/Edit Loop
  `;

  useEffect(() => {
    let script;
    const initMermaid = () => {
      const mermaid = getMermaid();
      if (mermaid) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          sequence: {
            showSequenceNumbers: true,
            actorMargin: 50,
            messageFontSize: 12,
          }
        });
        setMermaidLoaded(true);
      }
    };

    if (!getMermaid()) {
      script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
      script.async = true;
      script.onload = initMermaid;
      document.body.appendChild(script);
    } else {
      initMermaid();
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const render = async () => {
      const mermaid = getMermaid();
      if (activeTab === 'flow' && mermaidLoaded && mermaid && mermaidRef.current) {
        setIsRendering(true);
        try {
          const id = `mermaid-render-${Date.now()}`;
          mermaidRef.current.innerHTML = '';
          const { svg } = await mermaid.render(id, mermaidChart);
          if (isMounted && mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
          }
        } catch (err) {
          console.error("Mermaid error:", err);
        } finally {
          if (isMounted) setIsRendering(false);
        }
      }
    };
    render();
    return () => { isMounted = false; };
  }, [activeTab, mermaidLoaded, mermaidChart]);

  const exportFlowAsPng = async () => {
    const container = mermaidRef.current;
    if (!container) return;

    const svgElement = container.querySelector('svg');
    if (!svgElement) return;

    setIsExporting(true);
    try {
      const serializer = new XMLSerializer();
      const svgContent = serializer.serializeToString(svgElement);
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Failed to load diagram image for export.'));
        image.src = svgUrl;
      });

      const viewBox = svgElement.viewBox?.baseVal;
      const width = viewBox?.width && viewBox.width > 0 ? viewBox.width : image.width;
      const height = viewBox?.height && viewBox.height > 0 ? viewBox.height : image.height;
      const scale = 2;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));

      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(svgUrl);
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, width, height);

      URL.revokeObjectURL(svgUrl);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'mia-api-flow-diagram.png';
      downloadLink.click();
    } catch (error) {
      console.error('Failed to export diagram as PNG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  type ApiCardProps = {
    icon: LucideIcon;
    title: string;
    type: 'GET' | 'POST';
    endpoint: string;
    description: string;
    colorClass: string;
  };

  const ApiCard = ({ icon: Icon, title, type, endpoint, description, colorClass }: ApiCardProps) => (
    <div className={`p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow ${colorClass}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-50 text-gray-700">
            <Icon size={24} />
          </div>
          <h3 className="font-bold text-lg text-gray-900">{title}</h3>
        </div>
        <span className={`text-[10px] font-mono px-2 py-1 rounded border ${type === 'GET' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
          {type}
        </span>
      </div>
      <code className="block text-[11px] bg-slate-50 p-2 rounded mb-4 text-blue-600 font-mono overflow-x-auto whitespace-nowrap">
        {endpoint}
      </code>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">{description}</p>
      <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
        <Send size={14} /> {type === 'POST' ? 'Initial Request' : 'Polling / Retrieval'}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">M</div>
            <span className="font-bold text-xl tracking-tight text-slate-900">MIA Dev Hub</span>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('flow')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'flow' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sequence
            </button>
            <button 
              onClick={() => setActiveTab('details')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'details' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Endpoints
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {activeTab === 'flow' ? (
          <div className="space-y-6">
            <div className="bg-white p-4 md:p-8 rounded-2xl border shadow-sm relative min-h-[500px] flex flex-col items-center justify-center">
              <div className="absolute top-4 left-4 flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-widest">
                <Search size={14} />
                <span>Asynchronous API Call Flow</span>
              </div>
              <button
                onClick={exportFlowAsPng}
                disabled={isRendering || !mermaidLoaded || isExporting}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-md text-xs font-semibold border bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'Exporting...' : 'Export PNG'}
              </button>
              
              {(isRendering || !mermaidLoaded) && (
                <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center gap-4 text-indigo-500 font-bold">
                  <RefreshCw className="animate-spin" size={32} />
                  <span>Generating Workflow...</span>
                </div>
              )}

              <div ref={mermaidRef} className="w-full overflow-x-auto py-8 flex justify-center min-h-[400px]"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ApiCard 
              icon={FileText}
              title="Initiate Plan"
              type="POST"
              endpoint="/api/v1/recommendations/generate"
              colorClass="border-purple-100"
              description="Triggers the care plan generation job for a specific session_id. Returns a plan_id."
            />
            <ApiCard 
              icon={Clock}
              title="Pull Care Plan"
              type="GET"
              endpoint="/api/v1/recommendations/plan/{plan_id}"
              colorClass="border-amber-100"
              description="Poll this endpoint using the plan_id to retrieve the final generated plan once the clinical reasoning engine finishes."
            />
             <ApiCard 
              icon={PlayCircle}
              title="Start Session"
              type="POST"
              endpoint="/api/v1/scribe/start-session"
              colorClass="border-indigo-100"
              description="Initializes the clinical session. Returns a unique 'session_id' required for all subsequent calls."
            />
          </div>
        )}
      </main>

      <footer className="mt-12 border-t py-8 bg-white/50 text-slate-400 text-[10px] text-center uppercase tracking-[0.2em] font-bold">
        <p>© 2024 MIA Integration Pilot • v1.6.0 (Async Care Planning)</p>
      </footer>
    </div>
  );
}