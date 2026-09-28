import { describe, it, expect } from "vitest";
import { canManageCard, canWorkOnCard, canManageBoard } from "./permissions";

const card = { createdById: "creator", assignedToId: "assignee" as string | null };

describe("permissions", () => {
  it("creator manages their own card", () => {
    expect(canManageCard("creator", card, "member")).toBe(true);
  });

  it("assignee can work on the card but not manage it", () => {
    expect(canWorkOnCard("assignee", card, "member")).toBe(true);
    expect(canManageCard("assignee", card, "member")).toBe(false);
  });

  it("another member can neither manage nor work on it", () => {
    expect(canManageCard("other", card, "member")).toBe(false);
    expect(canWorkOnCard("other", card, "member")).toBe(false);
  });

  it("admin and owner can manage anything", () => {
    expect(canManageCard("other", card, "admin")).toBe(true);
    expect(canManageBoard("other", { createdById: "creator" }, "owner")).toBe(true);
  });

  it("member cannot manage someone else's board", () => {
    expect(canManageBoard("other", { createdById: "creator" }, "member")).toBe(false);
  });
});
