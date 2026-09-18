import { describe, it, expect } from "vitest";
import { extractMentionedUserIds } from "./mentions";

const members = [
  { id: "u1", name: "Ana Souza" },
  { id: "u2", name: "Bruno Lima" },
  { id: "u3", name: null },
];

describe("extractMentionedUserIds", () => {
  it("finds a mentioned member inside HTML content", () => {
    expect(extractMentionedUserIds("<p>oi @Ana Souza, pode olhar isso?</p>", members, "u2")).toEqual(["u1"]);
  });

  it("is case-insensitive", () => {
    expect(extractMentionedUserIds("cc @bruno lima", members, "u1")).toEqual(["u2"]);
  });

  it("never mentions the author of the comment", () => {
    expect(extractMentionedUserIds("@Ana Souza confere", members, "u1")).toEqual([]);
  });

  it("ignores members without a name", () => {
    expect(extractMentionedUserIds("@ninguem aqui", members, "u2")).toEqual([]);
  });

  it("returns nothing when there's no mention", () => {
    expect(extractMentionedUserIds("apenas um comentário normal", members, "u1")).toEqual([]);
  });
});
