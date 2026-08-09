import type { Endpoint, ExternalIdentity, User, WebhookRequest } from "./entities";

export interface EndpointRepository {
  findById(endpointId: number): Promise<Endpoint | null>;
  findBySlug(slug: string): Promise<Endpoint | null>;
  listAll(search?: string): Promise<Endpoint[]>;
  create(endpoint: Endpoint): Promise<Endpoint>;
  update(endpoint: Endpoint): Promise<Endpoint>;
  delete(endpointId: number): Promise<void>;
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

/** Establishes the caller's identity from a credential issued elsewhere. */
export interface ExternalIdentityVerifier {
  verify(token: string): Promise<ExternalIdentity | null>;
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
