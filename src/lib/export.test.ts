import { describe, it, expect } from "vitest";
import { docToMarkdown } from "./export";

describe("docToMarkdown", () => {
  it("includes title and summary", () => {
    const md = docToMarkdown({
      title: "Test Doc",
      summary: "A summary",
      content: "<p>Hello</p>",
      type: "note",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
    });
    expect(md).toContain("# Test Doc");
    expect(md).toContain("A summary");
    expect(md).toContain("Hello");
  });
});
