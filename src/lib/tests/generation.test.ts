import { describe, expect, it } from "vitest";

import { parseRequestedQuestionCount, validateSeed } from "./generation";

describe("test generation input validation", () => {
  it("accepts the maximum supported count", () => {
    expect(parseRequestedQuestionCount("250")).toBe(250);
  });

  it("rejects fractional, zero, and over-limit counts", () => {
    expect(() => parseRequestedQuestionCount("2.5")).toThrow("whole number");
    expect(() => parseRequestedQuestionCount("0")).toThrow("between 1 and 250");
    expect(() => parseRequestedQuestionCount("251")).toThrow("between 1 and 250");
  });

  it("preserves leading zeros and accepts Unicode seeds", () => {
    expect(() => validateSeed("000123")).not.toThrow();
    expect(() => validateSeed("seed-α")).not.toThrow();
  });

  it("rejects whitespace and oversized UTF-8 seeds", () => {
    expect(() => validateSeed(" seed ")).toThrow("whitespace");
    expect(() => validateSeed("α".repeat(65))).toThrow("128 UTF-8 bytes");
  });
});
