import type { WebhookRequest } from "../../../domain/entities";
import type { RequestRepository } from "../../../domain/ports";

interface RequestRow {
  id: number;
  endpoint_id: number;
  method: string;
  headers: string;
  body: string;
  query_params: string;
  remote_addr: string;
  timestamp: string;
}

function parseJsonObject(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function toEntity(row: RequestRow): WebhookRequest {
  return {
    id: row.id,
    endpointId: row.endpoint_id,
    method: row.method,
    headers: parseJsonObject(row.headers),
    body: row.body,
    queryParams: parseJsonObject(row.query_params),
    remoteAddr: row.remote_addr,
    timestamp: row.timestamp,
  };
}

export class D1RequestRepository implements RequestRepository {
  constructor(private readonly db: D1Database) {}

  async save(request: WebhookRequest): Promise<WebhookRequest> {
    const row = await this.db
      .prepare(
        `INSERT INTO webhook_tester_requests (endpoint_id, method, headers, body, query_params, remote_addr)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .bind(
        request.endpointId,
        request.method,
        JSON.stringify(request.headers),
        request.body,
        JSON.stringify(request.queryParams),
        request.remoteAddr,
      )
      .first<RequestRow>();
    if (!row) throw new Error("Failed to save request");
    return toEntity(row);
  }

  async listByEndpoint(endpointId: number, limit = 50): Promise<WebhookRequest[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM webhook_tester_requests WHERE endpoint_id = ? ORDER BY id DESC LIMIT ?")
      .bind(endpointId, limit)
      .all<RequestRow>();
    return results.map(toEntity);
  }

  async deleteByEndpoint(endpointId: number): Promise<void> {
    await this.db.prepare("DELETE FROM webhook_tester_requests WHERE endpoint_id = ?").bind(endpointId).run();
  }
}
