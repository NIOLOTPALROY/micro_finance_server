/**
 * Test data generators and API helper functions.
 * Use these to create consistent test data and make API calls.
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
        role: 'borrower',
        ...overrides,
    };
}

export function generateTestLoan(borrowerId: string, overrides?: Record<string, unknown>) {
    return {
        borrower_id: borrowerId,
        amount: 100000,
        interest_rate: 5.5,
        term_months: 12,
        ...overrides,
    };
}

export function generateTestRepayment(loanId: string, overrides?: Record<string, unknown>) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);

    return {
        loan_id: loanId,
        amount: 8500,
        due_date: dueDate.toISOString(),
        ...overrides,
    };
}

/**
 * Helper to register a test user and get auth token.
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

/**
 * Helper to create a test loan.
 */
export async function createTestLoan(
    app: FastifyInstance,
    token: string,
    borrowerId: string,
    loanOverrides?: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const request = (await import('supertest')).default;
    const loanData = generateTestLoan(borrowerId, loanOverrides);

    const response = await request(app.server)
        .post('/loans')
        .set('Authorization', `Bearer ${token}`)
        .send(loanData);

    if (response.status !== 201) {
        throw new Error(`Failed to create test loan: ${response.status}`);
    }

    return response.body;
}

/**
 * Helper to create a test repayment.
 */
export async function createTestRepayment(
    app: FastifyInstance,
    token: string,
    loanId: string,
    repaymentOverrides?: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const request = (await import('supertest')).default;
    const repaymentData = generateTestRepayment(loanId, repaymentOverrides);

    const response = await request(app.server)
        .post('/repayments')
        .set('Authorization', `Bearer ${token}`)
        .send(repaymentData);

    if (response.status !== 201) {
        throw new Error(`Failed to create test repayment: ${response.status}`);
    }

    return response.body;
}
