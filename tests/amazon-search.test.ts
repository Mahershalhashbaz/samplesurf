import assert from "node:assert/strict";
import test from "node:test";

import { extractAmazonSearchResults } from "../lib/amazonSearch";

test("extracts top Amazon search results with ASIN and summarized title", () => {
  const html = `
    <html>
      <body>
        <a href="/dp/B0ABC12345" aria-label="Amazon.com: Lyeasw Solar Dog Statues with Lantern">
          <img src="//images-na.ssl-images-amazon.com/images/I/abc._AC_UL320_.jpg" />
          Lyeasw Solar Dog Statues with Lantern
        </a>
        <a href="/gp/product/B0XYZ98765">
          Portable Espresso Maker by STARESSO
        </a>
        <a href="/dp/B0ABC12345">Duplicate should be ignored</a>
      </body>
    </html>
  `;

  const results = extractAmazonSearchResults(html);
  assert.equal(results.length, 2);
  assert.equal(results[0]?.asin, "B0ABC12345");
  assert.equal(results[0]?.title, "Solar Dog Statues with Lantern - Lyeasw");
  assert.equal(results[0]?.imageUrl, "https://images-na.ssl-images-amazon.com/images/I/abc._AC_UL320_.jpg");
  assert.equal(results[1]?.asin, "B0XYZ98765");
  assert.equal(results[1]?.title, "Portable Espresso Maker - STARESSO");
});
