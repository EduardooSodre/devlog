import { describe, it, expect, vi, afterEach } from "vitest";
import { api, ApiError, errorMessage } from "./api-client";

afterEach(() => vi.unstubAllGlobals());

const respond = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

describe("api-client", () => {
  it("devolve o JSON quando dá certo e manda o corpo como JSON", async () => {
    respond(200, { data: 1 });
    expect(await api("/x", { method: "POST", json: { a: 1 } })).toEqual({ data: 1 });
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.body).toBe('{"a":1}');
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("erro do servidor chega no toast; sem mensagem usa o fallback", async () => {
    respond(403, { error: "Limite do plano atingido" });
    const err = await api("/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(errorMessage(err, "Erro")).toBe("Limite do plano atingido");

    respond(500, {});
    expect(errorMessage(await api("/x").catch((e) => e), "Erro ao salvar")).toBe("Erro ao salvar");
  });

  it("falha de rede vira aviso de conexão", () => {
    expect(errorMessage(new TypeError("Failed to fetch"), "x")).toMatch(/conexão/);
  });
});
