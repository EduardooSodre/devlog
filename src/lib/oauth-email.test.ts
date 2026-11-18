import { describe, it, expect, vi, afterEach } from "vitest";
import { isEmailVerifiedByProvider } from "./oauth-email";

afterEach(() => vi.unstubAllGlobals());

const google = { provider: "google" };
const github = { provider: "github", access_token: "t" };
const ghEmails = (list: { email: string; verified: boolean }[]) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(list), { status: 200 })));

describe("isEmailVerifiedByProvider", () => {
  it("Google: só com email_verified true e o mesmo e-mail", async () => {
    expect(await isEmailVerifiedByProvider(google, { email: "a@rosh.com", email_verified: true }, "A@rosh.com")).toBe(true);
    expect(await isEmailVerifiedByProvider(google, { email: "a@rosh.com", email_verified: false }, "a@rosh.com")).toBe(false);
    expect(await isEmailVerifiedByProvider(google, { email: "a@rosh.com" }, "a@rosh.com")).toBe(false);
    expect(await isEmailVerifiedByProvider(google, { email: "x@rosh.com", email_verified: true }, "a@rosh.com")).toBe(false);
  });

  it("GitHub: precisa do e-mail marcado verified em /user/emails", async () => {
    ghEmails([{ email: "a@rosh.com", verified: true }]);
    expect(await isEmailVerifiedByProvider(github, {}, "a@rosh.com")).toBe(true);
    ghEmails([{ email: "a@rosh.com", verified: false }]);
    expect(await isEmailVerifiedByProvider(github, {}, "a@rosh.com")).toBe(false);
  });

  it("GitHub fora do ar / sem token / outro provedor: não verificado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    expect(await isEmailVerifiedByProvider(github, {}, "a@rosh.com")).toBe(false);
    expect(await isEmailVerifiedByProvider({ provider: "github" }, {}, "a@rosh.com")).toBe(false);
    expect(await isEmailVerifiedByProvider({ provider: "credentials" }, {}, "a@rosh.com")).toBe(false);
    expect(await isEmailVerifiedByProvider(null, {}, "a@rosh.com")).toBe(false);
  });
});
