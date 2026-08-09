import type { Endpoint } from "../../../domain/entities";
import type { EndpointRepository } from "../../../domain/ports";

interface EndpointRow {
  id: number;
  user_id: number | null;
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
    userId: row.user_id ?? 0,
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

  async findById(endpointId: number, ownerId: number): Promise<Endpoint | null> {
    const row = await this.db
      .prepare("SELECT * FROM webhook_tester_endpoints WHERE id = ? AND user_id = ?")
      .bind(endpointId, ownerId)
      .first<EndpointRow>();
    return row ? toEntity(row) : null;
  }

  /** Deliberately unscoped: the caller of a webhook is not signed in. */
  async findBySlug(slug: string): Promise<Endpoint | null> {
    const row = await this.db
      .prepare("SELECT * FROM webhook_tester_endpoints WHERE slug = ?")
      .bind(slug)
      .first<EndpointRow>();
    return row ? toEntity(row) : null;
  }

  async listByOwner(ownerId: number, search = ""): Promise<Endpoint[]> {
    const statement = search
      ? this.db
          .prepare(
            `SELECT * FROM webhook_tester_endpoints
              WHERE user_id = ?1 AND (name LIKE ?2 OR slug LIKE ?2)
              ORDER BY created_at DESC, id DESC`,
          )
          .bind(ownerId, `%${search}%`)
      : this.db
          .prepare(
            "SELECT * FROM webhook_tester_endpoints WHERE user_id = ? ORDER BY created_at DESC, id DESC",
          )
          .bind(ownerId);
    const { results } = await statement.all<EndpointRow>();
    return results.map(toEntity);
  }

  async create(endpoint: Endpoint): Promise<Endpoint> {
    const row = await this.db
      .prepare(
        `INSERT INTO webhook_tester_endpoints
           (user_id, name, slug, response_status, response_body, response_content_type, delay_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .bind(
        endpoint.userId,
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
          WHERE id = ? AND user_id = ? RETURNING *`,
      )
      .bind(
        endpoint.name,
        endpoint.responseStatus,
        endpoint.responseBody,
        endpoint.responseContentType,
        endpoint.delayMs,
        endpoint.id,
        endpoint.userId,
      )
      .first<EndpointRow>();
    if (!row) throw new Error(`Endpoint ${endpoint.id} disappeared during update`);
    return toEntity(row);
  }

  async delete(endpointId: number, ownerId: number): Promise<void> {
    // D1 does not enforce ON DELETE CASCADE unless PRAGMA foreign_keys is on, so
    // child rows are removed explicitly. The subquery keeps the ownership check
    // on the request delete too.
    await this.db.batch([
      this.db
        .prepare(
          `DELETE FROM webhook_tester_requests
            WHERE endpoint_id IN (SELECT id FROM webhook_tester_endpoints WHERE id = ? AND user_id = ?)`,
        )
        .bind(endpointId, ownerId),
      this.db
        .prepare("DELETE FROM webhook_tester_endpoints WHERE id = ? AND user_id = ?")
        .bind(endpointId, ownerId),
    ]);
  }

  /** Global on purpose: two accounts cannot share one /hook/<slug> URL. */
  async slugExists(slug: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT 1 AS hit FROM webhook_tester_endpoints WHERE slug = ? LIMIT 1")
      .bind(slug)
      .first<{ hit: number }>();
    return row !== null;
  }
}
