import { describe, it, expect } from "vitest";
import { dateOnlyInBrasilia, addDaysToDateStr } from "./date-brasilia";

describe("date-brasilia", () => {
  it("addDaysToDateStr rolls over month boundaries", () => {
    expect(addDaysToDateStr("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("dateOnlyInBrasilia converts UTC late-night to the next day's date in BRT", () => {
    // 2026-03-10T02:00:00Z é 2026-03-09 23:00 em Brasília (UTC-3) — dia anterior.
    expect(dateOnlyInBrasilia(new Date("2026-03-10T02:00:00Z"))).toBe("2026-03-09");
  });
});
