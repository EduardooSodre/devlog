import { describe, it, expect } from "vitest";
import { suggestDepartmentName } from "./job-department";

describe("suggestDepartmentName", () => {
  it("maps developer job titles to T.I.", () => {
    expect(suggestDepartmentName("Desenvolvedor Full Stack")).toBe("T.I.");
  });

  it("matches accented keywords without accents in the input", () => {
    expect(suggestDepartmentName("Analista de Orcamento")).toBe("Orçamentos");
  });

  it("maps contract specialists to Suprimentos", () => {
    expect(suggestDepartmentName("Especialista em Contratos")).toBe("Suprimentos");
  });

  it("returns null when nothing matches", () => {
    expect(suggestDepartmentName("Astronauta")).toBeNull();
  });
});
