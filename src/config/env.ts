import { DEFAULT_SSO_ISSUER } from "@huyab/sso";
import type { User } from "../domain/entities";

export interface Env {
  DB: D1Database;
  ENDPOINT_HUB: DurableObjectNamespace;
  /** Set with: wrangler secret put SECRET_KEY */
  SECRET_KEY?: string;
  ACCESS_TOKEN_EXPIRE_MINUTES?: string;
  /** Issuer of the domain-wide SSO cookie. */
  SSO_ISSUER?: string;
}

export interface AppVariables {
  user: User;
}

export type AppContext = { Bindings: Env; Variables: AppVariables };

/**
 * Reads a required secret. There is deliberately no fallback: a checked-in default
 * would let anyone forge tokens if the secret were ever left unset.
 */
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not configured. Set it with: wrangler secret put ${name}`);
  }
  return value;
}

export const settings = (env: Env) => ({
  secretKey: required(env.SECRET_KEY, "SECRET_KEY"),
  accessTokenExpireMinutes: Number.parseInt(env.ACCESS_TOKEN_EXPIRE_MINUTES ?? "1440", 10),
  ssoIssuer: env.SSO_ISSUER ?? DEFAULT_SSO_ISSUER,
});
