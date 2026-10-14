import { afterEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "@/lib/cache";

afterEach(() => {
  vi.useRealTimers();
});

describe("TtlCache", () => {
  it("ne charge qu'une fois pour des appels simultanés", async () => {
    const cache = new TtlCache<number>(10);
    const loader = vi.fn(async () => 42);
    const [a, b] = await Promise.all([
      cache.getOrLoad("k", 1000, loader),
      cache.getOrLoad("k", 1000, loader),
    ]);
    expect([a, b]).toEqual([42, 42]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("expire après la durée de vie", async () => {
    vi.useFakeTimers();
    const cache = new TtlCache<number>(10);
    cache.set("k", 1, 1000);
    vi.advanceTimersByTime(999);
    expect(cache.get("k")).toBeDefined();
    vi.advanceTimersByTime(2);
    expect(cache.get("k")).toBeUndefined();
  });

  it("évince l'entrée la moins récemment utilisée", () => {
    const cache = new TtlCache<number>(2);
    cache.set("a", 1, 1000);
    cache.set("b", 2, 1000);
    cache.get("a"); // "a" devient la plus récente
    cache.set("c", 3, 1000);
    expect(cache.get("a")).toBeDefined();
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBeDefined();
  });

  it("oublie un chargement en échec pour permettre de réessayer", async () => {
    const cache = new TtlCache<number>(10);
    await expect(cache.getOrLoad("k", 1000, async () => Promise.reject(new Error("panne")))).rejects.toThrow();
    await expect(cache.getOrLoad("k", 1000, async () => 7)).resolves.toBe(7);
  });
});
