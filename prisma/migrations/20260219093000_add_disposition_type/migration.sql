-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "acquisitionType" TEXT NOT NULL DEFAULT 'SAMPLE',
    "dispositionType" TEXT NOT NULL DEFAULT 'KEPT',
    "receivedDate" DATETIME NOT NULL,
    "receiptValueCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "soldDate" DATETIME,
    "saleProceedsCents" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Item" (
  "id",
  "asin",
  "title",
  "acquisitionType",
  "dispositionType",
  "receivedDate",
  "receiptValueCents",
  "currency",
  "soldDate",
  "saleProceedsCents",
  "notes",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "asin",
  "title",
  "acquisitionType",
  CASE
    WHEN "soldDate" IS NULL THEN 'KEPT'
    WHEN "saleProceedsCents" IS NULL THEN 'SOLD'
    WHEN "saleProceedsCents" = 0 THEN 'GAVE_AWAY'
    ELSE 'SOLD'
  END AS "dispositionType",
  "receivedDate",
  "receiptValueCents",
  "currency",
  "soldDate",
  "saleProceedsCents",
  "notes",
  "createdAt",
  "updatedAt"
FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE INDEX "Item_asin_idx" ON "Item"("asin");
CREATE INDEX "Item_asin_receivedDate_idx" ON "Item"("asin", "receivedDate");
CREATE INDEX "Item_receivedDate_idx" ON "Item"("receivedDate");
CREATE INDEX "Item_soldDate_idx" ON "Item"("soldDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
