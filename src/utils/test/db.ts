/**
 * Database test utilities.
 * Use these to clean up, query, and manage test data in the database.
 */

import { pool } from '../../shared/database/pool';
import { createHash } from 'crypto';

/**
 * List of all tables that may be populated during tests, in FK-order.
 * Truncating in this order prevents orphaned/ghost rows and ensures
 * a truly empty database before each test suite run.
 */
const CLEANUP_TABLES = [
  'users',           // depends on nothing directly (root of nested relations)
  'employees',       // depends on users.id
  'branches',        // depends on users.id
  'members',         // depends on users.id
  'member_addresses', // depends on members.id
  'member_financials', // depends on members.id
  'member_kyc',      // depends on members.id
  'member_nominees', // depends on members.id
];

/**
 * Validate all test tables are empty after cleanup.
 * Only checks tables that actually exist in the database schema.
 */
async function validateDatabaseEmpty(): Promise<boolean> {
  const validationErrors: string[] = [];

  for (const tableName of CLEANUP_TABLES) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = Number(result.rows[0].count ?? 0);
      if (count > 0) {
        validationErrors.push(`${tableName}: ${count} row(s) remaining`);
      }
    } catch (error: any) {
      // Table doesn't exist yet (migrations not run), skip validation
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        continue;
      }
      console.warn(`Validation error for ${tableName}:`, error.message);
    }
  }

  if (validationErrors.length > 0) {
    console.warn('Database cleanup validation failed:');
    validationErrors.forEach((error) => console.warn(error));
    return false;
  }

  return true;
}

/**
 * Clean up database tables for testing.
 *
 * This function truncates all test-populated tables in FK-order:
 * 1. Truncates dependent tables first (members.*, employees, branches)
 * 2. Then truncates users last
 *
 * After cleanup, it validates that the tables it *actually truncated* are empty.
 * Tables that don't exist yet are simply skipped.
 * This prevents silent state bleed between test runs.
 */
export async function cleanupDatabase(): Promise<void> {
  // Truncate dependent tables first (FK cascade will clean up intervening tables)
  const tablesToTruncate = [
    'member_addresses',
    'member_financials',
    'member_kyc',
    'member_nominees',
    'members',
    'employees',
    'branches',
  ];

  for (const tableName of tablesToTruncate) {
    try {
      await pool.query(`TRUNCATE TABLE ${tableName} CASCADE`);
    } catch (error: any) {
      // If the table doesn't exist yet, just skip it
      if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
        console.warn(`Table ${tableName} cleanup error:`, error.message);
      }
    }
  }

  // Ensure users is last (no FK references into users in our schema)
  try {
    await pool.query('TRUNCATE TABLE users CASCADE');
  } catch (error: any) {
    if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
      console.warn('Users table cleanup error:', error.message);
    }
  }

  // Validate emptiness to catch constraint enforcement issues in tables that exist
  await validateDatabaseEmpty();
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
