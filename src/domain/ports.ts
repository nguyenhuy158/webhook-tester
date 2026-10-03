import type { Endpoint, User, WebhookRequest } from "./entities";

export interface EndpointRepository {
  /** Returns null when the endpoint belongs to somebody else, so callers cannot
   *  tell "not yours" apart from "does not exist". */
  findById(endpointId: number, ownerId: number): Promise<Endpoint | null>;
  /** Not scoped: whoever calls a webhook is not signed in. */
  findBySlug(slug: string): Promise<Endpoint | null>;
  listByOwner(ownerId: number, search?: string): Promise<Endpoint[]>;
  create(endpoint: Endpoint): Promise<Endpoint>;
  update(endpoint: Endpoint): Promise<Endpoint>;
  delete(endpointId: number, ownerId: number): Promise<void>;
  /** Global: slugs share one URL namespace across every account. */
  slugExists(slug: string): Promise<boolean>;
}

export interface RequestRepository {
  save(request: WebhookRequest): Promise<WebhookRequest>;
  listByEndpoint(endpointId: number, limit?: number): Promise<WebhookRequest[]>;
  deleteByEndpoint(endpointId: number): Promise<void>;
}

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(userId: number): Promise<User | null>;
  findByGoogleSub(googleSub: string): Promise<User | null>;
  create(user: User): Promise<User>;
}

export interface AuthService {
  createToken(userId: number): Promise<string>;
  /** Returns the user id, or null when the token is missing/invalid/expired. */
  decodeToken(token: string): Promise<number | null>;
  hashPassword(plain: string): Promise<string>;
  verifyPassword(plain: string, hashed: string): Promise<boolean>;
}

export interface WebSocketBroadcaster {
  broadcast(endpointId: number, data: unknown): Promise<void>;
}
