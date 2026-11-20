import type { FastifyInstance } from "fastify";
import { requireRole } from "../auth/auth.middleware";
import { BranchRepository } from "./branch.repository";
import {
  branchErrorResponseSchema,
  branchIdParamsSchema,
  branchItemResponseSchema,
  branchListResponseSchema,
  createBranchBodySchema,
  updateBranchBodySchema,
} from "./branch.schemas";
import { BranchManagementError } from "./branch.repository";
import type { CreateBranchInput, UpdateBranchInput } from "./branch.types";

interface BranchIdParams {
  id: string;
}

export async function branchRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateBranchInput }>(
    "/branches",
    {
      preHandler: requireRole("admin"),
      schema: {
        summary: "Create a branch",
        description:
          "Creates an active branch. It can optionally replace the current default branch.",
        tags: ["Branch management"],
        body: createBranchBodySchema,
        response: {
          201: branchItemResponseSchema,
          409: branchErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const branch = await BranchRepository.create(req.body);
        return reply.status(201).send({ branch });
      } catch (error) {
        if (error instanceof BranchManagementError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    "/branches",
    {
      preHandler: requireRole("admin"),
      schema: {
        summary: "List branches",
        description:
          "Returns active and inactive branches, with the current default first.",
        tags: ["Branch management"],
        response: { 200: branchListResponseSchema },
      },
    },
    async () => ({ data: await BranchRepository.findPage() }),
  );

  app.get<{ Params: BranchIdParams }>(
    "/branches/:id",
    {
      preHandler: requireRole("admin"),
      schema: {
        summary: "Get a branch",
        tags: ["Branch management"],
        params: branchIdParamsSchema,
        response: {
          200: branchItemResponseSchema,
          404: branchErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const branch = await BranchRepository.findById(req.params.id);
      if (!branch) {
        return reply.status(404).send({ error: "Branch not found" });
      }
      return reply.send({ branch });
    },
  );

  app.patch<{ Params: BranchIdParams; Body: UpdateBranchInput }>(
    "/branches/:id",
    {
      preHandler: requireRole("admin"),
      schema: {
        summary: "Update a branch",
        description:
          "Updates branch details, active status, or moves the default designation. The existing default cannot be unset without choosing another.",
        tags: ["Branch management"],
        params: branchIdParamsSchema,
        body: updateBranchBodySchema,
        response: {
          200: branchItemResponseSchema,
          404: branchErrorResponseSchema,
          409: branchErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const branch = await BranchRepository.update(req.params.id, req.body);
        if (!branch) {
          return reply.status(404).send({ error: "Branch not found" });
        }
        return reply.send({ branch });
      } catch (error) {
        if (error instanceof BranchManagementError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: BranchIdParams }>(
    "/branches/:id",
    {
      preHandler: requireRole("admin"),
      schema: {
        summary: "Deactivate a branch",
        description:
          "Soft-deactivates a branch. Existing member assignments are retained; inactive branches cannot be assigned to new members. The default branch must be moved first.",
        tags: ["Branch management"],
        params: branchIdParamsSchema,
        response: {
          204: { type: "null", description: "Branch deactivated." },
          404: branchErrorResponseSchema,
          409: branchErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const deactivated = await BranchRepository.deactivate(req.params.id);
        if (!deactivated) {
          return reply.status(404).send({ error: "Branch not found" });
        }
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof BranchManagementError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}
