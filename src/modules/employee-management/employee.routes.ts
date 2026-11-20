import type { FastifyInstance } from "fastify";
import { requireRole } from "../auth/auth.middleware";
import { EmployeeRepository } from "./employee.repository";
import {
  createEmployeeBodySchema,
  employeeIdParamsSchema,
  employeeItemResponseSchema,
  employeeListResponseSchema,
  updateEmployeeBodySchema,
} from "./employee.schemas";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "./employee.types";

interface EmployeeIdParams {
  id: string;
}

export async function employeeRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateEmployeeInput }>(
    "/employees",
    {
      preHandler: requireRole("admin"),
      schema: {
        summary: "Create an employee",
        description:
          "Creates an active employee login and grants the selected permissions.",
        tags: ["Employee management"],
        body: createEmployeeBodySchema,
        response: { 201: employeeItemResponseSchema },
      },
    },
    async (req, reply) => {
      const actorId = req.session.userId;
      if (!actorId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const employee = await EmployeeRepository.create(req.body, actorId);
      return reply.status(201).send({ employee });
    },
  );

  app.get(
    "/employees",
    {
      preHandler: requireRole("admin"),
      schema: {
        summary: "List employees",
        tags: ["Employee management"],
        response: { 200: employeeListResponseSchema },
      },
    },
    async () => ({ data: await EmployeeRepository.findPage() }),
  );

  app.get<{ Params: EmployeeIdParams }>(
    "/employees/:id",
    {
      preHandler: requireRole("admin"),
      schema: {
        summary: "Get an employee",
        tags: ["Employee management"],
        params: employeeIdParamsSchema,
        response: {
          200: employeeItemResponseSchema,
          404: {
            type: "object",
            required: ["error"],
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (req, reply) => {
      const employee = await EmployeeRepository.findById(req.params.id);
      if (!employee) {
        return reply.status(404).send({ error: "Employee not found" });
      }
      return reply.send({ employee });
    },
  );

  app.patch<{ Params: EmployeeIdParams; Body: UpdateEmployeeInput }>(
    "/employees/:id",
    {
      preHandler: requireRole("admin"),
      schema: {
        summary: "Update an employee",
        description:
          "Updates employee details, active status, password, and/or the complete permission assignment.",
        tags: ["Employee management"],
        params: employeeIdParamsSchema,
        body: updateEmployeeBodySchema,
        response: {
          200: employeeItemResponseSchema,
          404: {
            type: "object",
            required: ["error"],
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (req, reply) => {
      const actorId = req.session.userId;
      if (!actorId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }
      const employee = await EmployeeRepository.update(
        req.params.id,
        req.body,
        actorId,
      );
      if (!employee) {
        return reply.status(404).send({ error: "Employee not found" });
      }
      return reply.send({ employee });
    },
  );

  app.delete<{ Params: EmployeeIdParams }>(
    "/employees/:id",
    {
      preHandler: requireRole("admin"),
      schema: {
        summary: "Deactivate an employee",
        description:
          "Disables the employee login without deleting the employee or permission history.",
        tags: ["Employee management"],
        params: employeeIdParamsSchema,
        response: {
          204: { type: "null", description: "Employee deactivated." },
          404: {
            type: "object",
            required: ["error"],
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (req, reply) => {
      const actorId = req.session.userId;
      if (!actorId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }
      const deactivated = await EmployeeRepository.deactivate(
        req.params.id,
        actorId,
      );
      if (!deactivated) {
        return reply
          .status(404)
          .send({ error: "Employee not found or already inactive" });
      }
      return reply.status(204).send();
    },
  );
}
