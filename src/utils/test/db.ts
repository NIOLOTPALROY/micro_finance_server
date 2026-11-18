/**
 * Database test utilities.
 * Use these to clean up, query, and manage test data in the database.
 */

import { pool } from '../../shared/database/pool';
import { createHash } from 'crypto';

/**
 * Clean up database tables for testing.
 * Useful for isolating tests.
 */
export async function cleanupDatabase(): Promise<void> {
  await pool.query('DELETE FROM users');
}

/**
 * Seeds the database with 4 default admin users.
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
      'INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4)',
      [admin.email, admin.name, passwordHash, 'admin']
    );
  }
}

/**
 * Get the count of rows in a table.
 */
export async function getTableRowCount(tableName: string): Promise<number> {
  const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
  return Number(result.rows[0].count ?? 0);
}

/**
 * Get a user by email from the database.
 */
export async function getUserByEmail(email: string) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

/**
 * Get a user by ID from the database.
 */
export async function getUserById(id: string) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}
