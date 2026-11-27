import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";
import {
  hasCreditBureauConsent,
  MemberAssessmentRepository,
} from "../modules/member-assessment/member-assessment.repository";
import type { CreditBureauCheck } from "../modules/member-assessment/member-assessment.types";

const memberId = "00000000-0000-4000-8000-000000000003";
const actorId = "00000000-0000-4000-8000-000000000001";

const unavailableCheck: CreditBureauCheck = {
  id: "00000000-0000-4000-8000-000000000004",
  member_id: memberId,
  requested_by: actorId,
  status: "provider_not_configured",
  provider_name: null,
  provider_reference: null,
  score: null,
  checked_at: null,
  failure_code: "provider_not_configured",
  created_at: new Date("2026-01-01T00:00:00Z"),
};

function sessionCookie(response: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  const cookie = response.headers["set-cookie"];
  return Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? "");
}

describe("Member assessment credit bureau checks", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    app.post("/api/__tests__/admin-session", async (req, reply) => {
      req.session.userId = actorId;
      req.session.role = "admin";
      return reply.send({ message: "Test session created" });
    });
    app.post("/api/__tests__/member-session", async (req, reply) => {
      req.session.userId = memberId;
      req.session.role = "member";
      return reply.send({ message: "Test session created" });
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires an explicit consent status, reference, and date", () => {
    expect(
      hasCreditBureauConsent({
        credit_bureau_check_status: "consented",
        credit_bureau_consent_reference: "consent-record",
        credit_bureau_consent_date: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toBe(true);
    expect(
      hasCreditBureauConsent({
        credit_bureau_check_status: "declined",
        credit_bureau_consent_reference: "consent-record",
        credit_bureau_consent_date: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toBe(false);
    expect(
      hasCreditBureauConsent({
        credit_bureau_check_status: "consented",
        credit_bureau_consent_reference: " ",
        credit_bureau_consent_date: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toBe(false);
  });

  it("documents the credit-check endpoints and permission", () => {
    const specification = app.swagger();
    expect(specification.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Member assessment" }),
      ]),
    );
    expect(
      specification.paths?.["/api/members/{memberId}/credit-checks"]?.post
        ?.summary,
    ).toBe("Request a member credit bureau check");
    expect(
      JSON.stringify(
        specification.paths?.["/api/members/{memberId}/credit-checks"]?.post,
      ),
    ).toContain("does not request or return a score");
  });

  it("requires authentication and denies member access", async () => {
    const unauthenticated = await request(app.server).post(
      `/api/members/${memberId}/credit-checks`,
    );
    expect(unauthenticated.status).toBe(401);

    const session = await request(app.server)
      .post("/api/__tests__/member-session")
      .send();
    const denied = await request(app.server)
      .post(`/api/members/${memberId}/credit-checks`)
      .set("Cookie", sessionCookie(session));

    expect(denied.status).toBe(403);
  });

  it("records an unavailable attempt without inventing a score", async () => {
    const create = vi
      .spyOn(MemberAssessmentRepository, "createUnconfiguredCreditBureauCheck")
      .mockResolvedValue(unavailableCheck);
    try {
      const session = await request(app.server)
        .post("/api/__tests__/admin-session")
        .send();
      const response = await request(app.server)
        .post(`/api/members/${memberId}/credit-checks`)
        .set("Cookie", sessionCookie(session));

      expect(response.status).toBe(503);
      expect(response.body.error).toContain("no score was requested");
      expect(response.body.check).toMatchObject({
        status: "provider_not_configured",
        score: null,
      });
      expect(create).toHaveBeenCalledWith(memberId, actorId);
    } finally {
      create.mockRestore();
    }
  });

  it("returns prior attempts for authorized staff", async () => {
    const find = vi
      .spyOn(MemberAssessmentRepository, "findCreditBureauChecks")
      .mockResolvedValue([unavailableCheck]);
    try {
      const session = await request(app.server)
        .post("/api/__tests__/admin-session")
        .send();
      const response = await request(app.server)
        .get(`/api/members/${memberId}/credit-checks?limit=10`)
        .set("Cookie", sessionCookie(session));

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(find).toHaveBeenCalledWith(memberId, 10);
    } finally {
      find.mockRestore();
    }
  });
});
