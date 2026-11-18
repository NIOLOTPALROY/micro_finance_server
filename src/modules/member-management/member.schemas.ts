import {
  MARITAL_STATUSES,
  MEMBER_GENDERS,
} from "./member.types";

const nullableString = (maxLength: number) => ({
  anyOf: [
    { type: "string", maxLength },
    { type: "null" },
  ],
});

const phonePattern = "^(?=(?:\\D*\\d){7,})\\+?[0-9][0-9 ()-]*$";

const memberProperties = {
  first_name: {
    type: "string",
    minLength: 1,
    maxLength: 100,
    pattern: "\\S",
  },
  last_name: {
    type: "string",
    minLength: 1,
    maxLength: 100,
    pattern: "\\S",
  },
  father_or_husband_name: {
    type: "string",
    minLength: 1,
    maxLength: 150,
    pattern: "\\S",
  },
  date_of_birth: { type: "string", format: "date" },
  gender: { type: "string", enum: MEMBER_GENDERS },
  marital_status: {
    anyOf: [
      { type: "string", enum: MARITAL_STATUSES },
      { type: "null" },
    ],
  },
  mobile_number: {
    type: "string",
    minLength: 7,
    maxLength: 20,
    pattern: phonePattern,
  },
  alternate_mobile_number: {
    anyOf: [
      {
        type: "string",
        minLength: 7,
        maxLength: 20,
        pattern: phonePattern,
      },
      { type: "null" },
    ],
  },
  email: {
    anyOf: [
      { type: "string", format: "email", maxLength: 255 },
      { type: "null" },
    ],
  },
  photograph_reference: nullableString(512),
};

export const createMemberBodySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "first_name",
    "last_name",
    "father_or_husband_name",
    "date_of_birth",
    "gender",
    "mobile_number",
  ],
  properties: memberProperties,
} as const;

export const updateMemberBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: memberProperties,
} as const;

export const memberIdParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: {
    id: { type: "string", format: "uuid" },
  },
} as const;

export const memberListQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
} as const;
