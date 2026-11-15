import type { HealthCheck } from "../../../domain/ports";

const PING_SQL = "SELECT 1";

export class D1HealthCheck implements HealthCheck {
  constructor(private readonly db: D1Database) {}

  async ping(): Promise<void> {
    await this.db.prepare(PING_SQL).first();
  }
}
