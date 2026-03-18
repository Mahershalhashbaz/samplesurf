CREATE TABLE "FnskuResolutionCache" (
  "fnskuCode" TEXT NOT NULL PRIMARY KEY,
  "asin" TEXT NOT NULL,
  "resolvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "FnskuResolutionCache_resolvedAt_idx" ON "FnskuResolutionCache"("resolvedAt");
