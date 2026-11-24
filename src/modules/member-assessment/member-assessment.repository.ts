import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "../../shared/database/pool";
import {
  decryptMemberSensitiveData,
  encryptMemberSensitiveData,
} from "../member-management/member-sensitive-data";
import type {
  CreditBureauCheck,
  CreditBureauConsent,
} from "./member-assessment.types";
import type { CreditBureauCheckResult } from "./credit-bureau-provider";

interface CreditBureauCheckRow extends QueryResultRow {
  id: string;
  member_id: string;
  requested_by: string;
  status: CreditBureauCheck["status"];
  provider_name: string | null;
  provider_reference: string | null;
  score_nonce: Buffer | null;
  score_ciphertext: Buffer | null;
  score_auth_tag: Buffer | null;
  checked_at: Date | null;
  failure_code: string | null;
  created_at: Date;
}

interface MemberConsentRow extends QueryResultRow {
  member_status: string | null;
}

export class MemberAssessmentError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "MemberAssessmentError";
  }
}

export function hasCreditBureauConsent(
  consent: CreditBureauConsent | undefined,
): consent is CreditBureauConsent {
  return Boolean(
    consent &&
      ["consented", "checked"].includes(consent.credit_bureau_check_status) &&
      consent.credit_bureau_consent_reference?.trim() &&
      consent.credit_bureau_consent_date,
  );
}

function toCreditBureauCheck(row: CreditBureauCheckRow): CreditBureauCheck {
  const score =
    row.score_nonce && row.score_ciphertext && row.score_auth_tag
      ? decryptMemberSensitiveData({
          nonce: row.score_nonce,
          ciphertext: row.score_ciphertext,
          auth_tag: row.score_auth_tag,
        }).credit_bureau_score
      : undefined;

  return {
    id: row.id,
    member_id: row.member_id,
    requested_by: row.requested_by,
    status: row.status,
    provider_name: row.provider_name,
    provider_reference: row.provider_reference,
    score: score === undefined ? null : Number(score),
    checked_at: row.checked_at,
    failure_code: row.failure_code,
    created_at: row.created_at,
  };
}

async function rollback(client: PoolClient): Promise<void> {
  await client.query("ROLLBACK");
}

export class MemberAssessmentRepository {
  static async createUnconfiguredCreditBureauCheck(
    memberId: string,
    actorId: string,
  ): Promise<CreditBureauCheck> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const member = await client.query<MemberConsentRow>(
        `SELECT member_status
         FROM users
         WHERE id = $1
           AND role = 'member'
           AND member_number IS NOT NULL
         FOR SHARE`,
        [memberId],
      );

      if (!member.rows[0]) {
        await rollback(client);
        throw new MemberAssessmentError("Member not found", 404);
      }

      if (member.rows[0].member_status === "inactive") {
        await rollback(client);
        throw new MemberAssessmentError(
          "Credit checks are not allowed for inactive members",
          409,
        );
      }

      const consent = await client.query<CreditBureauConsent & QueryResultRow>(
        `SELECT credit_bureau_check_status,
                credit_bureau_consent_reference,
                credit_bureau_consent_date
         FROM member_verification_consents
         WHERE user_id = $1
         FOR SHARE`,
        [memberId],
      );
      const consentRecord = consent.rows[0];

      if (!hasCreditBureauConsent(consentRecord)) {
        await rollback(client);
        throw new MemberAssessmentError(
          "A recorded credit bureau consent is required before requesting a check",
          409,
        );
      }

      const result = await client.query<CreditBureauCheckRow>(
        `INSERT INTO member_credit_bureau_checks (
           member_id, requested_by, consent_reference, consent_date,
           status, failure_code
         )
         VALUES ($1, $2, $3, $4, 'provider_not_configured',
                 'provider_not_configured')
         RETURNING id, member_id, requested_by, status, provider_name,
                           provider_reference, score_nonce, score_ciphertext,
                           score_auth_tag, checked_at, failure_code, created_at`,
        [
          memberId,
          actorId,
          consentRecord.credit_bureau_consent_reference,
          consentRecord.credit_bureau_consent_date,
        ],
      );

      await client.query("COMMIT");
      const check = result.rows[0];
      if (!check) {
        throw new Error("Credit bureau check insert did not return a row");
      }

      return toCreditBureauCheck(check);
    } catch (error) {
      if (!(error instanceof MemberAssessmentError)) {
        await rollback(client);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  static async completeCreditBureauCheck(
    id: string,
    result: CreditBureauCheckResult,
  ): Promise<CreditBureauCheck | undefined> {
    if (
      result.score !== null &&
      (!Number.isInteger(result.score) || result.score < 300 || result.score > 900)
    ) {
      throw new MemberAssessmentError(
        "Credit bureau provider returned an invalid score",
        502,
      );
    }

    if (!result.providerName.trim() || Number.isNaN(result.checkedAt.valueOf())) {
      throw new MemberAssessmentError(
        "Credit bureau provider returned invalid result metadata",
        502,
      );
    }

    const encryptedScore =
      result.score === null
        ? null
        : encryptMemberSensitiveData({
            credit_bureau_score: String(result.score),
          });
    const updated = await pool.query<CreditBureauCheckRow>(
      `UPDATE member_credit_bureau_checks
       SET status = 'completed',
           provider_name = $2,
           provider_reference = $3,
           score_nonce = $4,
           score_ciphertext = $5,
           score_auth_tag = $6,
           checked_at = $7,
           failure_code = NULL,
           updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, member_id, requested_by, status, provider_name,
                 provider_reference, score_nonce, score_ciphertext,
                 score_auth_tag, checked_at, failure_code, created_at`,
      [
        id,
        result.providerName,
        result.providerReference,
        encryptedScore?.nonce ?? null,
        encryptedScore?.ciphertext ?? null,
        encryptedScore?.auth_tag ?? null,
        result.checkedAt,
      ],
    );
    const row = updated.rows[0];
    return row ? toCreditBureauCheck(row) : undefined;
  }

  static async findCreditBureauChecks(
    memberId: string,
    limit: number,
  ): Promise<CreditBureauCheck[] | null> {
    const memberResult = await pool.query(
      `SELECT 1
       FROM users
       WHERE id = $1
         AND role = 'member'
         AND member_number IS NOT NULL`,
      [memberId],
    );

    if (memberResult.rowCount !== 1) {
      return null;
    }

    const result = await pool.query<CreditBureauCheckRow>(
      `SELECT id, member_id, requested_by, status, provider_name,
              provider_reference, score_nonce, score_ciphertext,
              score_auth_tag, checked_at, failure_code, created_at
       FROM member_credit_bureau_checks
       WHERE member_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [memberId, limit],
    );

    return result.rows.map(toCreditBureauCheck);
  }
}
