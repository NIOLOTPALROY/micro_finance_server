import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";
import { MemberRepository } from "../modules/member-management/member.repository";

describe("Member management personal information", () => {
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

  it("documents member sections and the flat registration payload in Swagger", async () => {
    const operation = app.swagger().paths?.["/members"]?.post;
    const deleteOperation = app.swagger().paths?.["/members/{id}"]?.delete;

    expect(operation?.summary).toBe("Register a member");
    expect(deleteOperation?.summary).toBe("Deactivate a member");
    expect(deleteOperation?.description).toContain("Soft-deactivates");
    const documentedDeleteOperation = JSON.stringify(deleteOperation ?? {});
    expect(documentedDeleteOperation).toContain("204");
    expect(documentedDeleteOperation).toContain(
      "All personal and registration records are retained.",
    );
    expect(documentedDeleteOperation).toContain("404");
    const documentedOperation = JSON.stringify(operation ?? {});
    expect(documentedOperation).toContain(
      "Flat registration payload grouped by member section",
    );
    expect(documentedOperation).toContain("member_personal_information");
    expect(documentedOperation).toContain("member_addresses");
    expect(documentedOperation).toContain("member_financials");
    expect(documentedOperation).toContain("member_kyc");
    expect(documentedOperation).toContain("member_nominees");
    expect(documentedOperation).toContain("member_bank_accounts");
  });

  it("restricts member deactivation to admins", async () => {
    const unauthenticated = await request(app.server).delete(
      "/members/00000000-0000-4000-8000-000000000003",
    );
    expect(unauthenticated.status).toBe(401);

    const sessionResponse = await request(app.server)
      .post("/__tests__/member-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];
    const memberResponse = await request(app.server)
      .delete("/members/00000000-0000-4000-8000-000000000003")
      .set(
        "Cookie",
        Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? ""),
      );

    expect(memberResponse.status).toBe(403);
  });

  it("returns 204 when a member is deactivated and 404 when it does not exist", async () => {
    const deactivate = vi
      .spyOn(MemberRepository, "deactivate")
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    try {
      const sessionResponse = await request(app.server)
        .post("/__tests__/admin-session")
        .send();
      const cookie = sessionResponse.headers["set-cookie"];
      const headers = {
        Cookie: Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? ""),
      };

      const response = await request(app.server)
        .delete("/members/00000000-0000-4000-8000-000000000003")
        .set(headers);
      expect(response.status).toBe(204);
      expect(response.text).toBe("");

      const missingResponse = await request(app.server)
        .delete("/members/00000000-0000-4000-8000-000000000004")
        .set(headers);
      expect(missingResponse.status).toBe(404);
      expect(missingResponse.body).toHaveProperty("error", "Member not found");
      expect(deactivate).toHaveBeenNthCalledWith(
        1,
        "00000000-0000-4000-8000-000000000003",
        "00000000-0000-4000-8000-000000000001",
      );
    } finally {
      deactivate.mockRestore();
    }
  });

  it("requires an admin session to access member profiles", async () => {
    const response = await request(app.server).get("/members");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Not authenticated");
  });

  it("denies member access to non-admin users", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/member-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .get("/members")
      .set(
        "Cookie",
        Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? ""),
      );

    expect(response.status).toBe(403);
  });

  it("requires an admin session to request an S3 upload", async () => {
    const response = await request(app.server)
      .post("/members/files/upload")
      .send({
        category: "image",
        content_type: "image/jpeg",
        content_length: 1024,
      });

    expect(response.status).toBe(401);
  });

  it("rejects a file type that does not match its S3 category", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/admin-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .post("/members/files/upload")
      .set("Cookie", Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? ""))
      .send({
        category: "image",
        content_type: "application/pdf",
        content_length: 1024,
      });

    expect(response.status).toBe(400);
  });

  it("requires the personal information fields marked mandatory in the form", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/admin-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .post("/members")
      .set("Cookie", Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? ""))
      .send({ first_name: "Asha" });

    expect(response.status).toBe(400);
  });

  it("rejects future member or nominee birth dates before database access", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/admin-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .post("/members")
      .set("Cookie", Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? ""))
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
      "Birth dates cannot be in the future",
    );
  });

  it("rejects a future nominee date of birth before writing to the database", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/admin-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .post("/members")
      .set("Cookie", Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? ""))
      .send({
        first_name: "Asha",
        last_name: "Rao",
        father_or_husband_name: "Mohan Rao",
        date_of_birth: "1990-01-01",
        gender: "female",
        mobile_number: "+919876543210",
        nominee_date_of_birth: "2999-01-01",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "Birth dates cannot be in the future",
    );
  });

  it("accepts fields from every registration form section", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/admin-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .post("/members")
      .set("Cookie", Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? ""))
      .send({
        first_name: "Asha",
        last_name: "Rao",
        father_or_husband_name: "Mohan Rao",
        date_of_birth: "2999-01-01",
        gender: "female",
        marital_status: "married",
        mobile_number: "+919876543210",
        alternate_mobile_number: "+919876543211",
        email: "asha@example.com",
        photograph_reference: "members/asha.jpg",
        registration_date: "2026-01-01",
        registration_status: "submitted",
        member_category: "individual",
        member_status: "submitted",
        village_town: "Pune",
        post_office: "Central",
        police_station: "Pune",
        gram_panchayat_municipality: "Pune Municipal Corporation",
        district: "Pune",
        state: "Maharashtra",
        pin_code: "411001",
        residence_type: "own",
        years_at_current_address: 5,
        present_address: "Present address",
        permanent_address: "Permanent address",
        address_verification_status: "pending",
        family_members_count: 4,
        earning_members_count: 2,
        dependents_count: 2,
        occupation: "Tailor",
        member_monthly_income: 12000,
        spouse_occupation: "Driver",
        spouse_monthly_income: 10000,
        other_household_income: 500,
        monthly_household_expenses: 8000,
        household_annual_income: 270000,
        existing_loan_details: "No existing loan",
        existing_monthly_loan_repayment: 0,
        identity_proof_type: "government_id",
        identity_proof_number: "ID-12345678",
        address_proof_type: "utility_bill",
        address_proof_reference: "BILL-1234",
        pan: "ABCDE1234F",
        voter_id: "VOTER123456",
        kyc_document_references: ["documents/kyc/front.jpg"],
        kyc_status: "pending",
        nominee_full_name: "Mohan Rao",
        nominee_relationship: "spouse",
        nominee_date_of_birth: "1988-01-01",
        nominee_mobile_number: "+919876543212",
        nominee_address: "Nominee address",
        nominee_identity_proof: "NOMINEE-1234",
        account_holder_name: "Asha Rao",
        bank_name: "Example Bank",
        bank_branch_name: "Pune",
        bank_account_number: "123456789012",
        ifsc_code: "EXAM0001234",
        bank_account_type: "savings",
        bank_document_reference: "documents/bank/passbook.jpg",
        bank_verification_status: "pending",
        center_name: "Central Center",
        group_name: "Group A",
        field_officer_name: "Officer One",
        joining_date: "2026-02-01",
        field_verification_status: "pending",
        residence_verification_status: "pending",
        income_verification_status: "pending",
        credit_bureau_check_status: "consented",
        credit_bureau_consent_reference: "CONSENT-123",
        credit_bureau_consent_date: "2026-01-01T10:00:00Z",
        privacy_notice_accepted: true,
        communication_sms_consent: true,
        communication_whatsapp_consent: false,
        communication_call_consent: true,
        communication_consent_date: "2026-01-01T10:00:00Z",
        member_declaration_signed: true,
        kyc_approval_status: "pending",
        internal_remarks: "Application received",
        rejection_or_hold_reason: null,
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "Birth dates cannot be in the future",
    );
  });

  it("validates optional email addresses when supplied", async () => {
    const sessionResponse = await request(app.server)
      .post("/__tests__/admin-session")
      .send();
    const cookie = sessionResponse.headers["set-cookie"];

    const response = await request(app.server)
      .post("/members")
      .set("Cookie", Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? ""))
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
