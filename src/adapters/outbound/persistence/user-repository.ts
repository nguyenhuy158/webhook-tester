import type { User } from "../../../domain/entities";
import type { UserRepository } from "../../../domain/ports";

interface UserRow {
  id: number;
  username: string;
  password: string | null;
  email: string | null;
  google_sub: string | null;
}

const toEntity = (row: UserRow): User => ({
  id: row.id,
  username: row.username,
  passwordHash: row.password,
  email: row.email,
  googleSub: row.google_sub,
});

export class D1UserRepository implements UserRepository {
  constructor(private readonly db: D1Database) {}

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT * FROM webhook_tester_users WHERE username = ?")
      .bind(username)
      .first<UserRow>();
    return row ? toEntity(row) : null;
  }

  async findById(userId: number): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT * FROM webhook_tester_users WHERE id = ?")
      .bind(userId)
      .first<UserRow>();
    return row ? toEntity(row) : null;
  }

  async findByGoogleSub(googleSub: string): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT * FROM webhook_tester_users WHERE google_sub = ?")
      .bind(googleSub)
      .first<UserRow>();
    return row ? toEntity(row) : null;
  }

  async create(user: User): Promise<User> {
    const row = await this.db
      .prepare(
        `INSERT INTO webhook_tester_users (username, password, email, google_sub)
         VALUES (?, ?, ?, ?) RETURNING *`,
      )
      .bind(user.username, user.passwordHash, user.email, user.googleSub)
      .first<UserRow>();
    if (!row) throw new Error("Failed to create user");
    return toEntity(row);
  }
}
