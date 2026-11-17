/**
 * Database test utilities.
 * Use these to clean up, query, and manage test data in the database.
 */

import { db } from '../../db/database';
import { createHash } from 'crypto';

/**
 * Clean up database tables for testing.
 * Useful for isolating tests.
 */
export async function cleanupDatabase(): Promise<void> {
  await db.deleteFrom('users').execute();
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
    await db
      .insertInto('users')
      .values({
        email: admin.email,
        name: admin.name,
        password_hash: passwordHash,
        role: 'admin',
      })
      .execute();
  }
}

/**
 * Get the count of rows in a table.
 */
export async function getTableRowCount(tableName: any): Promise<number> {
  const result = await db.selectFrom(tableName).select(db.fn.countAll().as('count')).executeTakeFirst();
  return Number(result?.count ?? 0);
}

/**
 * Get a user by email from the database.
 */
export async function getUserByEmail(email: string) {
  return await db.selectFrom('users').selectAll().where('email', '=', email).executeTakeFirst();
}

/**
 * Get a user by ID from the database.
 */
export async function getUserById(id: string) {
  return await db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
}