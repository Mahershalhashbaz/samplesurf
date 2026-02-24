import assert from "node:assert/strict";
import test from "node:test";

import { isNavItemActive } from "../lib/nav";

test("inventory is active only on exact /items route", () => {
  assert.equal(isNavItemActive("/items", "/items", "exact"), true);
  assert.equal(isNavItemActive("/items?year=2026", "/items", "exact"), true);
  assert.equal(isNavItemActive("/items/new", "/items", "exact"), false);
  assert.equal(isNavItemActive("/items/123", "/items", "exact"), false);
});

test("add item is active only on exact /items/new route", () => {
  assert.equal(isNavItemActive("/items/new", "/items/new", "exact"), true);
  assert.equal(isNavItemActive("/items/new?year=2026", "/items/new", "exact"), true);
  assert.equal(isNavItemActive("/items", "/items/new", "exact"), false);
});

test("prefix mode supports nested sections without overlap", () => {
  assert.equal(isNavItemActive("/import/history", "/import", "prefix"), true);
  assert.equal(isNavItemActive("/import", "/import", "prefix"), true);
  assert.equal(isNavItemActive("/important", "/import", "prefix"), false);
});
