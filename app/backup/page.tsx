import { BackupRestoreTool } from "@/components/BackupRestoreTool";
import { parseTaxYear } from "@/lib/year";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function firstString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function BackupPage({ searchParams }: PageProps) {
  const year = parseTaxYear(firstString(searchParams.year));

  return (
    <div className="space-y-6">
      <section className="app-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Backup & Restore - {year}</h2>
            <p className="text-sm text-slate1">
              Download a full CSV backup or restore from a prior backup dump.
            </p>
          </div>
          <span className="app-pill">Tax Year {year}</span>
        </div>
      </section>
      <BackupRestoreTool />
    </div>
  );
}
