import type { User } from "../domain/entities";

export interface Env {
  DB: D1Database;
  ENDPOINT_HUB: DurableObjectNamespace;
  /** Set with: wrangler secret put SECRET_KEY */
  SECRET_KEY?: string;
  ALGORITHM?: string;
  ACCESS_TOKEN_EXPIRE_MINUTES?: string;
  DEFAULT_USERNAME?: string;
  /** Set with: wrangler secret put DEFAULT_PASSWORD */
  DEFAULT_PASSWORD?: string;
}

export interface AppVariables {
  user: User;
}

export type AppContext = { Bindings: Env; Variables: AppVariables };

/**
 * Reads a required secret. There is deliberately no fallback: a checked-in default
 * would let anyone forge tokens or log in if the secret were ever left unset.
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
  defaultUsername: env.DEFAULT_USERNAME ?? "huy",
  defaultPassword: required(env.DEFAULT_PASSWORD, "DEFAULT_PASSWORD"),
});
