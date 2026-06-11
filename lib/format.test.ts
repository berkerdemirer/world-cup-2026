import { test } from "node:test";
import assert from "node:assert/strict";
import { fixtureSectionOf } from "./format";

test("fixtureSectionOf groups evening kickoffs by host calendar day, not UTC", () => {
  // 9pm Eastern on Monday = Tuesday 01:00 UTC — common "night game" boundary.
  const kickoff = new Date("2026-06-16T01:00:00.000Z");

  const host = fixtureSectionOf(
    { stage: "GROUP_STAGE", kickoffAt: kickoff },
    { timeZone: "America/New_York" },
  );
  assert.equal(host.key, "d20260615");
  assert.match(host.label, /^Mon/);

  const utc = fixtureSectionOf(
    { stage: "GROUP_STAGE", kickoffAt: kickoff },
    { timeZone: "UTC" },
  );
  assert.equal(utc.key, "d20260616");
  assert.match(utc.label, /^Tue/);
});

test("fixtureSectionOf leaves knockout matches grouped by stage", () => {
  const section = fixtureSectionOf({
    stage: "LAST_16",
    kickoffAt: new Date("2026-07-05T01:00:00.000Z"),
  });
  assert.equal(section.key, "LAST_16");
  assert.equal(section.label, "Round of 16");
});
