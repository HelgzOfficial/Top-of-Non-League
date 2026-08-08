"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pullResults } from "./actions";
import type { IngestResultSummary } from "@/lib/ingestResults";

export default function PullResults() {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const [summary, setSummary] = useState<IngestResultSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePull() {
    setPulling(true);
    setError(null);
    setSummary(null);
    const res = await pullResults();
    setPulling(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSummary(res.summary);
    router.refresh();
  }

  return (
    <div className="card !p-4 mb-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="font-extrabold text-[15px]">Results</span>
          <p className="text-[12px] text-sub mt-0.5">
            Pull the latest final scores from Football Web Pages right now, instead of waiting for the
            once-a-day automatic check.
          </p>
        </div>
        <button
          onClick={handlePull}
          disabled={pulling}
          className="btn-primary py-2.5 px-4 rounded-xl font-extrabold text-[13px] whitespace-nowrap"
        >
          {pulling ? "Pulling…" : "Pull results"}
        </button>
      </div>

      {error && <p className="text-red text-xs mt-3">{error}</p>}

      {summary && (
        <div className="mt-3 pt-3 border-t border-line text-[12.5px]">
          <p className="text-ink">
            Found {summary.fixturesParsed} finished fixture{summary.fixturesParsed === 1 ? "" : "s"} on
            the page, wrote {summary.resultsWritten}.
          </p>
          {summary.debug.unmatchedRows.length > 0 && (
            <div className="mt-2">
              <p className="text-subDim font-bold">Couldn&apos;t match a team name:</p>
              <ul className="text-subDim list-disc list-inside">
                {summary.debug.unmatchedRows.map((row, i) => (
                  <li key={i}>{row}</li>
                ))}
              </ul>
            </div>
          )}
          {summary.debug.writeErrors.length > 0 && (
            <div className="mt-2">
              <p className="text-red font-bold">Errors while saving:</p>
              <ul className="text-red list-disc list-inside">
                {summary.debug.writeErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
