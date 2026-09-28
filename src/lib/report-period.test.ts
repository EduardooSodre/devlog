import { describe, it, expect } from "vitest";
import { rangeFor, monthStart } from "./report-period";

describe("report-period", () => {
  it("monthStart pins the first day of the month, keeping the year/month", () => {
    expect(monthStart("2026-03-17")).toBe("2026-03-01");
  });

  it("rangeFor today is a single-day range", () => {
    expect(rangeFor("today", "2026-03-17", "2026-01-01", "2026-01-01")).toEqual({
      start: "2026-03-17",
      end: "2026-03-17",
    });
  });

  it("rangeFor week covers the last 7 days including today, rolling over month/year boundaries", () => {
    expect(rangeFor("week", "2026-01-02", "", "")).toEqual({ start: "2025-12-27", end: "2026-01-02" });
  });

  it("rangeFor month starts at day 1 of the current month", () => {
    expect(rangeFor("month", "2026-03-17", "", "")).toEqual({ start: "2026-03-01", end: "2026-03-17" });
  });

  it("rangeFor custom passes through the user-picked dates untouched", () => {
    expect(rangeFor("custom", "2026-03-17", "2026-02-01", "2026-02-15")).toEqual({
      start: "2026-02-01",
      end: "2026-02-15",
    });
  });
});
