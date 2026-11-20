const branchCode = {
  type: "string",
  minLength: 1,
  maxLength: 30,
  pattern: "^[A-Za-z0-9][A-Za-z0-9_-]*$",
};

const branchName = {
  type: "string",
  minLength: 1,
  maxLength: 150,
  pattern: "\\S",
};

export const branchIdParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", format: "uuid" } },
} as const;

export const createBranchBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["code", "name"],
  properties: {
    code: {
      ...branchCode,
      description:
        "Unique branch code. It is trimmed and stored in uppercase.",
    },
    name: branchName,
    is_default: {
      type: "boolean",
      description:
        "Make this branch the default for member registration. This replaces the existing default.",
    },
  },
} as const;

export const updateBranchBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    code: {
      ...branchCode,
      description:
        "Unique branch code. It is trimmed and stored in uppercase.",
    },
    name: branchName,
    is_default: {
      type: "boolean",
      description:
        "A default branch cannot be unset directly. Set another branch as default to move the default.",
    },
    is_active: {
      type: "boolean",
      description:
        "Inactive branches cannot be assigned to new member registrations.",
    },
  },
} as const;

export const branchResponseSchema = {
  type: "object",
  required: [
    "id",
    "code",
    "name",
    "is_default",
    "is_active",
    "created_at",
    "updated_at",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    code: { type: "string" },
    name: { type: "string" },
    is_default: { type: "boolean" },
    is_active: { type: "boolean" },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  },
} as const;

export const branchItemResponseSchema = {
  type: "object",
  required: ["branch"],
  properties: { branch: branchResponseSchema },
} as const;

export const branchListResponseSchema = {
  type: "object",
  required: ["data"],
  properties: { data: { type: "array", items: branchResponseSchema } },
} as const;

export const branchErrorResponseSchema = {
  type: "object",
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
