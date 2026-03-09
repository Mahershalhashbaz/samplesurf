import { notFound } from "next/navigation";

import { ItemDetailsEditor } from "@/components/ItemDetailsEditor";
import { gainLossCents } from "@/lib/accounting";
import { db } from "@/lib/db";
import { toDateInputValue } from "@/lib/dates";
import { formatCents } from "@/lib/money";

type PageProps = {
  params: { id: string };
};

export default async function ItemDetailsPage({ params }: PageProps) {
  const item = await db.item.findUnique({ where: { id: params.id } });

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="app-card">
        <h2 className="text-2xl font-semibold text-ink">Item Details</h2>
        <p className="text-sm text-slate1">Edit all fields and verify basis and gain/loss behavior.</p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <p>
            Receipt year: <span className="font-semibold">{item.receivedDate.getUTCFullYear()}</span>
          </p>
          <p>
            Disposed year: <span className="font-semibold">{item.soldDate ? item.soldDate.getUTCFullYear() : "-"}</span>
          </p>
          <p>
            Current gain/loss: <span className="font-semibold">{formatCents(gainLossCents(item))}</span>
          </p>
          <p>
            Received: <span className="font-semibold">{toDateInputValue(item.receivedDate)}</span>
          </p>
          <p>
            Disposed: <span className="font-semibold">{toDateInputValue(item.soldDate)}</span>
          </p>
          <p>
            Basis: <span className="font-semibold">{formatCents(item.receiptValueCents)}</span>
          </p>
        </div>
      </section>

      <ItemDetailsEditor
        item={{
          id: item.id,
          asin: item.asin,
          title: item.title,
          acquisitionType: item.acquisitionType as "SAMPLE" | "PURCHASED",
          dispositionType: item.dispositionType as "KEPT" | "SOLD" | "GAVE_AWAY",
          receivedDate: toDateInputValue(item.receivedDate),
          receiptValueCents: item.receiptValueCents,
          currency: item.currency,
          soldDate: toDateInputValue(item.soldDate) || null,
          saleProceedsCents: item.saleProceedsCents,
          notes: item.notes,
          videoDone: item.videoDone,
          videoDoneAt: toDateInputValue(item.videoDoneAt) || null,
          videoSlaDays: item.videoSlaDays,
          videoNotes: item.videoNotes,
        }}
      />
    </div>
  );
}
