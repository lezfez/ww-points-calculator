import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPathWithTab,
  readTabFromSearch,
  resolveTabSelection,
} from "../src/lib/tabRouting.js";

test("reads tab from search params and normalizes casing", () => {
  assert.equal(readTabFromSearch("?tab=recipes"), "recipes");
  assert.equal(readTabFromSearch("?tab=ReCiPeS"), "recipes");
});

test("falls back to calc when no valid tab query exists", () => {
  assert.equal(readTabFromSearch(""), "calc");
  assert.equal(readTabFromSearch("?tab="), "calc");
  assert.equal(readTabFromSearch("?foo=1"), "calc");
});

test("builds path with tab while preserving other params and hash", () => {
  const href = "https://w.wencom.net/?premium=success#header";
  assert.equal(buildPathWithTab(href, "recipes"), "/?premium=success&tab=recipes#header");
});

test("removes tab query for default calc tab", () => {
  const href = "https://w.wencom.net/?tab=recipes&premium=success#header";
  assert.equal(buildPathWithTab(href, "calc"), "/?premium=success#header");
});

test("resolves current tab against allowed tabs with fallback", () => {
  const allowed = ["calc", "budget", "recipes", "info"];
  assert.equal(resolveTabSelection("recipes", allowed), "recipes");
  assert.equal(resolveTabSelection("admin", allowed), "calc");
  assert.equal(resolveTabSelection("", ["recipes", "info"]), "recipes");
});
