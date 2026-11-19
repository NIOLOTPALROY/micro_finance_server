import { pool } from "../../shared/database/pool";
import type { UserRole } from "./auth.types";

export interface User {
  id: string;
  email: string | null;
  name: string;
  password_hash: string | null;
  role: UserRole;
  member_status?: string | null;
  created_at: Date;
  updated_at: Date;
}

export class AuthUserRepository {
  static async findByEmail(email: string): Promise<User | undefined> {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] as User | undefined;
  }

  static async findById(id: string): Promise<User | undefined> {
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] as User | undefined;
  }
}
