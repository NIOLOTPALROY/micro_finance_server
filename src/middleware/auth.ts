import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Authentication middleware for session-based auth.
 * Checks if user has an active session.
 */
export async function authenticate(
    req: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    if (!req.session.userId) {
        return reply.status(401).send({ error: 'Not authenticated. Please login first.' });
    }
}

/**
 * Role guard. Use as a preHandler after `authenticate`.
 * Verifies user has one of the required roles.
 */
export function requireRole(...allowedRoles: string[]) {
    return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
        if (!req.session.userId) {
            return reply.status(401).send({ error: 'Not authenticated' });
        }
        const userRole = req.session.role;
        if (!userRole || !allowedRoles.includes(userRole)) {
            return reply.status(403).send({ error: 'Forbidden. Insufficient permissions.' });
        }
    };
}
