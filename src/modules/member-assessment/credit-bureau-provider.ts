export interface CreditBureauCheckRequest {
  memberId: string;
  consentReference: string;
  consentDate: Date;
}

export interface CreditBureauCheckResult {
  providerName: string;
  providerReference: string;
  score: number | null;
  checkedAt: Date;
}

export interface CreditBureauProvider {
  checkMember(
    request: CreditBureauCheckRequest,
  ): Promise<CreditBureauCheckResult>;
}
