"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CarePlanLanding() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");

  const go = () => {
    const id = sessionId.trim();
    if (!id) return;
    router.push(`/mia-audio-test-bench/care-plan/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-16 md:px-8">
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-teal-600">
            MIA · Care Plan
          </div>
          <h1 className="mb-6 text-2xl font-semibold">Generate Care Plan</h1>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Session ID
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go()}
              placeholder="e.g. f02796dc-fe96-48e4-89c4-7d9b44aa642f"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
            />
          </label>
          <button
            type="button"
            onClick={go}
            disabled={!sessionId.trim()}
            className="mt-4 w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Go to Care Plan
          </button>
        </div>
      </main>
    </div>
  );
}
