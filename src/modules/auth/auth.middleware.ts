import type { FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../shared/database/pool";

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

export function requirePermission(permission: string) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!req.session.userId) {
      return reply.status(401).send({ error: "Not authenticated" });
    }

    if (req.session.role === "admin") {
      return;
    }

    if (req.session.role !== "employee") {
      return reply
        .status(403)
        .send({ error: "Forbidden. Insufficient permissions." });
    }

    const result = await pool.query(
      `SELECT 1
       FROM users AS u
       JOIN employee_permissions AS ep ON ep.employee_id = u.id
       WHERE u.id = $1
         AND u.role = 'employee'
         AND u.employee_status = 'active'
         AND ep.permission = $2`,
      [req.session.userId, permission],
    );
    if (result.rowCount !== 1) {
      return reply
        .status(403)
        .send({ error: "Forbidden. Insufficient permissions." });
    }
  };
}
