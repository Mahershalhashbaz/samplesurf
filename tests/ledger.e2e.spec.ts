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
  await page.getByTestId("global-tax-year").fill("2026");
  await page.getByRole("button", { name: "Apply" }).click();

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
