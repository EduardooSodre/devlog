import { describe, it, expect } from "vitest";
import { pickDefaultWorkspace } from "./workspace-default";

const m = (workspaceId: string, plan: string, joinedAt: string) => ({ workspaceId, joinedAt: new Date(joinedAt), workspace: { plan } });

describe("pickDefaultWorkspace", () => {
  it("prefere a organização paga ao workspace pessoal grátis criado antes", () => {
    // caso real: cadastrou (pessoal grátis) e minutos depois aceitou o convite da empresa
    expect(
      pickDefaultWorkspace([m("pessoal", "free", "2026-09-22T21:24:46Z"), m("rosh", "enterprise", "2026-09-22T21:28:01Z")])
    ).toBe("rosh");
  });

  it("empate: o mais antigo", () => {
    expect(pickDefaultWorkspace([m("b", "free", "2026-02-01"), m("a", "free", "2026-01-01")])).toBe("a");
    expect(pickDefaultWorkspace([m("b", "pro", "2026-02-01"), m("a", "enterprise", "2026-01-01")])).toBe("a");
  });

  it("um só: ele mesmo", () => {
    expect(pickDefaultWorkspace([m("x", "free", "2026-01-01")])).toBe("x");
  });
});
