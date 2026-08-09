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

export const settings = (env: Env) => ({
  secretKey: env.SECRET_KEY ?? "change-me-in-production",
  accessTokenExpireMinutes: Number.parseInt(env.ACCESS_TOKEN_EXPIRE_MINUTES ?? "1440", 10),
  defaultUsername: env.DEFAULT_USERNAME ?? "huy",
  defaultPassword: env.DEFAULT_PASSWORD ?? "huy",
});
