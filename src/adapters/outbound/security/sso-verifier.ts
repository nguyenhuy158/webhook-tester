import type { ExternalIdentity } from "../../../domain/entities";

/**
 * Verifies the domain-wide session cookie issued by auth.huyab.click.
 *
 * Only the issuer's public key is needed, so this service cannot mint a session
 * that other apps would accept.
 */

interface SsoClaims {
  iss: string;
  sub: string;
  email: string | null;
  name: string | null;
  exp: number;
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export class SsoVerifier {
  /** Imported keys are cached per isolate; refetching per request would add a round trip. */
  private static keyCache = new Map<string, Promise<CryptoKey>>();

  constructor(private readonly issuer: string) {}

  private publicKey(kid: string): Promise<CryptoKey> {
    const cacheKey = `${this.issuer}#${kid}`;
    let cached = SsoVerifier.keyCache.get(cacheKey);
    if (!cached) {
      cached = (async () => {
        const response = await fetch(`${this.issuer}/.well-known/jwks.json`);
        if (!response.ok) throw new Error(`JWKS fetch failed: ${response.status}`);
        const { keys } = (await response.json()) as { keys: Array<Record<string, unknown>> };
        const jwk = keys.find((k) => k.kid === kid) ?? keys[0];
        if (!jwk) throw new Error("JWKS contains no usable key");
        return crypto.subtle.importKey(
          "jwk",
          { ...jwk, ext: true } as JsonWebKey,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["verify"],
        );
      })();
      SsoVerifier.keyCache.set(cacheKey, cached);
      // A failed fetch must not poison the cache for the isolate's lifetime.
      cached.catch(() => SsoVerifier.keyCache.delete(cacheKey));
    }
    return cached;
  }

  async verify(token: string): Promise<ExternalIdentity | null> {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    try {
      const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0]))) as { kid?: string };
      const valid = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        await this.publicKey(header.kid ?? ""),
        base64UrlDecode(parts[2]),
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
      );
      if (!valid) return null;

      const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as SsoClaims;
      if (claims.iss !== this.issuer) return null;
      if (claims.exp <= Math.floor(Date.now() / 1000)) return null;

      // Namespaced so an SSO account can never collide with a local one.
      return { subject: `sso:${claims.sub}`, email: claims.email, name: claims.name };
    } catch {
      return null;
    }
  }
}
