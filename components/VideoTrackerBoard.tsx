"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

export type VideoTrackerRow = {
  id: string;
  asin: string;
  title: string;
  receivedDate: string;
  videoDone: boolean;
  videoDoneAt: string | null;
  videoSlaDays: number;
  videoNotes: string | null;
};

type VideoTrackerBoardProps = {
  rows: VideoTrackerRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSinceReceived(receivedDate: string): number {
  const received = new Date(`${receivedDate}T00:00:00.000Z`);
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const receivedUtc = Date.UTC(
    received.getUTCFullYear(),
    received.getUTCMonth(),
    received.getUTCDate(),
  );
  return Math.max(0, Math.floor((todayUtc - receivedUtc) / DAY_MS));
}

function sortNeedsVideo(a: VideoTrackerRow, b: VideoTrackerRow): number {
  const receivedCompare = a.receivedDate.localeCompare(b.receivedDate);
  if (receivedCompare !== 0) {
    return receivedCompare;
  }
  return a.title.localeCompare(b.title);
}

function sortCompleted(a: VideoTrackerRow, b: VideoTrackerRow): number {
  const doneCompare = (b.videoDoneAt ?? "").localeCompare(a.videoDoneAt ?? "");
  if (doneCompare !== 0) {
    return doneCompare;
  }
  return b.receivedDate.localeCompare(a.receivedDate);
}

function notesSnippet(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }
  return compact.length > 100 ? `${compact.slice(0, 100)}...` : compact;
}

export function VideoTrackerBoard({ rows: initialRows }: VideoTrackerBoardProps) {
  const [rows, setRows] = useState<VideoTrackerRow[]>(initialRows);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const needsVideo = useMemo(
    () => rows.filter((item) => item.videoDone === false).sort(sortNeedsVideo),
    [rows],
  );
  const completed = useMemo(
    () => rows.filter((item) => item.videoDone === true).sort(sortCompleted),
    [rows],
  );

  async function updateVideoStatus(id: string, videoDone: boolean) {
    if (pendingIds.has(id)) {
      return;
    }

    setError(null);
    const previousRows = rows;
    const optimisticDate = videoDone ? new Date().toISOString().slice(0, 10) : null;
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, videoDone, videoDoneAt: optimisticDate } : row,
      ),
    );

    setPendingIds((current) => new Set(current).add(id));

    try {
      const response = await fetch(`/api/items/${id}/video-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoDone }),
      });

      if (!response.ok) {
        setRows(previousRows);
        setError("Could not update video status. Please try again.");
        return;
      }

      const payload = (await response.json()) as {
        item: {
          id: string;
          videoDone: boolean;
          videoDoneAt: string | null;
        };
      };

      setRows((current) =>
        current.map((row) =>
          row.id === payload.item.id
            ? { ...row, videoDone: payload.item.videoDone, videoDoneAt: payload.item.videoDoneAt }
            : row,
        ),
      );
    } catch {
      setRows(previousRows);
      setError("Could not update video status. Please try again.");
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="app-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-ink">Needs Video</h3>
          <span className="app-pill">{needsVideo.length}</span>
        </div>

        <div className="space-y-3">
          {needsVideo.length === 0 ? (
            <p className="rounded-xl border border-[color:var(--border)] bg-ice/45 p-4 text-sm text-slate1">
              Nothing waiting right now.
            </p>
          ) : null}

          {needsVideo.map((item) => {
            const daysOpen = daysSinceReceived(item.receivedDate);
            const overdue = daysOpen > item.videoSlaDays;
            const isPending = pendingIds.has(item.id);
            const snippet = notesSnippet(item.videoNotes);

            return (
              <article
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4"
                data-testid={`video-needs-${item.asin}`}
                key={`todo-${item.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{item.title || "(missing title)"}</p>
                    <p className="mt-1 font-mono text-xs text-slate1">{item.asin}</p>
                  </div>
                  <button
                    className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5"
                    disabled={isPending}
                    onClick={() => {
                      void updateVideoStatus(item.id, true);
                    }}
                    type="button"
                  >
                    {isPending ? <Loader2 aria-hidden="true" className="animate-spin" size={14} /> : <CheckCircle2 aria-hidden="true" size={14} />}
                    Mark Done
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-ice px-2 py-0.5 text-ink">Received {item.receivedDate}</span>
                  <span className={`rounded-full px-2 py-0.5 ${overdue ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {daysOpen} days open
                  </span>
                  <span className="rounded-full bg-ice px-2 py-0.5 text-slate1">SLA {item.videoSlaDays}d</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {snippet ? <p className="text-slate1">Notes: {snippet}</p> : <p className="text-slate1">No video notes yet.</p>}
                  <Link className="text-[color:var(--brand-violet)] underline" href={`/items/${item.id}`}>
                    Edit notes
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="app-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-ink">Completed</h3>
          <span className="app-pill">{completed.length}</span>
        </div>

        <div className="space-y-3">
          {completed.length === 0 ? (
            <p className="rounded-xl border border-[color:var(--border)] bg-ice/45 p-4 text-sm text-slate1">
              No completed videos yet.
            </p>
          ) : null}

          {completed.map((item) => {
            const isPending = pendingIds.has(item.id);
            return (
              <article
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4"
                data-testid={`video-done-${item.asin}`}
                key={`done-${item.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{item.title || "(missing title)"}</p>
                    <p className="mt-1 font-mono text-xs text-slate1">{item.asin}</p>
                  </div>
                  <button
                    className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5"
                    disabled={isPending}
                    onClick={() => {
                      void updateVideoStatus(item.id, false);
                    }}
                    type="button"
                  >
                    {isPending ? <Loader2 aria-hidden="true" className="animate-spin" size={14} /> : <Circle aria-hidden="true" size={14} />}
                    Mark Not Done
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-ice px-2 py-0.5 text-ink">Received {item.receivedDate}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                    Completed {item.videoDoneAt ?? "-"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
