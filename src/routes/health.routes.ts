import type { FastifyInstance } from 'fastify';
import { pool } from '../db/db';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    let databaseStatus = 'ok';
    try {
      await pool.query('SELECT 1');
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
