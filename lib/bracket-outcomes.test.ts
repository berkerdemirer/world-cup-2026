import assert from "node:assert/strict";
import test from "node:test";
import { bracketPickOutcome } from "./bracket-outcomes";

test("bracketPickOutcome returns null for unselected teams", () => {
  assert.equal(bracketPickOutcome(1, false, [1], []), null);
});

test("bracketPickOutcome marks reached picks as hit", () => {
  assert.equal(bracketPickOutcome(1, true, [1, 2], []), "hit");
});

test("bracketPickOutcome marks eliminated picks as miss", () => {
  assert.equal(bracketPickOutcome(3, true, [1, 2], [3]), "miss");
});

test("bracketPickOutcome leaves unresolved picks pending", () => {
  assert.equal(bracketPickOutcome(3, true, [1], []), "pending");
});
