import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.routes";

export async function registerHealthModule(
  app: FastifyInstance,
): Promise<void> {
  await app.register(healthRoutes);
}

export { healthRoutes } from "./health.routes";
