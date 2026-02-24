import assert from "node:assert/strict";
import test from "node:test";

import { stripAmazonBranding, summarizeAmazonTitle } from "../lib/amazonTitle";
import { decodeHtmlEntities } from "../lib/html-entities";

test("strips trailing Amazon site branding", () => {
  assert.equal(
    stripAmazonBranding("Solar Dog Statue with Lantern | Amazon.com"),
    "Solar Dog Statue with Lantern",
  );
});

test("strips leading Amazon.com prefix patterns case-insensitively", () => {
  assert.equal(
    stripAmazonBranding("Amazon.com: Sudstainables Laundry Detergent Sheets 200 Loads"),
    "Sudstainables Laundry Detergent Sheets 200 Loads",
  );
  assert.equal(
    stripAmazonBranding("amazon.com - Sudstainables Laundry Detergent Sheets 200 Loads"),
    "Sudstainables Laundry Detergent Sheets 200 Loads",
  );
  assert.equal(
    stripAmazonBranding("Amazon.com | Sudstainables Laundry Detergent Sheets 200 Loads"),
    "Sudstainables Laundry Detergent Sheets 200 Loads",
  );
  assert.equal(
    stripAmazonBranding("Sudstainables Laundry Detergent Sheets : Amazon.com"),
    "Sudstainables Laundry Detergent Sheets",
  );
});

test("summarizes long marketing title and preserves brand", () => {
  const input =
    "Lyeasw Solar Dog Statues with Lantern – Waterproof Outdoor Dog Figurines for Garden, Yard & Porch, Auto On/Off Solar Light, Birthday for Mom & Dog Lovers";

  assert.equal(
    summarizeAmazonTitle(input).title,
    "Solar Dog Statues with Lantern - Lyeasw",
  );
});

test("supports brand at trailing by-clause", () => {
  const input = "Portable Espresso Maker by STARESSO - Amazon.com";
  assert.equal(summarizeAmazonTitle(input).title, "Portable Espresso Maker - STARESSO");
});

test("keeps concise name when brand cannot be confidently extracted", () => {
  const input = "Waterproof Travel Backpack, 40L Carry On, Fits Under Seat";
  assert.equal(summarizeAmazonTitle(input).title, "Waterproof Travel Backpack");
});

test("caps long product names without cutting words", () => {
  const input =
    "Lyeasw Extra Long Product Name With Many Qualifiers And Descriptors That Keep Going Beyond Normal Length Expectations";
  const output = summarizeAmazonTitle(input).title;
  const [productPart] = output.split(" - ");

  assert.equal(output.includes(" - Lyeasw"), true);
  assert.equal((productPart ?? "").length <= 50, true);
});

test("returns rawTitle for downstream display", () => {
  const input = "Lyeasw Solar Dog Statues with Lantern - Amazon.com";
  const result = summarizeAmazonTitle(input);
  assert.equal(result.rawTitle, input);
});

test("formats detergent sheet example and trims trailing count phrase", () => {
  const input = "Amazon.com: Sudstainables Laundry Detergent Sheets 200 Loads";
  assert.equal(summarizeAmazonTitle(input).title, "Laundry Detergent Sheets - Sudstainables");
});

test("decodes HTML entities before summarization inputs", () => {
  assert.equal(decodeHtmlEntities("Tom &amp; Jerry&#39;s"), "Tom & Jerry's");
  assert.equal(decodeHtmlEntities("&quot;Hi&quot; &lt;there&gt;"), "\"Hi\" <there>");
  assert.equal(decodeHtmlEntities("A &apos;test&apos;"), "A 'test'");
});
