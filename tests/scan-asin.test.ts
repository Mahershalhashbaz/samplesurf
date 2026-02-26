import assert from "node:assert/strict";
import test from "node:test";

import { extractAsinsFromOcrText, extractSuggestedTitleFromOcrText } from "../lib/scan";

test("extracts unique ASINs in first-seen order from OCR text", () => {
  const text =
    "Order line B0ABC12345 and another b0abc12345 then B0ZZZZ9999 on the second line with B0HELLO123";
  assert.deepEqual(extractAsinsFromOcrText(text), ["B0ABC12345", "B0ZZZZ9999", "B0HELLO123"]);
});

test("returns empty list when OCR text has no ASIN pattern", () => {
  const text = "Receipt details with SKU 12345 and random words only.";
  assert.deepEqual(extractAsinsFromOcrText(text), []);
});

test("normalizes BO prefix OCR mistakes to B0", () => {
  const text = "Detected BOABC12345 and B0XYZ98765 from slip text";
  assert.deepEqual(extractAsinsFromOcrText(text), ["B0ABC12345", "B0XYZ98765"]);
});

test("extracts a suggested product title from natural-language OCR lines", () => {
  const text = `
    Order Date: 2026-02-24
    Item: Portable Espresso Maker by STARESSO
    Tracking: TBA123456789
  `;

  assert.equal(extractSuggestedTitleFromOcrText(text), "Portable Espresso Maker by STARESSO");
});

test("rejects code-like or logistics-heavy OCR lines for suggested title", () => {
  const text = `
    Order ID: 123-1231231-1231231
    Tracking Number: 1Z999AA10123456784
    Carrier: UPS
    Qty: 1
  `;

  assert.equal(extractSuggestedTitleFromOcrText(text), null);
});

test("extracts item title from Qty/Item slip rows with wrapped natural-language lines", () => {
  const text = `
    LONGHUI HOME
    Qty Item
    1 WhatsBedding Bean Bag Chair Cover, Giant Bean Bag Chair Cover
      Soft Faux Rabbit Fur Cover for Adult, No Filler
      Extra Large 7ft, Grey
    B0DXYZ1234
    Order ID: 111-2222222-3333333
  `;

  assert.equal(
    extractSuggestedTitleFromOcrText(text),
    "WhatsBedding Bean Bag Chair Cover, Giant Bean Bag Chair Cover Soft Faux Rabbit Fur Cover for Adult, No Filler Extra Large 7ft, Grey",
  );
});

test("extracts LONGHUI HOME slip title from Qty/Item row next to quantity 1", () => {
  const text = `
    LONGHUI HOME
    Qty Item
    1 WhatsBedding Plush Bean Bag Chair Cover for Adults and Kids
      Soft Washable Bean Bag Chair Skin with Long Zipper
      No Filler Included
    B0DAB12C34
    ORDER ID: 111-2222222-3333333
  `;

  assert.equal(
    extractSuggestedTitleFromOcrText(text),
    "WhatsBedding Plush Bean Bag Chair Cover for Adults and Kids Soft Washable Bean Bag Chair Skin with Long Zipper No Filler Included",
  );
});

test("handles OCR qty variant l and stops before logistics/code lines", () => {
  const text = `
    Qly Item
    l WhatsBedding Bean Bag Chair for Adults
      Premium Washable Cover
    Tracking Number: TBA123123123
    1Z999AA10123456784
  `;

  assert.equal(
    extractSuggestedTitleFromOcrText(text),
    "WhatsBedding Bean Bag Chair for Adults Premium Washable Cover",
  );
});

test("strips leading qty marker from fallback title candidates", () => {
  const text = `
    Product: 1 Super Soft Throw Blanket for Couch
    Tracking Number: TBA11223344
  `;

  assert.equal(extractSuggestedTitleFromOcrText(text), "Super Soft Throw Blanket for Couch");
});
