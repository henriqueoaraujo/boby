import test from "node:test";
import assert from "node:assert/strict";
import { getDayPeriod } from "../src/js/core/greetingRules.js";

test("classifica manhã antes das 12h", () => {
  assert.equal(getDayPeriod(0), "morning");
  assert.equal(getDayPeriod(11), "morning");
});

test("classifica tarde entre 12h e 18h", () => {
  assert.equal(getDayPeriod(12), "afternoon");
  assert.equal(getDayPeriod(17), "afternoon");
});

test("classifica noite a partir das 18h", () => {
  assert.equal(getDayPeriod(18), "night");
  assert.equal(getDayPeriod(23), "night");
});
