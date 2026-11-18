import { describe, it, expect } from "vitest";
import { emailButton, emailLayout, htmlToText } from "./mail";

describe("e-mail", () => {
  it("texto puro mantém o link do botão e decodifica entidades", () => {
    const html = `<h1>Olá, Ana &amp; Bia!</h1><p>Clique abaixo.</p>${emailButton("https://x.dev/r/abc", "Redefinir senha")}`;
    const text = htmlToText(html);
    expect(text).toContain("Olá, Ana & Bia!");
    expect(text).toContain("Redefinir senha: https://x.dev/r/abc");
    expect(text).toContain("https://x.dev/r/abc");
    expect(text).not.toMatch(/<[^>]+>/);
  });

  it("layout envolve o conteúdo num documento completo", () => {
    const out = emailLayout("<p>oi</p>");
    expect(out.startsWith("<!doctype html>")).toBe(true);
    expect(out).toContain("<p>oi</p>");
  });
});
