import type { ExternalIdentity } from "../../../domain/entities";
import { ExternalAuthError } from "../../../domain/exceptions";
import type { ExternalAuthProvider } from "../../../domain/ports";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

interface TokenResponse {
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface IdTokenClaims {
  sub?: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
}

function decodeIdTokenClaims(idToken: string): IdTokenClaims {
  const payload = idToken.split(".")[1];
  if (!payload) throw new ExternalAuthError("Malformed id_token");
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))));
}

export class GoogleAuthProvider implements ExternalAuthProvider {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  authorizationUrl(params: { redirectUri: string; state: string }): string {
    const url = new URL(AUTH_ENDPOINT);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", params.state);
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }

  async exchangeCode(params: { code: string; redirectUri: string }): Promise<ExternalIdentity> {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: params.code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: params.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const token = (await response.json()) as TokenResponse;
    if (!response.ok || !token.id_token) {
      throw new ExternalAuthError(token.error_description ?? token.error ?? "Token exchange failed");
    }

    // The id_token arrived directly from Google's token endpoint over TLS, so its
    // signature does not need to be re-verified here; the transport authenticates it.
    const claims = decodeIdTokenClaims(token.id_token);
    if (!claims.sub) throw new ExternalAuthError("id_token has no subject");

    return {
      subject: claims.sub,
      email: claims.email_verified === false ? null : (claims.email ?? null),
      name: claims.name ?? null,
    };
  }
}
