export interface Endpoint {
  id: number | null;
  name: string;
  slug: string;
  responseStatus: number;
  responseBody: string;
  responseContentType: string;
  delayMs: number;
  createdAt: string | null;
}

export interface WebhookRequest {
  id: number | null;
  endpointId: number;
  method: string;
  headers: Record<string, string>;
  body: string;
  queryParams: Record<string, string>;
  remoteAddr: string;
  timestamp: string | null;
}

export interface User {
  id: number | null;
  username: string;
  passwordHash: string | null;
}

export interface IncomingRequest {
  method: string;
  headers: Record<string, string>;
  body: string;
  queryParams: Record<string, string>;
  remoteAddr: string;
}

export interface EndpointResponse {
  status: number;
  body: string;
  contentType: string;
}

export const ENDPOINT_DEFAULTS = {
  responseStatus: 200,
  responseBody: '{"status": "ok"}',
  responseContentType: "application/json",
  delayMs: 0,
} as const;
