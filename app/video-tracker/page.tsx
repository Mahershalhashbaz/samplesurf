import { VideoTrackerBoard, type VideoTrackerRow } from "@/components/VideoTrackerBoard";
import { toDateInputValue } from "@/lib/dates";
import { getVideoTrackerData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function VideoTrackerPage() {
  const { needsVideo, completed } = await getVideoTrackerData();

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
    <div className="space-y-4 md:space-y-6">
      <section className="app-card">
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

      <VideoTrackerBoard rows={rows} />
    </div>
  );
}
