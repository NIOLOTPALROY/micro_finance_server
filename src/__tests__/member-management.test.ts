import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";

describe("Member management personal information", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    app.post("/__tests__/admin-session", async (req, reply) => {
      req.session.userId = "00000000-0000-4000-8000-000000000001";
      req.session.role = "admin";
      return reply.send({ message: "Test session created" });
    });
    app.post("/__tests__/borrower-session", async (req, reply) => {
      req.session.userId = "00000000-0000-4000-8000-000000000002";
      req.session.role = "borrower";
      return reply.send({ message: "Test session created" });
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires an admin session to access member profiles", async () => {
    const response = await request(app.server).get("/members");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Not authenticated");
  });

  it("denies member access to non-admin users", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/borrower-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .get("/members")
      .set("Cookie", Array.isArray(cookie) ? cookie[0] ?? "" : cookie ?? "");

    expect(response.status).toBe(403);
  });

  it("requires the personal information fields marked mandatory in the form", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/admin-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .post("/members")
      .set("Cookie", Array.isArray(cookie) ? cookie[0] ?? "" : cookie ?? "")
      .send({ first_name: "Asha" });

    expect(response.status).toBe(400);
  });

  it("rejects a future date of birth before writing to the database", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/admin-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .post("/members")
      .set("Cookie", Array.isArray(cookie) ? cookie[0] ?? "" : cookie ?? "")
      .send({
        first_name: "Asha",
        last_name: "Rao",
        father_or_husband_name: "Mohan Rao",
        date_of_birth: "2999-01-01",
        gender: "female",
        mobile_number: "+919876543210",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "Date of birth cannot be in the future"
    );
  });

  it("validates optional email addresses when supplied", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/admin-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .post("/members")
      .set("Cookie", Array.isArray(cookie) ? cookie[0] ?? "" : cookie ?? "")
      .send({
        first_name: "Asha",
        last_name: "Rao",
        father_or_husband_name: "Mohan Rao",
        date_of_birth: "1990-01-01",
        gender: "female",
        mobile_number: "+919876543210",
        email: "not-an-email",
      });

    expect(response.status).toBe(400);
  });
});
