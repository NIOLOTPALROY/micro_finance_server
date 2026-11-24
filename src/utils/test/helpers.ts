/**
 * Test data generators and API helper functions.
 * Use these to create consistent test data and make API calls.
 *
 * Note: Loan and repayment-related helpers have been removed as there is no loans/repayments
 * module currently in the codebase. These will be added back when that feature is implemented.
 */

import type { FastifyInstance } from 'fastify';

export function generateTestEmail(prefix = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

export function generateTestUser(overrides?: Record<string, unknown>) {
    return {
        email: generateTestEmail('user'),
        name: 'Test User',
        password: 'password123',
        role: 'member',
        ...overrides,
    };
}

/**
 * Helper to register a test user and get auth token.
 *
 * Note: This helper references POST /auth/register, but the auth module only provides
 * login, me, and logout endpoints. Remove or update this helper when a registration
 * endpoint is implemented.
 */
export async function registerTestUser(
    app: FastifyInstance,
    userOverrides?: Record<string, unknown>
): Promise<{ token: string; userId: string; user: Record<string, unknown> }> {
    const request = (await import('supertest')).default;
    const userData = generateTestUser(userOverrides);

    const response = await request(app.server).post('/auth/register').send(userData);

    if (response.status !== 201) {
        throw new Error(`Failed to register test user: ${response.status}`);
    }

    return {
        token: response.body.token,
        userId: response.body.user.id,
        user: response.body.user,
    };
}
