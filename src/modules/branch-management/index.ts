import type { FastifyInstance } from "fastify";
import { branchRoutes } from "./branch.routes";

export async function registerBranchManagementModule(
  app: FastifyInstance,
): Promise<void> {
  await app.register(branchRoutes);
}

export { branchRoutes } from "./branch.routes";
export { BranchManagementError, BranchRepository } from "./branch.repository";
export type {
  Branch,
  CreateBranchInput,
  UpdateBranchInput,
} from "./branch.types";
