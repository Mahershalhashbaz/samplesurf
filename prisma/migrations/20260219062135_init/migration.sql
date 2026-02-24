-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "acquisitionType" TEXT NOT NULL DEFAULT 'SAMPLE',
    "receivedDate" DATETIME NOT NULL,
    "receiptValueCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "soldDate" DATETIME,
    "saleProceedsCents" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Item" ("acquisitionType", "asin", "createdAt", "currency", "id", "notes", "receiptValueCents", "receivedDate", "saleProceedsCents", "soldDate", "title", "updatedAt") SELECT "acquisitionType", "asin", "createdAt", "currency", "id", "notes", "receiptValueCents", "receivedDate", "saleProceedsCents", "soldDate", "title", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE INDEX "Item_asin_idx" ON "Item"("asin");
CREATE INDEX "Item_asin_receivedDate_idx" ON "Item"("asin", "receivedDate");
CREATE INDEX "Item_receivedDate_idx" ON "Item"("receivedDate");
CREATE INDEX "Item_soldDate_idx" ON "Item"("soldDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
