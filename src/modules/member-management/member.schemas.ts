import {
  BANK_ACCOUNT_TYPES,
  CREDIT_BUREAU_STATUSES,
  KYC_APPROVAL_STATUSES,
  KYC_STATUSES,
  MARITAL_STATUSES,
  MEMBER_GENDERS,
  REGISTRATION_STATUSES,
  RESIDENCE_TYPES,
  VERIFICATION_STATUSES,
} from "./member.types";

const nullableString = (maxLength = 500) => ({
  anyOf: [{ type: "string", maxLength }, { type: "null" }],
});

const optionalEnum = (values: readonly string[]) => ({
  anyOf: [{ type: "string", enum: values }, { type: "null" }],
});

const optionalNumber = (maximum = 999_999_999) => ({
  anyOf: [{ type: "number", minimum: 0, maximum }, { type: "null" }],
});

const optionalInteger = (minimum = 0, maximum = 100_000) => ({
  anyOf: [{ type: "integer", minimum, maximum }, { type: "null" }],
});

const optionalDate = {
  anyOf: [{ type: "string", format: "date" }, { type: "null" }],
};

const optionalDateTime = {
  anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
};

const phonePattern = "^(?=(?:\\D*\\d){7,})\\+?[0-9][0-9 ()-]*$";
const optionalPhone = {
  anyOf: [
    {
      type: "string",
      minLength: 7,
      maxLength: 20,
      pattern: phonePattern,
    },
    { type: "null" },
  ],
};

export const memberProperties = {
  first_name: {
    type: "string",
    minLength: 1,
    maxLength: 100,
    pattern: "\\S",
    description:
      "Personal information section. Stored in member_personal_information.",
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
  marital_status: optionalEnum(MARITAL_STATUSES),
  mobile_number: {
    type: "string",
    minLength: 7,
    maxLength: 20,
    pattern: phonePattern,
  },
  alternate_mobile_number: optionalPhone,
  email: {
    anyOf: [
      { type: "string", format: "email", maxLength: 255 },
      { type: "null" },
    ],
  },
  photograph_reference: nullableString(512),

  registration_date: {
    type: "string",
    format: "date",
    description: "Member registration and branch assignment information.",
  },
  registration_status: { type: "string", enum: REGISTRATION_STATUSES },
  branch_id: { type: "string", format: "uuid" },
  member_category: nullableString(100),
  member_status: { type: "string", enum: REGISTRATION_STATUSES },

  village_town: {
    ...nullableString(150),
    description: "Address information section. Stored in member_addresses.",
  },
  post_office: nullableString(150),
  police_station: nullableString(150),
  gram_panchayat_municipality: nullableString(150),
  district: nullableString(150),
  state: nullableString(150),
  pin_code: nullableString(20),
  residence_type: optionalEnum(RESIDENCE_TYPES),
  years_at_current_address: optionalNumber(200),
  present_address: nullableString(2000),
  permanent_address: nullableString(2000),
  address_verification_status: { type: "string", enum: VERIFICATION_STATUSES },

  family_members_count: {
    ...optionalInteger(1),
    description:
      "Family and financial information section. Stored in member_financials.",
  },
  earning_members_count: optionalInteger(),
  dependents_count: optionalInteger(),
  occupation: nullableString(150),
  member_monthly_income: optionalNumber(),
  spouse_occupation: nullableString(150),
  spouse_monthly_income: optionalNumber(),
  other_household_income: optionalNumber(),
  monthly_household_expenses: optionalNumber(),
  household_annual_income: optionalNumber(),
  existing_loan_details: nullableString(2000),
  existing_monthly_loan_repayment: optionalNumber(),

  identity_proof_type: {
    ...nullableString(100),
    description:
      "KYC and identity verification section. Stored in member_kyc.",
  },
  identity_proof_number: nullableString(512),
  address_proof_type: nullableString(100),
  address_proof_reference: nullableString(512),
  pan: nullableString(100),
  voter_id: nullableString(100),
  kyc_document_references: {
    type: "array",
    maxItems: 50,
    items: { type: "string", maxLength: 512 },
  },
  kyc_status: { type: "string", enum: KYC_STATUSES },
  kyc_verified_at: optionalDateTime,

  nominee_full_name: {
    ...nullableString(200),
    description: "Nominee information section. Stored in member_nominees.",
  },
  nominee_relationship: nullableString(100),
  nominee_date_of_birth: optionalDate,
  nominee_mobile_number: optionalPhone,
  nominee_address: nullableString(2000),
  nominee_identity_proof: nullableString(512),

  account_holder_name: {
    ...nullableString(200),
    description: "Bank account details section. Stored in member_bank_accounts.",
  },
  bank_name: nullableString(150),
  bank_branch_name: nullableString(150),
  bank_account_number: nullableString(512),
  ifsc_code: nullableString(20),
  bank_account_type: optionalEnum(BANK_ACCOUNT_TYPES),
  bank_document_reference: nullableString(512),
  bank_verification_status: { type: "string", enum: VERIFICATION_STATUSES },

  center_name: {
    ...nullableString(150),
    description: "Member branch, center, and group assignment information.",
  },
  group_name: nullableString(150),
  field_officer_name: nullableString(200),
  joining_date: optionalDate,

  field_verification_status: {
    type: "string",
    enum: VERIFICATION_STATUSES,
    description:
      "Verification and consent information. Stored in member_verification_consents.",
  },
  residence_verification_status: {
    type: "string",
    enum: VERIFICATION_STATUSES,
  },
  income_verification_status: { type: "string", enum: VERIFICATION_STATUSES },
  credit_bureau_check_status: {
    type: "string",
    enum: CREDIT_BUREAU_STATUSES,
  },
  credit_bureau_consent_reference: nullableString(512),
  credit_bureau_consent_date: optionalDateTime,
  privacy_notice_accepted: { type: "boolean" },
  communication_sms_consent: { type: "boolean" },
  communication_whatsapp_consent: { type: "boolean" },
  communication_call_consent: { type: "boolean" },
  communication_consent_date: optionalDateTime,
  member_declaration_signed: { type: "boolean" },
  kyc_approval_status: { type: "string", enum: KYC_APPROVAL_STATUSES },

  internal_remarks: {
    ...nullableString(4000),
    description: "Internal review and approval information. Stored in member_approvals.",
  },
  rejection_or_hold_reason: nullableString(2000),
} as const;

export const createMemberBodySchema = {
  type: "object",
  description:
    "Flat registration payload grouped by member section. Each section is stored in its own related table; this request is not nested.",
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
  description:
    "Flat partial update payload. Fields belong to separate member sections and may be updated together or independently.",
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

export const memberFileUploadBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["category", "content_type", "content_length"],
  properties: {
    category: {
      type: "string",
      enum: ["image", "document"],
      description: "Whether the file belongs in the image or document prefix.",
    },
    content_type: {
      type: "string",
      enum: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      description: "The file MIME type; it must be supported for the category.",
    },
    content_length: {
      type: "integer",
      minimum: 1,
      description: "The original file size in bytes.",
    },
  },
} as const;

export const memberFileUploadResponseSchema = {
  type: "object",
  required: ["method", "file_field", "key", "url", "fields", "expires_in"],
  properties: {
    method: { type: "string", const: "POST" },
    file_field: { type: "string", const: "file" },
    key: { type: "string" },
    url: { type: "string", format: "uri" },
    fields: {
      type: "object",
      additionalProperties: { type: "string" },
    },
    expires_in: { type: "integer" },
  },
} as const;

export const memberFileDownloadQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["key"],
  properties: {
    key: {
      type: "string",
      minLength: 1,
      maxLength: 512,
      description: "S3 object key already associated with this member.",
    },
  },
} as const;

export const memberFileDownloadResponseSchema = {
  type: "object",
  required: ["url", "expires_in"],
  properties: {
    url: { type: "string", format: "uri" },
    expires_in: { type: "integer" },
  },
} as const;
