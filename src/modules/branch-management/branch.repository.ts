import type { PoolClient } from "pg";
import { pool } from "../../shared/database/pool";
import type {
  Branch,
  CreateBranchInput,
  UpdateBranchInput,
} from "./branch.types";

export class BranchManagementError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "BranchManagementError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
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
      "Branch transaction failed and rollback also failed",
    );
  }
  if (isUniqueViolation(error)) {
    throw new BranchManagementError("Branch code already exists", 409);
  }
  throw error;
}

async function lockBranches(client: PoolClient): Promise<void> {
  await client.query("LOCK TABLE branches IN EXCLUSIVE MODE");
}

async function findWithClient(
  client: PoolClient,
  id: string,
): Promise<Branch | undefined> {
  const result = await client.query<Branch>(
    `SELECT id, code, name, is_default, is_active, created_at, updated_at
     FROM branches
     WHERE id = $1`,
    [id],
  );
  return result.rows[0];
}

export class BranchRepository {
  static async create(input: CreateBranchInput): Promise<Branch> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await lockBranches(client);
      if (input.is_default) {
        await client.query(
          "UPDATE branches SET is_default = FALSE WHERE is_default = TRUE",
        );
      }

      const result = await client.query<{ id: string }>(
        `INSERT INTO branches (code, name, is_default)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [input.code.trim().toUpperCase(), input.name.trim(), input.is_default ?? false],
      );
      const id = result.rows[0]?.id;
      if (!id) {
        throw new Error("Branch insert did not return an ID");
      }
      const branch = await findWithClient(client, id);
      if (!branch) {
        throw new Error("Created branch could not be loaded");
      }
      await client.query("COMMIT");
      return branch;
    } catch (error) {
      return rollbackAndRethrow(client, error);
    } finally {
      client.release();
    }
  }

  static async findPage(): Promise<Branch[]> {
    const result = await pool.query<Branch>(
      `SELECT id, code, name, is_default, is_active, created_at, updated_at
       FROM branches
       ORDER BY is_default DESC, name ASC, id ASC`,
    );
    return result.rows;
  }

  static async findById(id: string): Promise<Branch | undefined> {
    const result = await pool.query<Branch>(
      `SELECT id, code, name, is_default, is_active, created_at, updated_at
       FROM branches
       WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  }

  static async update(
    id: string,
    input: UpdateBranchInput,
  ): Promise<Branch | undefined> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await lockBranches(client);
      const current = await client.query<Pick<Branch, "is_default" | "is_active">>(
        "SELECT is_default, is_active FROM branches WHERE id = $1 FOR UPDATE",
        [id],
      );
      const existing = current.rows[0];
      if (!existing) {
        await client.query("ROLLBACK");
        return undefined;
      }

      if (input.is_default === false && existing.is_default) {
        throw new BranchManagementError(
          "The default branch cannot be unset; set another branch as default",
          409,
        );
      }
      if (input.is_active === false && existing.is_default) {
        throw new BranchManagementError(
          "The default branch cannot be deactivated; set another branch as default first",
          409,
        );
      }
      if (
        input.is_default === true &&
        (input.is_active === false ||
          (!existing.is_active && input.is_active !== true))
      ) {
        throw new BranchManagementError(
          "An inactive branch must be reactivated before it can become the default",
          409,
        );
      }

      if (input.is_default === true) {
        await client.query(
          "UPDATE branches SET is_default = FALSE WHERE is_default = TRUE AND id <> $1",
          [id],
        );
      }

      const assignments = ["updated_at = NOW()"];
      const values: unknown[] = [];
      if (input.code !== undefined) {
        values.push(input.code.trim().toUpperCase());
        assignments.push(`code = $${values.length}`);
      }
      if (input.name !== undefined) {
        values.push(input.name.trim());
        assignments.push(`name = $${values.length}`);
      }
      if (input.is_default !== undefined) {
        values.push(input.is_default);
        assignments.push(`is_default = $${values.length}`);
      }
      if (input.is_active !== undefined) {
        values.push(input.is_active);
        assignments.push(`is_active = $${values.length}`);
      }
      values.push(id);
      await client.query(
        `UPDATE branches
         SET ${assignments.join(", ")}
         WHERE id = $${values.length}`,
        values,
      );
      const branch = await findWithClient(client, id);
      if (!branch) {
        throw new Error("Updated branch could not be loaded");
      }
      await client.query("COMMIT");
      return branch;
    } catch (error) {
      return rollbackAndRethrow(client, error);
    } finally {
      client.release();
    }
  }

  static async deactivate(id: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await lockBranches(client);
      const branch = await client.query<Pick<Branch, "is_default">>(
        "SELECT is_default FROM branches WHERE id = $1 FOR UPDATE",
        [id],
      );
      const existing = branch.rows[0];
      if (!existing) {
        await client.query("ROLLBACK");
        return false;
      }
      if (existing.is_default) {
        throw new BranchManagementError(
          "The default branch cannot be deactivated; set another branch as default first",
          409,
        );
      }
      await client.query(
        `UPDATE branches
         SET is_active = FALSE, updated_at = NOW()
         WHERE id = $1 AND is_active = TRUE`,
        [id],
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      return rollbackAndRethrow(client, error);
    } finally {
      client.release();
    }
  }
}
