"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const amazon_1 = require("../lib/amazon");
(0, node_test_1.default)("extracts ASIN from /dp URL", () => {
    strict_1.default.equal((0, amazon_1.extractAsinFromAmazonUrl)("https://www.amazon.com/dp/B08N5WRWNW"), "B08N5WRWNW");
});
(0, node_test_1.default)("extracts ASIN from /gp/product URL", () => {
    strict_1.default.equal((0, amazon_1.extractAsinFromAmazonUrl)("https://www.amazon.com/gp/product/B08N5WRWNW/ref=ppx_yo_dt_b_search_asin_title"), "B08N5WRWNW");
});
(0, node_test_1.default)("extracts ASIN from slug/dp URL and normalizes lowercase", () => {
    strict_1.default.equal((0, amazon_1.extractAsinFromAmazonUrl)("https://www.amazon.com/Some-Title/dp/b08n5wrwnw?th=1"), "B08N5WRWNW");
});
(0, node_test_1.default)("extracts ASIN from short a.co URL path", () => {
    strict_1.default.equal((0, amazon_1.extractAsinFromAmazonUrl)("https://a.co/d/B08N5WRWNW"), "B08N5WRWNW");
});
(0, node_test_1.default)("handles URL without protocol", () => {
    strict_1.default.equal((0, amazon_1.extractAsinFromAmazonUrl)("amazon.com/dp/B08N5WRWNW"), "B08N5WRWNW");
});
(0, node_test_1.default)("returns null for non-amazon hosts", () => {
    strict_1.default.equal((0, amazon_1.extractAsinFromAmazonUrl)("https://example.com/dp/B08N5WRWNW"), null);
});
(0, node_test_1.default)("returns null for invalid URL", () => {
    strict_1.default.equal((0, amazon_1.extractAsinFromAmazonUrl)("not-a-url"), null);
});
