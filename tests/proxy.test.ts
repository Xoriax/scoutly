import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

const request = (authorization?: string) =>
  new NextRequest("http://localhost/", {
    headers: authorization ? { authorization } : {},
  });

const basic = (user: string, password: string) =>
  `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy (authentification HTTP Basic)", () => {
  it("laisse passer quand la protection n'est pas configurée", () => {
    vi.stubEnv("BASIC_AUTH_USER", "");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "");
    expect(proxy(request()).status).toBe(200);
  });

  describe("quand la protection est configurée", () => {
    const configure = () => {
      vi.stubEnv("BASIC_AUTH_USER", "equipe");
      vi.stubEnv("BASIC_AUTH_PASSWORD", "mot:de passe");
    };

    it("demande une authentification sans identifiants", () => {
      configure();
      const response = proxy(request());
      expect(response.status).toBe(401);
      expect(response.headers.get("WWW-Authenticate")).toContain("Basic");
    });

    it("refuse un mauvais mot de passe ou un en-tête invalide", () => {
      configure();
      expect(proxy(request(basic("equipe", "faux"))).status).toBe(401);
      expect(proxy(request(basic("autre", "mot:de passe"))).status).toBe(401);
      expect(proxy(request("Basic !!!")).status).toBe(401);
      expect(proxy(request("Bearer xyz")).status).toBe(401);
    });

    it("accepte les bons identifiants (mot de passe contenant « : »)", () => {
      configure();
      expect(proxy(request(basic("equipe", "mot:de passe"))).status).toBe(200);
    });
  });
});
