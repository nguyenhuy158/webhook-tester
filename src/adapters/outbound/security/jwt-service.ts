import type { AuthService } from "../../../domain/ports";

/**
 * WebCrypto replacement for the python-jose + passlib/bcrypt stack, which cannot
 * run on Workers (bcrypt ships a native binary).
 *
 * - Tokens: HS256 JWT, signed with HMAC-SHA256.
 * - Passwords: PBKDF2-SHA256, serialised as `pbkdf2_sha256$<iterations>$<salt>$<hash>`.
 */

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_BITS = 256;
const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Constant-time comparison, so verification does not leak byte positions via timing. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export class WebCryptoAuthService implements AuthService {
  private signingKey: Promise<CryptoKey> | null = null;

  constructor(
    private readonly secret: string,
    private readonly expireMinutes: number = 60 * 24,
  ) {}

  private getSigningKey(): Promise<CryptoKey> {
    this.signingKey ??= crypto.subtle.importKey(
      "raw",
      encoder.encode(this.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    return this.signingKey;
  }

  async createToken(userId: number): Promise<string> {
    const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
    const exp = Math.floor(Date.now() / 1000) + this.expireMinutes * 60;
    const payload = base64UrlEncode(encoder.encode(JSON.stringify({ sub: String(userId), exp })));
    const signingInput = `${header}.${payload}`;
    const signature = await crypto.subtle.sign(
      "HMAC",
      await this.getSigningKey(),
      encoder.encode(signingInput),
    );
    return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
  }

  async decodeToken(token: string): Promise<number | null> {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    let valid: boolean;
    try {
      valid = await crypto.subtle.verify(
        "HMAC",
        await this.getSigningKey(),
        base64UrlDecode(signature),
        encoder.encode(`${header}.${payload}`),
      );
    } catch {
      return null;
    }
    if (!valid) return null;

    try {
      const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
      if (typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1000)) return null;
      const userId = Number.parseInt(String(claims.sub), 10);
      return Number.isNaN(userId) ? null : userId;
    } catch {
      return null;
    }
  }

  private async derive(plain: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(plain), "PBKDF2", false, [
      "deriveBits",
    ]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      keyMaterial,
      PBKDF2_KEY_BITS,
    );
    return new Uint8Array(bits);
  }

  async hashPassword(plain: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await this.derive(plain, salt, PBKDF2_ITERATIONS);
    return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(hash)}`;
  }

  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    const [scheme, iterations, salt, hash] = hashed.split("$");
    if (scheme !== "pbkdf2_sha256" || !iterations || !salt || !hash) return false;
    try {
      const derived = await this.derive(plain, base64UrlDecode(salt), Number.parseInt(iterations, 10));
      return timingSafeEqual(derived, base64UrlDecode(hash));
    } catch {
      return false;
    }
  }
}
