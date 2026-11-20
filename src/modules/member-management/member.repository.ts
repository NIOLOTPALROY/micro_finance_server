import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "../../shared/database/pool";
import {
  decryptMemberSensitiveData,
  encryptMemberSensitiveData,
  maskSensitiveValue,
  SENSITIVE_MEMBER_FIELDS,
  type EncryptedMemberData,
  type SensitiveMemberData,
} from "./member-sensitive-data";
import type {
  CreateMemberInput,
  Member,
  UpdateMemberInput,
} from "./member.types";

type MemberSection =
  | "personal"
  | "address"
  | "financial"
  | "kyc"
  | "nominee"
  | "bank"
  | "assignment"
  | "verification"
  | "approval";

interface MemberSectionDefinition {
  table: string;
  columns: ReadonlyArray<readonly [keyof CreateMemberInput, string]>;
}

interface MemberDatabaseRow extends QueryResultRow {
  id: string;
  branch_name: string;
  personal_data: Record<string, unknown> | null;
  address_data: Record<string, unknown> | null;
  financial_data: Record<string, unknown> | null;
  kyc_data: Record<string, unknown> | null;
  nominee_data: Record<string, unknown> | null;
  bank_data: Record<string, unknown> | null;
  assignment_data: Record<string, unknown> | null;
  verification_data: Record<string, unknown> | null;
  approval_data: Record<string, unknown> | null;
  nonce: Buffer | null;
  ciphertext: Buffer | null;
  auth_tag: Buffer | null;
}

interface SectionMetadata {
  values: Record<string, unknown>;
  now: string[];
}

const memberColumns: ReadonlyArray<
  readonly [keyof CreateMemberInput, string]
> = [
  ["registration_date", "registration_date"],
  ["registration_status", "registration_status"],
  ["branch_id", "branch_id"],
  ["member_status", "member_status"],
];

const sections: Record<MemberSection, MemberSectionDefinition> = {
  personal: {
    table: "member_personal_information",
    columns: [
      ["first_name", "first_name"],
      ["last_name", "last_name"],
      ["father_or_husband_name", "father_or_husband_name"],
      ["date_of_birth", "date_of_birth"],
      ["gender", "gender"],
      ["marital_status", "marital_status"],
      ["mobile_number", "mobile_number"],
      ["alternate_mobile_number", "alternate_mobile_number"],
      ["email", "contact_email"],
      ["photograph_reference", "photograph_reference"],
    ],
  },
  address: {
    table: "member_addresses",
    columns: [
      ["village_town", "village_town"],
      ["post_office", "post_office"],
      ["police_station", "police_station"],
      ["gram_panchayat_municipality", "gram_panchayat_municipality"],
      ["district", "district"],
      ["state", "state"],
      ["pin_code", "pin_code"],
      ["residence_type", "residence_type"],
      ["years_at_current_address", "years_at_current_address"],
      ["present_address", "present_address"],
      ["permanent_address", "permanent_address"],
      ["address_verification_status", "address_verification_status"],
    ],
  },
  financial: {
    table: "member_financials",
    columns: [
      ["family_members_count", "family_members_count"],
      ["earning_members_count", "earning_members_count"],
      ["dependents_count", "dependents_count"],
      ["occupation", "occupation"],
      ["member_monthly_income", "member_monthly_income"],
      ["spouse_occupation", "spouse_occupation"],
      ["spouse_monthly_income", "spouse_monthly_income"],
      ["other_household_income", "other_household_income"],
      ["monthly_household_expenses", "monthly_household_expenses"],
      ["household_annual_income", "household_annual_income"],
      ["existing_loan_details", "existing_loan_details"],
      ["existing_monthly_loan_repayment", "existing_monthly_loan_repayment"],
    ],
  },
  kyc: {
    table: "member_kyc",
    columns: [
      ["identity_proof_type", "identity_proof_type"],
      ["address_proof_type", "address_proof_type"],
      ["kyc_document_references", "kyc_document_references"],
      ["kyc_status", "kyc_status"],
      ["kyc_verified_at", "kyc_verified_at"],
      ["kyc_approval_status", "kyc_approval_status"],
    ],
  },
  nominee: {
    table: "member_nominees",
    columns: [
      ["nominee_full_name", "nominee_full_name"],
      ["nominee_relationship", "nominee_relationship"],
      ["nominee_date_of_birth", "nominee_date_of_birth"],
      ["nominee_mobile_number", "nominee_mobile_number"],
      ["nominee_address", "nominee_address"],
    ],
  },
  bank: {
    table: "member_bank_accounts",
    columns: [
      ["account_holder_name", "account_holder_name"],
      ["bank_name", "bank_name"],
      ["bank_branch_name", "bank_branch_name"],
      ["ifsc_code", "ifsc_code"],
      ["bank_account_type", "bank_account_type"],
      ["bank_document_reference", "bank_document_reference"],
      ["bank_verification_status", "bank_verification_status"],
    ],
  },
  assignment: {
    table: "member_assignments",
    columns: [
      ["center_name", "center_name"],
      ["group_name", "group_name"],
      ["field_officer_name", "field_officer_name"],
      ["joining_date", "joining_date"],
      ["member_category", "member_category"],
    ],
  },
  verification: {
    table: "member_verification_consents",
    columns: [
      ["field_verification_status", "field_verification_status"],
      ["residence_verification_status", "residence_verification_status"],
      ["income_verification_status", "income_verification_status"],
      ["credit_bureau_check_status", "credit_bureau_check_status"],
      ["credit_bureau_consent_reference", "credit_bureau_consent_reference"],
      ["credit_bureau_consent_date", "credit_bureau_consent_date"],
      ["privacy_notice_accepted", "privacy_notice_accepted"],
      ["communication_sms_consent", "communication_sms_consent"],
      ["communication_whatsapp_consent", "communication_whatsapp_consent"],
      ["communication_call_consent", "communication_call_consent"],
      ["communication_consent_date", "communication_consent_date"],
      ["member_declaration_signed", "member_declaration_signed"],
    ],
  },
  approval: {
    table: "member_approvals",
    columns: [
      ["internal_remarks", "internal_remarks"],
      ["rejection_or_hold_reason", "rejection_or_hold_reason"],
    ],
  },
};

const assignmentFields = new Set<keyof CreateMemberInput>([
  "branch_id",
  "center_name",
  "group_name",
  "field_officer_name",
  "member_category",
  "joining_date",
]);
const communicationConsentFields = [
  "privacy_notice_accepted",
  "communication_sms_consent",
  "communication_whatsapp_consent",
  "communication_call_consent",
  "communication_consent_date",
] as const;

function isProvided(input: object, key: PropertyKey): boolean {
  return Object.hasOwn(input, key);
}

function inputValue(
  input: object,
  key: keyof CreateMemberInput,
): unknown {
  return (input as Record<string, unknown>)[key];
}

function normalizeValue(
  key: keyof CreateMemberInput,
  value: unknown,
): unknown {
  if (key === "kyc_document_references") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return value.trim() || null;
  }
  return value;
}

function providedSensitiveUpdates(input: object): SensitiveMemberData | null {
  const updates: SensitiveMemberData = {};
  let hasUpdate = false;

  for (const field of SENSITIVE_MEMBER_FIELDS) {
    if (!isProvided(input, field)) {
      continue;
    }

    hasUpdate = true;
    const value = (input as Record<string, unknown>)[field];
    if (typeof value === "string" && value.trim()) {
      updates[field] = value.trim();
    } else {
      updates[field] = undefined;
    }
  }

  return hasUpdate ? updates : null;
}

function mergeSensitiveData(
  current: SensitiveMemberData,
  updates: SensitiveMemberData,
): SensitiveMemberData {
  const merged = { ...current };
  for (const field of SENSITIVE_MEMBER_FIELDS) {
    if (!Object.hasOwn(updates, field)) {
      continue;
    }
    const value = updates[field];
    if (value) {
      merged[field] = value;
    } else {
      delete merged[field];
    }
  }
  return merged;
}

async function saveSensitiveData(
  client: PoolClient,
  userId: string,
  updates: SensitiveMemberData | null,
): Promise<void> {
  if (!updates) {
    return;
  }

  const currentResult = await client.query<EncryptedMemberData>(
    `SELECT nonce, ciphertext, auth_tag
     FROM member_sensitive_data
     WHERE user_id = $1
     FOR UPDATE`,
    [userId],
  );
  const currentEncrypted = currentResult.rows[0];
  const currentData = currentEncrypted
    ? decryptMemberSensitiveData(currentEncrypted)
    : {};
  const merged = mergeSensitiveData(currentData, updates);
  const hasData = Object.values(merged).some(Boolean);

  if (!hasData) {
    await client.query(
      "DELETE FROM member_sensitive_data WHERE user_id = $1",
      [userId],
    );
    return;
  }

  const encrypted = encryptMemberSensitiveData(merged);
  await client.query(
    `INSERT INTO member_sensitive_data (user_id, nonce, ciphertext, auth_tag)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       nonce = EXCLUDED.nonce,
       ciphertext = EXCLUDED.ciphertext,
       auth_tag = EXCLUDED.auth_tag,
       updated_at = NOW()`,
    [
      userId,
      encrypted.nonce,
      encrypted.ciphertext,
      encrypted.auth_tag,
    ],
  );
}

async function toMember(row: MemberDatabaseRow): Promise<Member> {
  const {
    personal_data,
    address_data,
    financial_data,
    kyc_data,
    nominee_data,
    bank_data,
    assignment_data,
    verification_data,
    approval_data,
    nonce,
    ciphertext,
    auth_tag,
    ...publicColumns
  } = row;
  const { contact_email, ...personalInformation } = personal_data ?? {};
  const encrypted =
    nonce && ciphertext && auth_tag ? { nonce, ciphertext, auth_tag } : null;
  const sensitive = encrypted
    ? decryptMemberSensitiveData(encrypted)
    : {};

  return {
    ...publicColumns,
    ...personalInformation,
    email: typeof contact_email === "string" ? contact_email : null,
    ...address_data,
    ...financial_data,
    ...kyc_data,
    ...nominee_data,
    ...bank_data,
    ...assignment_data,
    ...verification_data,
    ...approval_data,
    identity_proof_number_masked: maskSensitiveValue(
      sensitive.identity_proof_number,
    ),
    address_proof_reference_masked: maskSensitiveValue(
      sensitive.address_proof_reference,
    ),
    pan_masked: maskSensitiveValue(sensitive.pan),
    voter_id_masked: maskSensitiveValue(sensitive.voter_id),
    nominee_identity_proof_masked: maskSensitiveValue(
      sensitive.nominee_identity_proof,
    ),
    bank_account_number_masked: maskSensitiveValue(
      sensitive.bank_account_number,
    ),
  } as Member;
}

async function selectMember(
  client: PoolClient,
  id: string,
): Promise<Member | undefined> {
  const result = await client.query<MemberDatabaseRow>(
    `SELECT m.id, m.created_by, m.updated_by, m.created_at, m.updated_at,
            m.member_number, m.registration_date, m.registration_status,
            m.branch_id, m.member_status, b.name AS branch_name,
            to_jsonb(p) - 'user_id' AS personal_data,
            to_jsonb(a) - 'user_id' AS address_data,
            to_jsonb(f) - 'user_id' AS financial_data,
            to_jsonb(k) - 'user_id' AS kyc_data,
            to_jsonb(n) - 'user_id' AS nominee_data,
            to_jsonb(ba) - 'user_id' AS bank_data,
            to_jsonb(ass) - 'user_id' AS assignment_data,
            to_jsonb(v) - 'user_id' AS verification_data,
            to_jsonb(ap) - 'user_id' AS approval_data,
            s.nonce, s.ciphertext, s.auth_tag
     FROM users AS m
     JOIN branches AS b ON b.id = m.branch_id
     LEFT JOIN member_personal_information AS p ON p.user_id = m.id
     LEFT JOIN member_addresses AS a ON a.user_id = m.id
     LEFT JOIN member_financials AS f ON f.user_id = m.id
     LEFT JOIN member_kyc AS k ON k.user_id = m.id
     LEFT JOIN member_nominees AS n ON n.user_id = m.id
     LEFT JOIN member_bank_accounts AS ba ON ba.user_id = m.id
     LEFT JOIN member_assignments AS ass ON ass.user_id = m.id
     LEFT JOIN member_verification_consents AS v ON v.user_id = m.id
     LEFT JOIN member_approvals AS ap ON ap.user_id = m.id
     LEFT JOIN member_sensitive_data AS s ON s.user_id = m.id
     WHERE m.id = $1 AND m.role = 'member' AND m.member_number IS NOT NULL`,
    [id],
  );
  const row = result.rows[0];
  return row ? toMember(row) : undefined;
}

async function rollbackAndRethrow(
  client: PoolClient,
  error: unknown,
): Promise<never> {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    throw new AggregateError(
      [error, rollbackError],
      "Member transaction failed and rollback also failed",
    );
  }
  throw error;
}

function sectionMetadata(
  section: MemberSection,
  input: object,
  actorId: string,
  onCreate: boolean,
): SectionMetadata {
  const metadata: SectionMetadata = { values: {}, now: [] };
  const read = (key: keyof CreateMemberInput) => inputValue(input, key);

  if (
    section === "assignment" &&
    (onCreate ||
      [...assignmentFields].some((field) => isProvided(input, field)))
  ) {
    metadata.values.assigned_by = actorId;
  }

  if (
    section === "kyc" &&
    (read("kyc_status") === "verified" ||
      (isProvided(input, "kyc_verified_at") && read("kyc_verified_at")))
  ) {
    metadata.values.kyc_verified_by = actorId;
    if (
      read("kyc_status") === "verified" &&
      !read("kyc_verified_at")
    ) {
      metadata.now.push("kyc_verified_at");
    }
  }

  if (section === "verification") {
    const consentTouched = communicationConsentFields.some((field) =>
      isProvided(input, field)
    );
    if (consentTouched) {
      metadata.values.communication_consent_recorded_by = actorId;
      const decisionTouched = communicationConsentFields
        .slice(0, -1)
        .some((field) => isProvided(input, field));
      if (
        decisionTouched &&
        !isProvided(input, "communication_consent_date")
      ) {
        metadata.now.push("communication_consent_date");
      }
    }
  }

  if (section === "approval") {
    const status = read("registration_status") ?? read("member_status");
    const reviewFieldsTouched =
      isProvided(input, "internal_remarks") ||
      isProvided(input, "rejection_or_hold_reason");
    if (
      reviewFieldsTouched ||
      status === "under_review" ||
      status === "approved" ||
      status === "rejected"
    ) {
      metadata.values.reviewed_by = actorId;
      metadata.now.push("reviewed_at");
    }
    if (
      read("registration_status") === "approved" ||
      read("member_status") === "approved"
    ) {
      metadata.values.approved_by = actorId;
      metadata.now.push("approved_at");
    }
  }

  return metadata;
}

async function upsertSection(
  client: PoolClient,
  section: MemberSection,
  userId: string,
  input: object,
  actorId: string,
  onCreate: boolean,
): Promise<void> {
  const definition = sections[section];
  const fields = definition.columns.filter(([key]) => isProvided(input, key));
  const metadata = sectionMetadata(section, input, actorId, onCreate);
  if (section === "personal" && !onCreate) {
    if (fields.length === 0) {
      return;
    }

    const values: unknown[] = [userId];
    const assignments = fields.map(([key, column]) => {
      values.push(normalizeValue(key, inputValue(input, key)));
      return `${column} = $${values.length}`;
    });
    const result = await client.query(
      `UPDATE ${definition.table}
       SET ${assignments.join(", ")}
       WHERE user_id = $1`,
      values,
    );
    if (result.rowCount !== 1) {
      throw new Error("Member personal information record not found");
    }
    return;
  }

  if (!onCreate && fields.length === 0 &&
      Object.keys(metadata.values).length === 0 &&
      metadata.now.length === 0) {
    return;
  }

  const names = ["user_id", ...fields.map(([, column]) => column)];
  const values: unknown[] = [userId];
  for (const [key] of fields) {
    values.push(normalizeValue(key, inputValue(input, key)));
  }

  for (const [column, value] of Object.entries(metadata.values)) {
    names.push(column);
    values.push(value);
  }
  names.push(...metadata.now);

  let valueIndex = 0;
  const expressions = names.map((name) => {
    if (metadata.now.includes(name)) {
      return "NOW()";
    }
    valueIndex += 1;
    return `$${valueIndex}`;
  });
  const updateColumns = names.slice(1).map(
    (column) => `${column} = EXCLUDED.${column}`,
  );
  const conflictAction = updateColumns.length
    ? `DO UPDATE SET ${updateColumns.join(", ")}`
    : "DO NOTHING";

  await client.query(
    `INSERT INTO ${definition.table} (${names.join(", ")})
     VALUES (${expressions.join(", ")})
     ON CONFLICT (user_id) ${conflictAction}`,
    values,
  );
}

async function getDefaultBranchId(
  client: PoolClient,
  branchId?: string,
): Promise<string> {
  const result = branchId
    ? await client.query<{ id: string }>(
      `SELECT id FROM branches
       WHERE id = $1 AND is_active = TRUE
       FOR SHARE`,
        [branchId],
      )
    : await client.query<{ id: string }>(
      `SELECT id FROM branches
       WHERE is_default = TRUE AND is_active = TRUE
       FOR SHARE`,
      );
  const id = result.rows[0]?.id;
  if (!id) {
    const error = new Error(
      branchId ? "Active branch not found" : "Active default branch is not configured",
    );
    Object.assign(error, { statusCode: branchId ? 400 : 500 });
    throw error;
  }
  return id;
}

export class MemberRepository {
  static async create(
    input: CreateMemberInput,
    actorId: string,
  ): Promise<Member> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const branchId = await getDefaultBranchId(client, input.branch_id);
      const columns = memberColumns.filter(
        ([key]) => key !== "branch_id" && isProvided(input, key),
      );
      const names = [
        "name",
        "role",
        ...columns.map(([, column]) => column),
        "branch_id",
        "created_by",
        "updated_by",
      ];
      const values = [
        `${input.first_name.trim()} ${input.last_name.trim()}`,
        "member",
        ...columns.map(([key]) => normalizeValue(key, input[key])),
        branchId,
        actorId,
        actorId,
      ];
      const placeholders = values.map((_, index) => `$${index + 1}`);
      const insert = await client.query<{ id: string }>(
        `INSERT INTO users (${names.join(", ")})
         VALUES (${placeholders.join(", ")})
         RETURNING id`,
        values,
      );
      const userId = insert.rows[0]?.id;
      if (!userId) {
        throw new Error("Member user insert did not return an ID");
      }

      for (const section of Object.keys(sections) as MemberSection[]) {
        await upsertSection(
          client,
          section,
          userId,
          input,
          actorId,
          true,
        );
      }

      await saveSensitiveData(
        client,
        userId,
        providedSensitiveUpdates(input),
      );
      const member = await selectMember(client, userId);
      if (!member) {
        throw new Error("Created member could not be loaded");
      }

      await client.query("COMMIT");
      return member;
    } catch (error) {
      return rollbackAndRethrow(client, error);
    } finally {
      client.release();
    }
  }

  static async findById(id: string): Promise<Member | undefined> {
    const client = await pool.connect();
    try {
      return await selectMember(client, id);
    } finally {
      client.release();
    }
  }

  static async findPage(
    page: number,
    limit: number,
  ): Promise<{ members: Member[]; total: number }> {
    const offset = (page - 1) * limit;
    const [membersResult, countResult] = await Promise.all([
      pool.query<MemberDatabaseRow>(
        `SELECT m.id, m.created_by, m.updated_by,
                m.created_at, m.updated_at, m.member_number,
                m.registration_date, m.registration_status, m.branch_id,
                m.member_status, b.name AS branch_name,
                to_jsonb(p) - 'user_id' AS personal_data,
                to_jsonb(a) - 'user_id' AS address_data,
                to_jsonb(f) - 'user_id' AS financial_data,
                to_jsonb(k) - 'user_id' AS kyc_data,
                to_jsonb(n) - 'user_id' AS nominee_data,
                to_jsonb(ba) - 'user_id' AS bank_data,
                to_jsonb(ass) - 'user_id' AS assignment_data,
                to_jsonb(v) - 'user_id' AS verification_data,
                to_jsonb(ap) - 'user_id' AS approval_data,
                s.nonce, s.ciphertext, s.auth_tag
         FROM users AS m
         JOIN branches AS b ON b.id = m.branch_id
         LEFT JOIN member_personal_information AS p ON p.user_id = m.id
         LEFT JOIN member_addresses AS a ON a.user_id = m.id
         LEFT JOIN member_financials AS f ON f.user_id = m.id
         LEFT JOIN member_kyc AS k ON k.user_id = m.id
         LEFT JOIN member_nominees AS n ON n.user_id = m.id
         LEFT JOIN member_bank_accounts AS ba ON ba.user_id = m.id
         LEFT JOIN member_assignments AS ass ON ass.user_id = m.id
         LEFT JOIN member_verification_consents AS v ON v.user_id = m.id
         LEFT JOIN member_approvals AS ap ON ap.user_id = m.id
         LEFT JOIN member_sensitive_data AS s ON s.user_id = m.id
         WHERE m.role = 'member' AND m.member_number IS NOT NULL
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      pool.query<{ count: string }>(
        "SELECT COUNT(*) FROM users WHERE role = 'member' AND member_number IS NOT NULL",
      ),
    ]);

    return {
      members: await Promise.all(membersResult.rows.map(toMember)),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  static async update(
    id: string,
    input: UpdateMemberInput,
    actorId: string,
  ): Promise<Member | undefined> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const columns = memberColumns.filter(
        ([key]) => key !== "branch_id" && isProvided(input, key),
      );
      const values: unknown[] = [actorId];
      const assignments = ["updated_by = $1", "updated_at = NOW()"];

      for (const [key, column] of columns) {
        values.push(normalizeValue(key, input[key]));
        const parameter = `$${values.length}`;
        assignments.push(`${column} = ${parameter}`);
      }

      if (isProvided(input, "branch_id")) {
        values.push(await getDefaultBranchId(client, input.branch_id));
        assignments.push(`branch_id = $${values.length}`);
      }

      values.push(id);
      const updated = await client.query<{ id: string }>(
        `UPDATE users
         SET ${assignments.join(", ")}
         WHERE id = $${values.length}
           AND role = 'member'
           AND member_number IS NOT NULL
         RETURNING id`,
        values,
      );
      if (!updated.rows[0]) {
        await client.query("ROLLBACK");
        return undefined;
      }

      for (const section of Object.keys(sections) as MemberSection[]) {
        await upsertSection(client, section, id, input, actorId, false);
      }
      if (
        isProvided(input, "first_name") ||
        isProvided(input, "last_name")
      ) {
        await client.query(
          `UPDATE users AS u
           SET name = CONCAT_WS(' ', p.first_name, p.last_name)
           FROM member_personal_information AS p
           WHERE u.id = $1 AND p.user_id = u.id`,
          [id],
        );
      }
      await saveSensitiveData(
        client,
        id,
        providedSensitiveUpdates(input),
      );

      const member = await selectMember(client, id);
      if (!member) {
        throw new Error("Updated member could not be loaded");
      }

      await client.query("COMMIT");
      return member;
    } catch (error) {
      return rollbackAndRethrow(client, error);
    } finally {
      client.release();
    }
  }

  static async deactivate(id: string, actorId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE users
       SET member_status = 'inactive',
           registration_status = 'inactive',
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $1
         AND role = 'member'
         AND member_number IS NOT NULL
       RETURNING id`,
      [id, actorId],
    );
    return result.rowCount === 1;
  }
}
