"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const amazonTitle_1 = require("../lib/amazonTitle");
const html_entities_1 = require("../lib/html-entities");
(0, node_test_1.default)("strips trailing Amazon site branding", () => {
    strict_1.default.equal((0, amazonTitle_1.stripAmazonBranding)("Solar Dog Statue with Lantern | Amazon.com"), "Solar Dog Statue with Lantern");
});
(0, node_test_1.default)("strips leading Amazon.com prefix patterns case-insensitively", () => {
    strict_1.default.equal((0, amazonTitle_1.stripAmazonBranding)("Amazon.com: Sudstainables Laundry Detergent Sheets 200 Loads"), "Sudstainables Laundry Detergent Sheets 200 Loads");
    strict_1.default.equal((0, amazonTitle_1.stripAmazonBranding)("amazon.com - Sudstainables Laundry Detergent Sheets 200 Loads"), "Sudstainables Laundry Detergent Sheets 200 Loads");
    strict_1.default.equal((0, amazonTitle_1.stripAmazonBranding)("Amazon.com | Sudstainables Laundry Detergent Sheets 200 Loads"), "Sudstainables Laundry Detergent Sheets 200 Loads");
    strict_1.default.equal((0, amazonTitle_1.stripAmazonBranding)("Sudstainables Laundry Detergent Sheets : Amazon.com"), "Sudstainables Laundry Detergent Sheets");
});
(0, node_test_1.default)("summarizes long marketing title and preserves brand", () => {
    const input = "Lyeasw Solar Dog Statues with Lantern – Waterproof Outdoor Dog Figurines for Garden, Yard & Porch, Auto On/Off Solar Light, Birthday for Mom & Dog Lovers";
    strict_1.default.equal((0, amazonTitle_1.summarizeAmazonTitle)(input).title, "Solar Dog Statues with Lantern - Lyeasw");
});
(0, node_test_1.default)("supports brand at trailing by-clause", () => {
    const input = "Portable Espresso Maker by STARESSO - Amazon.com";
    strict_1.default.equal((0, amazonTitle_1.summarizeAmazonTitle)(input).title, "Portable Espresso Maker - STARESSO");
});
(0, node_test_1.default)("keeps concise name when brand cannot be confidently extracted", () => {
    const input = "Waterproof Travel Backpack, 40L Carry On, Fits Under Seat";
    strict_1.default.equal((0, amazonTitle_1.summarizeAmazonTitle)(input).title, "Waterproof Travel Backpack");
});
(0, node_test_1.default)("caps long product names without cutting words", () => {
    const input = "Lyeasw Extra Long Product Name With Many Qualifiers And Descriptors That Keep Going Beyond Normal Length Expectations";
    const output = (0, amazonTitle_1.summarizeAmazonTitle)(input).title;
    const [productPart] = output.split(" - ");
    strict_1.default.equal(output.includes(" - Lyeasw"), true);
    strict_1.default.equal((productPart ?? "").length <= 50, true);
});
(0, node_test_1.default)("returns rawTitle for downstream display", () => {
    const input = "Lyeasw Solar Dog Statues with Lantern - Amazon.com";
    const result = (0, amazonTitle_1.summarizeAmazonTitle)(input);
    strict_1.default.equal(result.rawTitle, input);
});
(0, node_test_1.default)("formats detergent sheet example and trims trailing count phrase", () => {
    const input = "Amazon.com: Sudstainables Laundry Detergent Sheets 200 Loads";
    strict_1.default.equal((0, amazonTitle_1.summarizeAmazonTitle)(input).title, "Laundry Detergent Sheets - Sudstainables");
});
(0, node_test_1.default)("decodes HTML entities before summarization inputs", () => {
    strict_1.default.equal((0, html_entities_1.decodeHtmlEntities)("Tom &amp; Jerry&#39;s"), "Tom & Jerry's");
    strict_1.default.equal((0, html_entities_1.decodeHtmlEntities)("&quot;Hi&quot; &lt;there&gt;"), "\"Hi\" <there>");
    strict_1.default.equal((0, html_entities_1.decodeHtmlEntities)("A &apos;test&apos;"), "A 'test'");
});
