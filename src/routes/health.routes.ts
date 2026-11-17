import type { FastifyInstance } from 'fastify';
import { db } from '../db/database.js';
import { sql } from 'kysely';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
    app.get('/health', async () => {
        let databaseStatus = 'ok';
        try {
            await sql`SELECT 1`.execute(db);
        } catch (error) {
            databaseStatus = 'error';
            app.log.error(error, 'Health check database error');
        }

        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: databaseStatus,
        };
    });
}
