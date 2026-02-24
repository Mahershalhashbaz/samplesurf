import assert from "node:assert/strict";
import test from "node:test";

import { extractAsinFromAmazonUrl } from "../lib/amazon";

test("extracts ASIN from /dp URL", () => {
  assert.equal(
    extractAsinFromAmazonUrl("https://www.amazon.com/dp/B08N5WRWNW"),
    "B08N5WRWNW",
  );
});

test("extracts ASIN from /gp/product URL", () => {
  assert.equal(
    extractAsinFromAmazonUrl("https://www.amazon.com/gp/product/B08N5WRWNW/ref=ppx_yo_dt_b_search_asin_title"),
    "B08N5WRWNW",
  );
});

test("extracts ASIN from slug/dp URL and normalizes lowercase", () => {
  assert.equal(
    extractAsinFromAmazonUrl("https://www.amazon.com/Some-Title/dp/b08n5wrwnw?th=1"),
    "B08N5WRWNW",
  );
});

test("extracts ASIN from short a.co URL path", () => {
  assert.equal(extractAsinFromAmazonUrl("https://a.co/d/B08N5WRWNW"), "B08N5WRWNW");
});

test("handles URL without protocol", () => {
  assert.equal(extractAsinFromAmazonUrl("amazon.com/dp/B08N5WRWNW"), "B08N5WRWNW");
});

test("returns null for non-amazon hosts", () => {
  assert.equal(extractAsinFromAmazonUrl("https://example.com/dp/B08N5WRWNW"), null);
});

test("returns null for invalid URL", () => {
  assert.equal(extractAsinFromAmazonUrl("not-a-url"), null);
});
