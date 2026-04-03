import { AlarmClock, CalendarClock, CheckCircle2, ListTodo, Timer } from "lucide-react";

import { VideoTrackerBoard, type VideoTrackerRow } from "@/components/VideoTrackerBoard";
import { toDateInputValue } from "@/lib/dates";
import { getVideoTrackerData } from "@/lib/queries";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSinceUtc(date: Date): number {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const itemUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.max(0, Math.floor((todayUtc - itemUtc) / DAY_MS));
}

export default async function VideoTrackerPage() {
  const { needsVideo, completed } = await getVideoTrackerData();

  const openVideos = needsVideo.length;
  const overdueCount = needsVideo.filter((item) => daysSinceUtc(item.receivedDate) > 14).length;
  const dueSoonCount = needsVideo.filter((item) => {
    const age = daysSinceUtc(item.receivedDate);
    return age > 10 && age <= 14;
  }).length;
  const oldestOpenDays = needsVideo.length
    ? Math.max(...needsVideo.map((item) => daysSinceUtc(item.receivedDate)))
    : null;
  const sevenDaysAgo = Date.now() - 7 * DAY_MS;
  const completedThisWeek = completed.filter(
    (item) => item.videoDoneAt && item.videoDoneAt.getTime() >= sevenDaysAgo,
  ).length;

  const rows: VideoTrackerRow[] = [...needsVideo, ...completed].map((item) => ({
    id: item.id,
    asin: item.asin,
    title: item.title,
    receivedDate: toDateInputValue(item.receivedDate),
    videoDone: item.videoDone,
    videoDoneAt: toDateInputValue(item.videoDoneAt) || null,
    videoSlaDays: item.videoSlaDays,
    videoNotes: item.videoNotes,
  }));

  return (
    <div className="space-y-3 md:space-y-5">
      <section className="app-card ui-fade-up" style={{ animationDelay: "30ms" }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink md:text-2xl">Video Tracker</h2>
            <p className="text-sm text-slate1">
              Track which items still need a video and quickly mark completed uploads.
            </p>
          </div>
          <span className="app-pill">All Items</span>
        </div>
      </section>

      <section className="app-card ui-fade-up p-4 md:p-5" style={{ animationDelay: "70ms" }}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          <CompactMetric icon={ListTodo} label="Open Videos" value={String(openVideos)} />
          <CompactMetric icon={AlarmClock} label="Overdue" value={String(overdueCount)} />
          <CompactMetric icon={CalendarClock} label="Due Soon" value={String(dueSoonCount)} />
          <CompactMetric
            icon={Timer}
            label="Oldest Open"
            value={oldestOpenDays === null ? "-" : `${oldestOpenDays}d`}
          />
          <CompactMetric
            icon={CheckCircle2}
            label="Completed This Week"
            value={String(completedThisWeek)}
          />
        </div>
      </section>

      <div className="ui-fade-up" style={{ animationDelay: "110ms" }}>
        <VideoTrackerBoard rows={rows} />
      </div>
    </div>
  );
}

function CompactMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ListTodo;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-ice/40 p-3">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate1">
        <Icon aria-hidden="true" size={13} />
        {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold text-ink md:text-xl">{value}</p>
    </div>
  );
}
