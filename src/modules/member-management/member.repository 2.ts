import { pool } from "../../shared/database/pool";
import type {
  CreateMemberInput,
  Member,
  UpdateMemberInput,
} from "./member.types";

const updateColumns: ReadonlyArray<readonly [keyof UpdateMemberInput, string]> =
  [
    ["first_name", "first_name"],
    ["last_name", "last_name"],
    ["father_or_husband_name", "father_or_husband_name"],
    ["date_of_birth", "date_of_birth"],
    ["gender", "gender"],
    ["marital_status", "marital_status"],
    ["mobile_number", "mobile_number"],
    ["alternate_mobile_number", "alternate_mobile_number"],
    ["email", "email"],
    ["photograph_reference", "photograph_reference"],
  ];

export class MemberRepository {
  static async create(
    input: CreateMemberInput,
    actorId: string,
  ): Promise<Member> {
    const result = await pool.query<Member>(
      `INSERT INTO members (
        first_name, last_name, father_or_husband_name, date_of_birth,
        gender, marital_status, mobile_number, alternate_mobile_number,
        email, photograph_reference, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
      RETURNING *`,
      [
        input.first_name.trim(),
        input.last_name.trim(),
        input.father_or_husband_name.trim(),
        input.date_of_birth,
        input.gender,
        input.marital_status ?? null,
        input.mobile_number.trim(),
        input.alternate_mobile_number?.trim() || null,
        input.email?.trim() || null,
        input.photograph_reference?.trim() || null,
        actorId,
      ],
    );

    const member = result.rows[0];
    if (!member) {
      throw new Error("Member insert did not return a row");
    }

    return member;
  }

  static async findById(id: string): Promise<Member | undefined> {
    const result = await pool.query<Member>(
      "SELECT * FROM members WHERE id = $1",
      [id],
    );
    return result.rows[0];
  }

  static async findPage(
    page: number,
    limit: number,
  ): Promise<{ members: Member[]; total: number }> {
    const offset = (page - 1) * limit;
    const [membersResult, countResult] = await Promise.all([
      pool.query<Member>(
        `SELECT * FROM members
         ORDER BY created_at DESC, id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      pool.query<{ count: string }>("SELECT COUNT(*) FROM members"),
    ]);

    return {
      members: membersResult.rows,
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  static async update(
    id: string,
    input: UpdateMemberInput,
    actorId: string,
  ): Promise<Member | undefined> {
    const changes = updateColumns.filter(([key]) => Object.hasOwn(input, key));

    const optionalTextFields = new Set<keyof UpdateMemberInput>([
      "marital_status",
      "alternate_mobile_number",
      "email",
      "photograph_reference",
    ]);
    const values = changes.map(([key]) => {
      const value = input[key];
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed || (optionalTextFields.has(key) ? null : "");
    });
    values.push(actorId);
    values.push(id);

    const assignments = changes.map(
      ([, column], index) => `${column} = $${index + 1}`,
    );
    assignments.push(`updated_by = $${values.length - 1}`);
    assignments.push("updated_at = NOW()");

    const result = await pool.query<Member>(
      `UPDATE members
       SET ${assignments.join(", ")}
       WHERE id = $${values.length}
       RETURNING *`,
      values,
    );

    return result.rows[0];
  }
}
