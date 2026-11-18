import type { FastifyRequest, FastifyReply } from "fastify";

export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!req.session.userId) {
    return reply
      .status(401)
      .send({ error: "Not authenticated. Please login first." });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!req.session.userId) {
      return reply.status(401).send({ error: "Not authenticated" });
    }

    if (!req.session.role || !allowedRoles.includes(req.session.role)) {
      return reply
        .status(403)
        .send({ error: "Forbidden. Insufficient permissions." });
    }
  };
}
