import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.routes";

export async function registerAuthModule(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes);
}

export { authRoutes } from "./auth.routes";
export { authenticate, requireRole } from "./auth.middleware";
export { AuthUserRepository } from "./auth.repository";
export type { AuthUser, LoginBody } from "./auth.types";
