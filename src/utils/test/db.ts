import { createHash } from 'crypto';
import { pool } from '../../shared/database/pool';

/**
 * Adds four development admin accounts without changing existing database rows.
 */
export async function seedDatabase(): Promise<void> {
  const adminUsers = [
    { email: 'admin1@example.com', name: 'Admin 1', password: 'password123' },
    { email: 'admin2@example.com', name: 'Admin 2', password: 'password123' },
    { email: 'admin3@example.com', name: 'Admin 3', password: 'password123' },
    { email: 'admin4@example.com', name: 'Admin 4', password: 'password123' },
  ];

  for (const admin of adminUsers) {
    const passwordHash = createHash('sha256').update(admin.password).digest('hex');
    await pool.query(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [admin.email, admin.name, passwordHash, 'admin'],
    );
  }
}
