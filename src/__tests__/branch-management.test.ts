import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";
import {
  BranchManagementError,
  BranchRepository,
} from "../modules/branch-management/branch.repository";
import type { Branch } from "../modules/branch-management/branch.types";

const branch: Branch = {
  id: "00000000-0000-4000-8000-000000000003",
  code: "NORTH",
  name: "Northern Branch",
  is_default: false,
  is_active: true,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
};

function sessionCookie(response: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  const cookie = response.headers["set-cookie"];
  return Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? "");
}

describe("Branch management", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    app.post("/__tests__/admin-session", async (req, reply) => {
      req.session.userId = "00000000-0000-4000-8000-000000000001";
      req.session.role = "admin";
      return reply.send({ message: "Test session created" });
    });
    app.post("/__tests__/member-session", async (req, reply) => {
      req.session.userId = "00000000-0000-4000-8000-000000000002";
      req.session.role = "member";
      return reply.send({ message: "Test session created" });
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("documents branch management operations in Swagger", async () => {
    const specification = app.swagger();
    expect(specification.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Branch management" }),
      ]),
    );
    expect(specification.paths?.["/branches"]?.post?.summary).toBe(
      "Create a branch",
    );
    expect(specification.paths?.["/branches"]?.get?.summary).toBe(
      "List branches",
    );
    expect(specification.paths?.["/branches/{id}"]?.patch?.summary).toBe(
      "Update a branch",
    );
    expect(specification.paths?.["/branches/{id}"]?.delete?.description).toContain(
      "default branch must be moved first",
    );
  });

  it("restricts branch administration to admins", async () => {
    const unauthenticated = await request(app.server).get("/branches");
    expect(unauthenticated.status).toBe(401);

    const session = await request(app.server)
      .post("/__tests__/member-session")
      .send();
    const forbidden = await request(app.server)
      .get("/branches")
      .set("Cookie", sessionCookie(session));
    expect(forbidden.status).toBe(403);
  });

  it("creates and deactivates branches through the admin module", async () => {
    const create = vi
      .spyOn(BranchRepository, "create")
      .mockResolvedValue(branch);
    const deactivate = vi
      .spyOn(BranchRepository, "deactivate")
      .mockResolvedValue(true);
    try {
      const session = await request(app.server)
        .post("/__tests__/admin-session")
        .send();
      const cookie = sessionCookie(session);
      const created = await request(app.server)
        .post("/branches")
        .set("Cookie", cookie)
        .send({ code: "north", name: "Northern Branch" });
      expect(created.status).toBe(201);
      expect(created.body.branch).toMatchObject({
        id: branch.id,
        code: branch.code,
        is_active: true,
      });

      const deleted = await request(app.server)
        .delete(`/branches/${branch.id}`)
        .set("Cookie", cookie);
      expect(deleted.status).toBe(204);
      expect(create).toHaveBeenCalledWith({
        code: "north",
        name: "Northern Branch",
      });
      expect(deactivate).toHaveBeenCalledWith(branch.id);
    } finally {
      create.mockRestore();
      deactivate.mockRestore();
    }
  });

  it("reports a conflict when an admin tries to deactivate the default branch", async () => {
    const deactivate = vi
      .spyOn(BranchRepository, "deactivate")
      .mockRejectedValue(
        new BranchManagementError(
          "The default branch cannot be deactivated; set another branch as default first",
          409,
        ),
      );
    try {
      const session = await request(app.server)
        .post("/__tests__/admin-session")
        .send();
      const response = await request(app.server)
        .delete(`/branches/${branch.id}`)
        .set("Cookie", sessionCookie(session));
      expect(response.status).toBe(409);
      expect(response.body.error).toContain(
        "default branch cannot be deactivated",
      );
    } finally {
      deactivate.mockRestore();
    }
  });
});
