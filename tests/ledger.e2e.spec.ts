import { expect, test, type Page } from "@playwright/test";

function uniqueAsin(prefix: string) {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-7);
  return `${prefix}${suffix}`.toUpperCase().slice(0, 10);
}

function baseCreatePayload(asin: string, receivedDate: string) {
  return {
    asin,
    title: `Item ${asin}`,
    acquisitionType: "SAMPLE" as const,
    dispositionType: "KEPT" as const,
    receivedDate,
    receiptValueCents: 1000,
    currency: "USD",
    soldDate: null,
    saleProceedsCents: null,
    notes: null,
  };
}

function parseCurrencyValue(text: string): number {
  const match = text.replace(/,/g, "").match(/-?\$\d+(?:\.\d{2})?|\$-?\d+(?:\.\d{2})?/);
  if (!match) {
    throw new Error(`No currency value found in: ${text}`);
  }

  return Number.parseFloat(match[0].replace("$", ""));
}

async function readCardCurrencyValue(page: Page, testId: string): Promise<number> {
  const text = (await page.getByTestId(testId).innerText()).trim();
  return parseCurrencyValue(text);
}

test("sample received in 2025 is recognized as 2025 gross sample income", async ({ page }) => {
  const asin = uniqueAsin("BGSI");

  await page.goto("/items/new?year=2025");
  await page.getByTestId("add-asin").fill(asin);
  await page.getByTestId("add-title").fill("Gross Sample Income Test");
  await page.getByTestId("add-acquisition-type").selectOption("SAMPLE");
  await page.getByTestId("add-disposition-type").selectOption("KEPT");
  await page.getByTestId("add-received-date").fill("2025-05-14");
  await page.getByTestId("add-receipt-value").fill("100.00");
  await page.getByTestId("add-save").click();

  await expect(page.getByText("Item saved.")).toBeVisible();

  await page.goto("/tax-year?year=2025");
  await expect(page.getByTestId(`tax-a-row-${asin}`)).toBeVisible();
});

test("GAVE_AWAY in 2026 creates negative disposition loss and affects loss/net cards", async ({ page }) => {
  const asin = uniqueAsin("BGAV");

  await page.goto("/?year=2026");
  const baselineLoss = await readCardCurrencyValue(page, "tax-summary-loss");
  const baselineNet = await readCardCurrencyValue(page, "tax-summary-net");

  await page.goto("/items/new?year=2025");
  await page.getByTestId("add-asin").fill(asin);
  await page.getByTestId("add-title").fill("Give Away Loss Test");
  await page.getByTestId("add-acquisition-type").selectOption("SAMPLE");
  await page.getByTestId("add-disposition-type").selectOption("KEPT");
  await page.getByTestId("add-received-date").fill("2025-06-15");
  await page.getByTestId("add-receipt-value").fill("120.00");
  await page.getByTestId("add-save").click();

  await page.getByRole("link", { name: "Open Item Details" }).click();
  await page.getByLabel("Disposition Type").selectOption("GAVE_AWAY");
  await page.getByLabel("Disposed Date").fill("2026-02-01");
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await page.goto("/tax-year?year=2026");
  const row = page.getByTestId(`tax-b-row-${asin}`);
  await expect(row).toBeVisible();
  await expect(row).toContainText("GAVE_AWAY");
  await expect(row).toContainText("-$120.00");

  await page.goto("/?year=2026");
  const updatedLoss = await readCardCurrencyValue(page, "tax-summary-loss");
  const updatedNet = await readCardCurrencyValue(page, "tax-summary-net");

  expect(Math.round((updatedLoss - baselineLoss) * 100)).toBe(12_000);
  expect(Math.round((updatedNet - baselineNet) * 100)).toBe(-12_000);
});

test("global year selector persists through URL and localStorage", async ({ page }) => {
  await page.goto("/?year=2025");
  await page.getByTestId("global-tax-year").selectOption("2026");

  await expect(page).toHaveURL(/\?year=2026/);

  const storedYear = await page.evaluate(() => window.localStorage.getItem("sample-ledger.taxYear"));
  expect(storedYear).toBe("2026");

  await page.goto("/");
  await expect(page).toHaveURL(/\?year=2026/);
});

test("api rejects duplicate ASIN unless allowDuplicate=true", async ({ request }) => {
  const asin = uniqueAsin("DUPA");

  const first = await request.post("/api/items", {
    data: baseCreatePayload(asin, "2026-01-10"),
  });
  expect(first.status()).toBe(201);

  const duplicate = await request.post("/api/items", {
    data: baseCreatePayload(asin, "2026-01-11"),
  });
  expect(duplicate.status()).toBe(409);
  const duplicatePayload = (await duplicate.json()) as {
    error?: string;
    message?: string;
    existingItemId?: string;
  };
  expect(duplicatePayload.error).toBe("DUPLICATE_ASIN");
  expect(duplicatePayload.message).toContain("already added");
  expect(Boolean(duplicatePayload.existingItemId)).toBe(true);

  const allowed = await request.post("/api/items", {
    data: {
      ...baseCreatePayload(asin, "2026-01-12"),
      allowDuplicate: true,
    },
  });
  expect(allowed.status()).toBe(201);
});

test("add item UI warns on duplicate ASIN and blocks save until Add anyway", async ({ page, request }) => {
  const asin = uniqueAsin("DUPU");

  const existing = await request.post("/api/items", {
    data: baseCreatePayload(asin, "2026-02-10"),
  });
  expect(existing.status()).toBe(201);

  await page.goto("/items/new?year=2026");
  await page.getByTestId("add-asin").fill(asin);

  await expect(page.getByTestId("duplicate-warning-banner")).toBeVisible();
  await expect(page.getByTestId("add-save")).toBeDisabled();

  await page.getByTestId("add-title").fill("Intentional Duplicate");
  await page.getByTestId("add-receipt-value").fill("25.00");
  await page.getByRole("button", { name: "Add anyway" }).click();
  await expect(page.getByTestId("add-save")).toBeEnabled();

  await page.getByTestId("add-save").click();
  await expect(page.getByText("Item saved.")).toBeVisible();
});

test("csv import skips duplicate ASIN rows by default", async ({ request }) => {
  const existingAsin = uniqueAsin("DUPC");
  const uniqueImportAsin = uniqueAsin("UNIQ");

  const created = await request.post("/api/items", {
    data: baseCreatePayload(existingAsin, "2026-03-01"),
  });
  expect(created.status()).toBe(201);

  const response = await request.post("/api/import", {
    data: {
      allowDuplicates: false,
      rows: [
        {
          rowNumber: 2,
          asin: existingAsin,
          title: "Duplicate from CSV",
          acquisitionType: "SAMPLE",
          dispositionType: "KEPT",
          receivedDate: "2026-03-02",
          receiptValueCents: 1500,
          soldDate: null,
          saleProceedsCents: null,
          notes: null,
          currency: "USD",
        },
        {
          rowNumber: 3,
          asin: uniqueImportAsin,
          title: "Unique from CSV",
          acquisitionType: "SAMPLE",
          dispositionType: "KEPT",
          receivedDate: "2026-03-03",
          receiptValueCents: 2000,
          soldDate: null,
          saleProceedsCents: null,
          notes: null,
          currency: "USD",
        },
      ],
    },
  });

  expect(response.status()).toBe(200);
  const payload = (await response.json()) as {
    importedCount: number;
    rejectedRows: Array<{ rowNumber: number; reason: string; asin: string }>;
  };
  expect(payload.importedCount).toBe(1);
  expect(payload.rejectedRows.length).toBe(1);
  expect(payload.rejectedRows[0]?.rowNumber).toBe(2);
  expect(payload.rejectedRows[0]?.reason).toBe("Duplicate ASIN");
  expect(payload.rejectedRows[0]?.asin).toBe(existingAsin);
});

test("scan modal stays scrollable on mobile after lookup fallback expands content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.route("**/api/scan", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        asins: [],
        ocrTextSnippet: "LONGHUI HOME Qty Item 1 WhatsBedding Bean Bag Chair Cover",
        titleCandidate: "WhatsBedding Bean Bag Chair Cover",
        suggestedTitle: "WhatsBedding Bean Bag Chair Cover",
        confidence: 93.2,
      }),
    });
  });

  await page.route("**/api/amazon/search**", async (route) => {
    const results = Array.from({ length: 12 }, (_, index) => ({
      title: `WhatsBedding Bean Bag Cover Result ${index + 1}`,
      asin: `B0SCAN${String(index + 1).padStart(4, "0")}`.slice(0, 10),
      brand: "WhatsBedding",
      url: `https://www.amazon.com/dp/B0SCAN${String(index + 1).padStart(4, "0")}`.slice(0, 42),
    }));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ source: "search", results }),
    });
  });

  await page.goto("/items/new?year=2026");

  const fileInput = page.locator('input[type="file"][accept="image/*"]');
  await fileInput.setInputFiles({
    name: "scan.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });

  await expect(page.getByText("No ASIN detected. Search Amazon instead?")).toBeVisible();
  await page.getByRole("button", { name: "Lookup on Amazon" }).click();
  await expect(
    page.getByRole("button", {
      name: /WhatsBedding Bean Bag Cover Result 1\s+B0SCAN0001/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Open in Amazon (top match)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open search in Amazon" })).toBeVisible();
  await expect(page.getByText("WhatsBedding Bean Bag Cover Result 6")).not.toBeVisible();

  const scrollArea = page.getByTestId("scan-modal-scroll");
  const overflowY = await scrollArea.evaluate((element) => window.getComputedStyle(element).overflowY);
  expect(["auto", "scroll"].includes(overflowY)).toBe(true);

  const scrolled = await scrollArea.evaluate((element) => {
    element.scrollTop = 1000;
    return element.scrollTop;
  });
  expect(scrolled).toBeGreaterThan(0);

  const footer = page.getByTestId("scan-modal-footer");
  await expect(footer).toBeVisible();
  await expect(footer.getByRole("button", { name: "Retake" })).toBeVisible();
  await expect(footer.getByRole("button", { name: "Use Photo" })).toBeVisible();
  await expect(footer.getByRole("button", { name: "Cancel" })).toBeVisible();

  const panelMaxHeight = await page
    .getByTestId("scan-modal-panel")
    .evaluate((element) => Number.parseFloat(window.getComputedStyle(element).maxHeight));
  const viewportHeight = page.viewportSize()?.height ?? 844;
  expect(panelMaxHeight).toBeGreaterThan(0);
  expect(panelMaxHeight).toBeLessThanOrEqual(Math.ceil(viewportHeight * 0.91));
});

test("video tracker marks item done and moves it to completed", async ({ page, request }) => {
  const asin = uniqueAsin("VIDE");

  const created = await request.post("/api/items", {
    data: {
      ...baseCreatePayload(asin, "2026-01-01"),
      title: "Video Tracker Flow Test",
      videoDone: false,
      videoSlaDays: 14,
      videoNotes: "Needs filming",
    },
  });
  expect(created.status()).toBe(201);

  await page.goto("/video-tracker?year=2026");

  const needsRow = page.getByTestId(`video-needs-${asin}`);
  await expect(needsRow).toBeVisible();
  await expect(needsRow).toContainText("Needs filming");

  await needsRow.getByRole("button", { name: "Mark Done" }).click();

  await expect(page.getByTestId(`video-needs-${asin}`)).not.toBeVisible();
  await expect(page.getByTestId(`video-done-${asin}`)).toBeVisible();
});

test("dashboard mobile quick add FAB opens add item page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?year=2026");

  const fab = page.getByLabel("Quick add item");
  await expect(fab).toBeVisible();
  await fab.click();
  await expect(page).toHaveURL(/\/items\/new\?year=2026/);
  await expect(page.getByLabel("Quick add item")).toHaveCount(0);
});

test("new items default videoDone to false", async ({ request }) => {
  const asin = uniqueAsin("VIDF");
  const response = await request.post("/api/items", {
    data: baseCreatePayload(asin, "2026-03-11"),
  });

  expect(response.status()).toBe(201);
  const payload = (await response.json()) as {
    item: { videoDone?: boolean };
  };
  expect(payload.item.videoDone).toBe(false);
});
