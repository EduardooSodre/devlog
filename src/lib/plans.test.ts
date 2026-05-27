import { describe, it, expect } from "vitest";
import { getPlanConfig, isWithinLimit, PLANS } from "./plans";

describe("plans", () => {
  it("returns free plan for unknown plan id", () => {
    expect(getPlanConfig("unknown").id).toBe("free");
  });

  it("pro plan has unlimited doc entries", () => {
    expect(PLANS.pro.limits.docEntries).toBe(Infinity);
  });

  it("isWithinLimit handles unlimited", () => {
    expect(isWithinLimit(1000, Infinity)).toBe(true);
  });

  it("isWithinLimit blocks at limit", () => {
    expect(isWithinLimit(50, 50)).toBe(false);
    expect(isWithinLimit(49, 50)).toBe(true);
  });
});
