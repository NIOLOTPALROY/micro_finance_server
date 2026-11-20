import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../shared/database/pool";
import type {
  CreateEmployeeInput,
  Employee,
  EmployeePermission,
  UpdateEmployeeInput,
} from "./employee.types";

function passwordHash(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function setPermissions(
  client: PoolClient,
  employeeId: string,
  grantedBy: string,
  permissions: readonly EmployeePermission[],
): Promise<void> {
  await client.query(
    "DELETE FROM employee_permissions WHERE employee_id = $1",
    [employeeId],
  );
  if (!permissions.length) {
    return;
  }
  await client.query(
    `INSERT INTO employee_permissions (employee_id, permission, granted_by)
     SELECT $1, p.permission, $3
     FROM unnest($2::varchar[]) AS p(permission)`,
    [employeeId, permissions, grantedBy],
  );
}

async function getEmployee(
  client: PoolClient,
  id: string,
): Promise<Employee | undefined> {
  const result = await client.query<Employee>(
    `SELECT u.id, u.name, u.email, u.employee_status AS status,
            COALESCE(
              array_agg(ep.permission ORDER BY ep.permission)
                FILTER (WHERE ep.permission IS NOT NULL),
              ARRAY[]::varchar[]
            ) AS permissions,
            u.created_at, u.updated_at
     FROM users AS u
     LEFT JOIN employee_permissions AS ep ON ep.employee_id = u.id
     WHERE u.id = $1 AND u.role = 'employee'
     GROUP BY u.id`,
    [id],
  );
  return result.rows[0];
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
      "Employee transaction failed and rollback also failed",
    );
  }
  throw error;
}

export class EmployeeRepository {
  static async create(
    input: CreateEmployeeInput,
    actorId: string,
  ): Promise<Employee> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO users (
           name, email, password_hash, role, employee_status,
           created_by, updated_by
         )
         VALUES ($1, $2, $3, 'employee', 'active', $4, $4)
         RETURNING id`,
        [input.name.trim(), input.email.trim().toLowerCase(),
          passwordHash(input.password), actorId],
      );
      const employeeId = inserted.rows[0]?.id;
      if (!employeeId) {
        throw new Error("Employee user insert did not return an ID");
      }

      await setPermissions(client, employeeId, actorId, input.permissions);
      const employee = await getEmployee(client, employeeId);
      if (!employee) {
        throw new Error("Created employee could not be loaded");
      }

      await client.query("COMMIT");
      return employee;
    } catch (error) {
      return rollbackAndRethrow(client, error);
    } finally {
      client.release();
    }
  }

  static async findPage(): Promise<Employee[]> {
    const result = await pool.query<Employee>(
      `SELECT u.id, u.name, u.email, u.employee_status AS status,
              COALESCE(
                array_agg(ep.permission ORDER BY ep.permission)
                  FILTER (WHERE ep.permission IS NOT NULL),
                ARRAY[]::varchar[]
              ) AS permissions,
              u.created_at, u.updated_at
       FROM users AS u
       LEFT JOIN employee_permissions AS ep ON ep.employee_id = u.id
       WHERE u.role = 'employee'
       GROUP BY u.id
       ORDER BY u.created_at DESC, u.id DESC`,
    );
    return result.rows;
  }

  static async findById(id: string): Promise<Employee | undefined> {
    const client = await pool.connect();
    try {
      return await getEmployee(client, id);
    } finally {
      client.release();
    }
  }

  static async update(
    id: string,
    input: UpdateEmployeeInput,
    actorId: string,
  ): Promise<Employee | undefined> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const assignments = ["updated_by = $1", "updated_at = NOW()"];
      const values: unknown[] = [actorId];

      if (input.name !== undefined) {
        values.push(input.name.trim());
        assignments.push(`name = $${values.length}`);
      }
      if (input.password !== undefined) {
        values.push(passwordHash(input.password));
        assignments.push(`password_hash = $${values.length}`);
      }
      if (input.status !== undefined) {
        values.push(input.status);
        assignments.push(`employee_status = $${values.length}`);
      }

      values.push(id);
      const updated = await client.query<{ id: string }>(
        `UPDATE users
         SET ${assignments.join(", ")}
         WHERE id = $${values.length} AND role = 'employee'
         RETURNING id`,
        values,
      );
      if (!updated.rows[0]) {
        await client.query("ROLLBACK");
        return undefined;
      }

      if (input.permissions !== undefined) {
        await setPermissions(client, id, actorId, input.permissions);
      }
      const employee = await getEmployee(client, id);
      if (!employee) {
        throw new Error("Updated employee could not be loaded");
      }

      await client.query("COMMIT");
      return employee;
    } catch (error) {
      return rollbackAndRethrow(client, error);
    } finally {
      client.release();
    }
  }

  static async deactivate(id: string, actorId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE users
       SET employee_status = 'inactive',
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $1
         AND role = 'employee'
         AND employee_status = 'active'
       RETURNING id`,
      [id, actorId],
    );
    return result.rowCount === 1;
  }
}
