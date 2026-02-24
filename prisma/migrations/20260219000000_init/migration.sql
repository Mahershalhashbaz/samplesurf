-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "acquisitionType" TEXT NOT NULL,
    "receivedDate" DATETIME NOT NULL,
    "receiptValueCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "soldDate" DATETIME,
    "saleProceedsCents" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Item_asin_idx" ON "Item"("asin");

-- CreateIndex
CREATE INDEX "Item_asin_receivedDate_idx" ON "Item"("asin", "receivedDate");

-- CreateIndex
CREATE INDEX "Item_receivedDate_idx" ON "Item"("receivedDate");

-- CreateIndex
CREATE INDEX "Item_soldDate_idx" ON "Item"("soldDate");
