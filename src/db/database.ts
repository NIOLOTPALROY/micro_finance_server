import { Kysely, PostgresDialect } from 'kysely';
import type { Generated, Selectable } from 'kysely';
import { Pool } from 'pg';

/**
 * User table schema (internal database representation)
 */
export interface UserTable {
    id: Generated<string>;
    email: string;
    name: string;
    password_hash: string;
    role: 'admin' | 'borrower' | 'lender';
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

/**
 * Session table schema for storing session data in database
 */
export interface SessionTable {
    sid: string;
    sess: Record<string, unknown>;
    expire: Date;
}

/**
 * User type (what we get from queries)
 */
export type User = Selectable<UserTable>;

/**
 * Database schema types
 */
export interface Database {
    users: UserTable;
    session: SessionTable;
}

/**
 * Create and export Kysely instance
 */
export const db = new Kysely<Database>({
    dialect: new PostgresDialect({
        pool: new Pool({
            host: process.env.PG_HOST ?? 'localhost',
            port: Number(process.env.PG_PORT ?? 5432),
            database: process.env.PG_DATABASE ?? 'micro_finance',
            user: process.env.PG_USER ?? 'postgres',
            password: process.env.PG_PASSWORD ?? 'postgres',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        }),
    }),
});

export default db;
