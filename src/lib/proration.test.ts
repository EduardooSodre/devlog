import { describe, it, expect } from "vitest";
import { prorateSeat, daysSince } from "./proration";

const start = new Date("2026-11-01T00:00:00Z");
const end = new Date("2026-12-01T00:00:00Z"); // 30 dias

describe("prorateSeat", () => {
  it("cobra/credita só os dias restantes do ciclo", () => {
    expect(prorateSeat(30, start, end, new Date("2026-11-11T00:00:00Z"))).toEqual({ daysLeft: 20, totalDays: 30, amount: 20 });
  });

  it("início do ciclo = valor cheio; depois do fim = zero", () => {
    expect(prorateSeat(30, start, end, start).amount).toBe(30);
    expect(prorateSeat(30, start, end, new Date("2026-12-05T00:00:00Z")).amount).toBe(0);
  });

  it("arredonda pra centavos", () => {
    expect(prorateSeat(30, start, end, new Date("2026-11-21T12:00:00Z")).amount).toBe(10);
    // 11 dias restantes: 29,90 × 11/30 = 10,963… → 10,96
    expect(prorateSeat(29.9, start, end, new Date("2026-11-20T00:00:00Z")).amount).toBe(10.96);
  });
});

describe("daysSince", () => {
  it("conta dias inteiros e nunca fica negativo", () => {
    expect(daysSince(start, new Date("2026-11-08T10:00:00Z"))).toBe(7);
    expect(daysSince(end, start)).toBe(0);
  });
});
