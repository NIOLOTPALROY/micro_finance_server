import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';

/**
 * Register all application routes
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
    // Health check
    await app.register(healthRoutes);

    // Authentication routes
    await app.register(authRoutes);
}
