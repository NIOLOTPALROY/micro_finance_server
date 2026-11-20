import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { pool } from "../shared/database/pool";
import { buildApp } from "../app";
import { requirePermission } from "../modules/auth/auth.middleware";
import { EmployeeRepository } from "../modules/employee-management/employee.repository";
import type { Employee } from "../modules/employee-management/employee.types";

const employee: Employee = {
  id: "00000000-0000-4000-8000-000000000003",
  name: "Test Employee",
  email: "employee@example.test",
  status: "active",
  permissions: ["members.read"],
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
};

function sessionCookie(response: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  const cookie = response.headers["set-cookie"];
  return Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? "");
}

describe("Employee management", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    app.post("/__tests__/admin-session", async (req, reply) => {
      req.session.userId = "00000000-0000-4000-8000-000000000001";
      req.session.role = "admin";
      return reply.send({ message: "Test session created" });
    });
    app.post("/__tests__/employee-session", async (req, reply) => {
      req.session.userId = employee.id;
      req.session.role = "employee";
      return reply.send({ message: "Test session created" });
    });
    app.get(
      "/__tests__/member-read",
      { preHandler: requirePermission("members.read") },
      async (_req, reply) => reply.send({ allowed: true }),
    );
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("publishes employee endpoints and permission choices in Swagger", async () => {
    const specification = app.swagger();
    expect(specification.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Employee management" }),
      ]),
    );
    expect(specification.paths?.["/employees"]?.post?.summary).toBe(
      "Create an employee",
    );
    expect(specification.paths?.["/employees/{id}"]?.patch?.summary).toBe(
      "Update an employee",
    );
    const createOperation = JSON.stringify(
      specification.paths?.["/employees"]?.post ?? {},
    );
    expect(createOperation).toContain("members.read");
    expect(createOperation).toContain("member_files.upload");
  });

  it("allows only admins to create employees", async () => {
    const unauthorized = await request(app.server)
      .post("/employees")
      .send({
        name: employee.name,
        email: employee.email,
        password: "A-long-initial-password",
        permissions: ["members.read"],
      });
    expect(unauthorized.status).toBe(401);

    const employeeSession = await request(app.server)
      .post("/__tests__/employee-session")
      .send();
    const denied = await request(app.server)
      .post("/employees")
      .set("Cookie", sessionCookie(employeeSession))
      .send({
        name: employee.name,
        email: employee.email,
        password: "A-long-initial-password",
        permissions: ["members.read"],
      });
    expect(denied.status).toBe(403);
  });

  it("returns created employee details without exposing the password", async () => {
    const create = vi
      .spyOn(EmployeeRepository, "create")
      .mockResolvedValue(employee);
    try {
      const session = await request(app.server)
        .post("/__tests__/admin-session")
        .send();
      const response = await request(app.server)
        .post("/employees")
        .set("Cookie", sessionCookie(session))
        .send({
          name: employee.name,
          email: employee.email,
          password: "A-long-initial-password",
          permissions: employee.permissions,
        });

      expect(response.status).toBe(201);
      expect(response.body.employee).toMatchObject({
        id: employee.id,
        email: employee.email,
        permissions: employee.permissions,
      });
      expect(response.body.employee).not.toHaveProperty("password");
      expect(response.body.employee).not.toHaveProperty("password_hash");
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: ["members.read"] }),
        "00000000-0000-4000-8000-000000000001",
      );
    } finally {
      create.mockRestore();
    }
  });

  it("checks employee permissions against current database grants", async () => {
    const query = vi.spyOn(pool, "query");
    try {
      const session = await request(app.server)
        .post("/__tests__/employee-session")
        .send();
      query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 } as never);
      const allowed = await request(app.server)
        .get("/__tests__/member-read")
        .set("Cookie", sessionCookie(session));
      expect(allowed.status).toBe(200);

      query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      const denied = await request(app.server)
        .get("/__tests__/member-read")
        .set("Cookie", sessionCookie(session));
      expect(denied.status).toBe(403);
    } finally {
      query.mockRestore();
    }
  });
});
