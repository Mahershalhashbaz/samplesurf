ALTER TABLE "Item" ADD COLUMN "videoDone" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Item" ADD COLUMN "videoDoneAt" DATETIME;
ALTER TABLE "Item" ADD COLUMN "videoSlaDays" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "Item" ADD COLUMN "videoNotes" TEXT;

-- Existing rows are considered completed per v4.2 assumptions.
UPDATE "Item"
SET
  "videoDone" = true,
  "videoDoneAt" = COALESCE("videoDoneAt", "receivedDate"),
  "videoSlaDays" = COALESCE("videoSlaDays", 14)
WHERE "videoDone" IS NULL OR "videoDoneAt" IS NULL OR "videoSlaDays" IS NULL;
