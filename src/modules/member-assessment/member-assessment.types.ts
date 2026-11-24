export const CREDIT_BUREAU_CHECK_STATUSES = [
  "provider_not_configured",
  "pending",
  "completed",
  "failed",
] as const;

export type CreditBureauCheckStatus =
  (typeof CREDIT_BUREAU_CHECK_STATUSES)[number];

export interface CreditBureauConsent {
  credit_bureau_check_status: string;
  credit_bureau_consent_reference: string | null;
  credit_bureau_consent_date: Date | null;
}

export interface CreditBureauCheck {
  id: string;
  member_id: string;
  requested_by: string;
  status: CreditBureauCheckStatus;
  provider_name: string | null;
  provider_reference: string | null;
  score: number | null;
  checked_at: Date | null;
  failure_code: string | null;
  created_at: Date;
}

export interface CreditBureauCheckQuery {
  limit?: number;
}
