import { CREDIT_BUREAU_CHECK_STATUSES } from "./member-assessment.types";

export const memberIdParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["memberId"],
  properties: {
    memberId: { type: "string", format: "uuid" },
  },
} as const;

export const creditBureauCheckQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
} as const;

export const creditBureauCheckSchema = {
  type: "object",
  required: [
    "id",
    "member_id",
    "requested_by",
    "status",
    "provider_name",
    "provider_reference",
    "score",
    "checked_at",
    "failure_code",
    "created_at",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    member_id: { type: "string", format: "uuid" },
    requested_by: { type: "string", format: "uuid" },
    status: { type: "string", enum: CREDIT_BUREAU_CHECK_STATUSES },
    provider_name: { anyOf: [{ type: "string" }, { type: "null" }] },
    provider_reference: { anyOf: [{ type: "string" }, { type: "null" }] },
    score: { anyOf: [{ type: "integer", minimum: 300, maximum: 900 }, { type: "null" }] },
    checked_at: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    failure_code: { anyOf: [{ type: "string" }, { type: "null" }] },
    created_at: { type: "string", format: "date-time" },
  },
} as const;

export const creditBureauCheckListResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: { type: "array", items: creditBureauCheckSchema },
  },
} as const;

export const creditBureauCheckErrorSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: { type: "string" },
    check: creditBureauCheckSchema,
  },
} as const;
