import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/domain/provider";
import { fetchJson, RateLimiter } from "@/lib/http";

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RateLimiter", () => {
  it("espace les requêtes selon le débit autorisé", async () => {
    const limiter = new RateLimiter(20); // une requête toutes les 50 ms
    const start = Date.now();
    await Promise.all([limiter.acquire(), limiter.acquire(), limiter.acquire()]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(95);
  });
});

describe("fetchJson", () => {
  const limiter = () => new RateLimiter(1000);

  it("renvoie le JSON en cas de succès", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { ok: true })));
    await expect(fetchJson("https://api.test", { limiter: limiter() })).resolves.toEqual({ ok: true });
  });

  it("réessaie après un 429 en respectant Retry-After", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(429, {}, { "Retry-After": "0" }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchJson("https://api.test", { limiter: limiter() })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("abandonne avec une erreur 429 après les tentatives prévues", async () => {
    const fetchMock = vi.fn(async () => json(429, {}, { "Retry-After": "0" }));
    vi.stubGlobal("fetch", fetchMock);
    const promise = fetchJson("https://api.test", { limiter: limiter(), maxRetries: 2 });
    await expect(promise).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("transmet le message d'erreur de l'API sans réessayer sur une 400", async () => {
    const fetchMock = vi.fn(async () => json(400, { erreur: "Paramètre invalide" }));
    vi.stubGlobal("fetch", fetchMock);
    const promise = fetchJson("https://api.test", { limiter: limiter() });
    await expect(promise).rejects.toBeInstanceOf(ProviderError);
    await expect(promise).rejects.toMatchObject({ status: 400, message: "Paramètre invalide" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
