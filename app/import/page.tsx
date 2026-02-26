import { ImportCsvTool } from "@/components/ImportCsvTool";
import { parseTaxYear } from "@/lib/year";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function firstString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function ImportPage({ searchParams }: PageProps) {
  const year = parseTaxYear(firstString(searchParams.year));

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="app-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink md:text-2xl">Import CSV - {year}</h2>
            <p className="text-sm text-slate1">
              Map columns, preview validation, import valid rows, and download rejected-row report.
            </p>
          </div>
          <span className="app-pill">Tax Year {year}</span>
        </div>
        <p className="mt-3 text-sm">
          Template: <a className="underline" href="/sample-import-template.csv">sample-import-template.csv</a>
        </p>
      </section>
      <ImportCsvTool />
    </div>
  );
}
