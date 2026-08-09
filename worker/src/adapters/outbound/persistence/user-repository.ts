import type { User } from "../../../domain/entities";
import type { UserRepository } from "../../../domain/ports";

interface UserRow {
  id: number;
  username: string;
  password: string;
}

const toEntity = (row: UserRow): User => ({
  id: row.id,
  username: row.username,
  passwordHash: row.password,
});

export class D1UserRepository implements UserRepository {
  constructor(private readonly db: D1Database) {}

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT * FROM users WHERE username = ?")
      .bind(username)
      .first<UserRow>();
    return row ? toEntity(row) : null;
  }

  async findById(userId: number): Promise<User | null> {
    const row = await this.db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
    return row ? toEntity(row) : null;
  }

  async create(user: User): Promise<User> {
    const row = await this.db
      .prepare("INSERT INTO users (username, password) VALUES (?, ?) RETURNING *")
      .bind(user.username, user.passwordHash)
      .first<UserRow>();
    if (!row) throw new Error("Failed to create user");
    return toEntity(row);
  }

  async count(): Promise<number> {
    const row = await this.db.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
    return row?.total ?? 0;
  }
}
