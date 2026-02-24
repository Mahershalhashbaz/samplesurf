import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Item not found</h2>
      <p className="mt-1 text-sm text-slate-600">The requested record does not exist.</p>
      <Link className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium" href="/items">
        Back to Inventory
      </Link>
    </div>
  );
}
