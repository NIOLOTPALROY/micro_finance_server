import { EMPLOYEE_PERMISSIONS } from "./employee.types";

const permissions = {
  type: "array",
  uniqueItems: true,
  items: { type: "string", enum: EMPLOYEE_PERMISSIONS },
} as const;

export const employeeIdParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", format: "uuid" } },
} as const;

export const createEmployeeBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "email", "password", "permissions"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 255, pattern: "\\S" },
    email: { type: "string", format: "email", maxLength: 255 },
    password: {
      type: "string",
      minLength: 12,
      maxLength: 128,
      description: "Initial password for the employee account.",
    },
    permissions,
  },
} as const;

export const updateEmployeeBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 255, pattern: "\\S" },
    password: { type: "string", minLength: 12, maxLength: 128 },
    status: { type: "string", enum: ["active", "inactive"] },
    permissions,
  },
} as const;

export const employeeResponseSchema = {
  type: "object",
  required: [
    "id",
    "name",
    "email",
    "status",
    "permissions",
    "created_at",
    "updated_at",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    email: { type: "string", format: "email" },
    status: { type: "string", enum: ["active", "inactive"] },
    permissions,
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  },
} as const;

export const employeeListResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: { type: "array", items: employeeResponseSchema },
  },
} as const;

export const employeeItemResponseSchema = {
  type: "object",
  required: ["employee"],
  properties: { employee: employeeResponseSchema },
} as const;
