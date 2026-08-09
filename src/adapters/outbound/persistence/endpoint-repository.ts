import type { Endpoint } from "../../../domain/entities";
import type { EndpointRepository } from "../../../domain/ports";

interface EndpointRow {
  id: number;
  name: string;
  slug: string;
  response_status: number;
  response_body: string;
  response_content_type: string;
  delay_ms: number;
  created_at: string;
}

function toEntity(row: EndpointRow): Endpoint {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    responseContentType: row.response_content_type,
    delayMs: row.delay_ms,
    createdAt: row.created_at,
  };
}

export class D1EndpointRepository implements EndpointRepository {
  constructor(private readonly db: D1Database) {}

  async findById(endpointId: number): Promise<Endpoint | null> {
    const row = await this.db
      .prepare("SELECT * FROM webhook_tester_endpoints WHERE id = ?")
      .bind(endpointId)
      .first<EndpointRow>();
    return row ? toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<Endpoint | null> {
    const row = await this.db
      .prepare("SELECT * FROM webhook_tester_endpoints WHERE slug = ?")
      .bind(slug)
      .first<EndpointRow>();
    return row ? toEntity(row) : null;
  }

  async listAll(search = ""): Promise<Endpoint[]> {
    const statement = search
      ? this.db
          .prepare(
            "SELECT * FROM webhook_tester_endpoints WHERE name LIKE ?1 OR slug LIKE ?1 ORDER BY created_at DESC, id DESC",
          )
          .bind(`%${search}%`)
      : this.db.prepare("SELECT * FROM webhook_tester_endpoints ORDER BY created_at DESC, id DESC");
    const { results } = await statement.all<EndpointRow>();
    return results.map(toEntity);
  }

  async create(endpoint: Endpoint): Promise<Endpoint> {
    const row = await this.db
      .prepare(
        `INSERT INTO webhook_tester_endpoints (name, slug, response_status, response_body, response_content_type, delay_ms)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .bind(
        endpoint.name,
        endpoint.slug,
        endpoint.responseStatus,
        endpoint.responseBody,
        endpoint.responseContentType,
        endpoint.delayMs,
      )
      .first<EndpointRow>();
    if (!row) throw new Error("Failed to create endpoint");
    return toEntity(row);
  }

  async update(endpoint: Endpoint): Promise<Endpoint> {
    const row = await this.db
      .prepare(
        `UPDATE webhook_tester_endpoints
            SET name = ?, response_status = ?, response_body = ?, response_content_type = ?, delay_ms = ?
          WHERE id = ? RETURNING *`,
      )
      .bind(
        endpoint.name,
        endpoint.responseStatus,
        endpoint.responseBody,
        endpoint.responseContentType,
        endpoint.delayMs,
        endpoint.id,
      )
      .first<EndpointRow>();
    if (!row) throw new Error(`Endpoint ${endpoint.id} disappeared during update`);
    return toEntity(row);
  }

  async delete(endpointId: number): Promise<void> {
    // D1 does not enforce ON DELETE CASCADE unless PRAGMA foreign_keys is on, so
    // child rows are removed explicitly.
    await this.db.batch([
      this.db.prepare("DELETE FROM webhook_tester_requests WHERE endpoint_id = ?").bind(endpointId),
      this.db.prepare("DELETE FROM webhook_tester_endpoints WHERE id = ?").bind(endpointId),
    ]);
  }

  async slugExists(slug: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT 1 AS hit FROM webhook_tester_endpoints WHERE slug = ? LIMIT 1")
      .bind(slug)
      .first<{ hit: number }>();
    return row !== null;
  }
}
