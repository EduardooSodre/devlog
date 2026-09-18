import { describe, it, expect } from "vitest";
import { isCardVisibleTo } from "./card-visibility";

const baseCard = { visibility: "private", createdById: "creator", assignedToId: "assignee" as string | null };

describe("isCardVisibleTo", () => {
  it("lets the creator see a private card", () => {
    expect(isCardVisibleTo("creator", baseCard)).toBe(true);
  });

  it("lets the assignee see a private card", () => {
    expect(isCardVisibleTo("assignee", baseCard)).toBe(true);
  });

  it("blocks anyone else from a private card, even with board access", () => {
    expect(isCardVisibleTo("someone-else", baseCard)).toBe(false);
  });

  it("blocks a private card with no assignee for a non-creator", () => {
    expect(isCardVisibleTo("someone-else", { ...baseCard, assignedToId: null })).toBe(false);
  });

  it("lets anyone see a public card", () => {
    expect(isCardVisibleTo("someone-else", { ...baseCard, visibility: "public" })).toBe(true);
  });
});
