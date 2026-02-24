"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const nav_1 = require("../lib/nav");
(0, node_test_1.default)("inventory is active only on exact /items route", () => {
    strict_1.default.equal((0, nav_1.isNavItemActive)("/items", "/items", "exact"), true);
    strict_1.default.equal((0, nav_1.isNavItemActive)("/items?year=2026", "/items", "exact"), true);
    strict_1.default.equal((0, nav_1.isNavItemActive)("/items/new", "/items", "exact"), false);
    strict_1.default.equal((0, nav_1.isNavItemActive)("/items/123", "/items", "exact"), false);
});
(0, node_test_1.default)("add item is active only on exact /items/new route", () => {
    strict_1.default.equal((0, nav_1.isNavItemActive)("/items/new", "/items/new", "exact"), true);
    strict_1.default.equal((0, nav_1.isNavItemActive)("/items/new?year=2026", "/items/new", "exact"), true);
    strict_1.default.equal((0, nav_1.isNavItemActive)("/items", "/items/new", "exact"), false);
});
(0, node_test_1.default)("prefix mode supports nested sections without overlap", () => {
    strict_1.default.equal((0, nav_1.isNavItemActive)("/import/history", "/import", "prefix"), true);
    strict_1.default.equal((0, nav_1.isNavItemActive)("/import", "/import", "prefix"), true);
    strict_1.default.equal((0, nav_1.isNavItemActive)("/important", "/import", "prefix"), false);
});
