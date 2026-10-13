import "server-only";

interface Entry<V> {
  value: Promise<V>;
  expiresAt: number;
}

/**
 * Cache mémoire avec durée de vie et éviction LRU.
 * Stocke des promesses : deux appels simultanés sur la même clé ne déclenchent
 * qu'une seule requête. Une promesse rejetée est retirée du cache.
 * Suffisant pour une instance unique ; à remplacer par Redis en multi-instances.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();

  constructor(private readonly maxEntries: number) {}

  get(key: string): Promise<V> | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Réinsertion pour marquer l'entrée comme la plus récemment utilisée
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V | Promise<V>, ttlMs: number): void {
    const promise = Promise.resolve(value);
    this.entries.delete(key);
    this.entries.set(key, { value: promise, expiresAt: Date.now() + ttlMs });
    promise.catch(() => {
      if (this.entries.get(key)?.value === promise) this.entries.delete(key);
    });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string;
      this.entries.delete(oldest);
    }
  }

  getOrLoad(key: string, ttlMs: number, loader: () => Promise<V>): Promise<V> {
    const cached = this.get(key);
    if (cached) return cached;
    const promise = loader();
    this.set(key, promise, ttlMs);
    return promise;
  }
}

/**
 * Singleton survivant au rechargement à chaud des modules en développement.
 */
export function globalSingleton<T>(name: string, create: () => T): T {
  const store = globalThis as unknown as Record<string, T | undefined>;
  const key = `__scoutly_${name}`;
  return (store[key] ??= create());
}
