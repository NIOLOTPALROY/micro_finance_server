export const MEMBER_GENDERS = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
] as const;

export const MARITAL_STATUSES = [
  "single",
  "married",
  "widowed",
  "divorced",
  "separated",
] as const;

export const REGISTRATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "kyc_pending",
  "approved",
  "rejected",
  "inactive",
] as const;

export const VERIFICATION_STATUSES = [
  "pending",
  "verified",
  "rejected",
  "not_required",
] as const;

export const KYC_STATUSES = [
  "pending",
  "verified",
  "rejected",
  "expired",
] as const;

export const CREDIT_BUREAU_STATUSES = [
  "pending",
  "consented",
  "checked",
  "declined",
  "not_required",
] as const;

export const KYC_APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export const RESIDENCE_TYPES = ["own", "rented", "other"] as const;
export const BANK_ACCOUNT_TYPES = ["savings", "current", "other"] as const;

export type MemberGender = (typeof MEMBER_GENDERS)[number];
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type KycStatus = (typeof KYC_STATUSES)[number];
export type CreditBureauStatus = (typeof CREDIT_BUREAU_STATUSES)[number];
export type KycApprovalStatus = (typeof KYC_APPROVAL_STATUSES)[number];
export type ResidenceType = (typeof RESIDENCE_TYPES)[number];
export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];

export interface MemberPersonalInformation {
  first_name: string;
  last_name: string;
  father_or_husband_name: string;
  date_of_birth: string;
  gender: MemberGender;
  marital_status?: MaritalStatus | null;
  mobile_number: string;
  alternate_mobile_number?: string | null;
  email?: string | null;
  photograph_reference?: string | null;
}

export interface MemberRegistrationDetails {
  registration_date?: string;
  registration_status?: RegistrationStatus;
  branch_id?: string;
  member_category?: string | null;
  member_status?: RegistrationStatus;
}

export interface MemberAddressInformation {
  village_town?: string | null;
  post_office?: string | null;
  police_station?: string | null;
  gram_panchayat_municipality?: string | null;
  district?: string | null;
  state?: string | null;
  pin_code?: string | null;
  residence_type?: ResidenceType | null;
  years_at_current_address?: number | null;
  present_address?: string | null;
  permanent_address?: string | null;
  address_verification_status?: VerificationStatus;
}

export interface MemberFamilyFinancialInformation {
  family_members_count?: number | null;
  earning_members_count?: number | null;
  dependents_count?: number | null;
  occupation?: string | null;
  member_monthly_income?: number | null;
  spouse_occupation?: string | null;
  spouse_monthly_income?: number | null;
  other_household_income?: number | null;
  monthly_household_expenses?: number | null;
  household_annual_income?: number | null;
  existing_loan_details?: string | null;
  existing_monthly_loan_repayment?: number | null;
}

export interface MemberKycInformation {
  identity_proof_type?: string | null;
  identity_proof_number?: string | null;
  address_proof_type?: string | null;
  address_proof_reference?: string | null;
  pan?: string | null;
  voter_id?: string | null;
  kyc_document_references?: string[];
  kyc_status?: KycStatus;
  kyc_verified_at?: string | null;
}

export interface MemberNomineeInformation {
  nominee_full_name?: string | null;
  nominee_relationship?: string | null;
  nominee_date_of_birth?: string | null;
  nominee_mobile_number?: string | null;
  nominee_address?: string | null;
  nominee_identity_proof?: string | null;
}

export interface MemberBankInformation {
  account_holder_name?: string | null;
  bank_name?: string | null;
  bank_branch_name?: string | null;
  bank_account_number?: string | null;
  ifsc_code?: string | null;
  bank_account_type?: BankAccountType | null;
  bank_document_reference?: string | null;
  bank_verification_status?: VerificationStatus;
}

export interface MemberAssignmentInformation {
  center_name?: string | null;
  group_name?: string | null;
  field_officer_name?: string | null;
  joining_date?: string | null;
}

export interface MemberVerificationConsentInformation {
  field_verification_status?: VerificationStatus;
  residence_verification_status?: VerificationStatus;
  income_verification_status?: VerificationStatus;
  credit_bureau_check_status?: CreditBureauStatus;
  credit_bureau_consent_reference?: string | null;
  credit_bureau_consent_date?: string | null;
  privacy_notice_accepted?: boolean;
  communication_sms_consent?: boolean;
  communication_whatsapp_consent?: boolean;
  communication_call_consent?: boolean;
  communication_consent_date?: string | null;
  member_declaration_signed?: boolean;
  kyc_approval_status?: KycApprovalStatus;
}

export interface MemberInternalApprovalInformation {
  internal_remarks?: string | null;
  rejection_or_hold_reason?: string | null;
}

export type CreateMemberInput = MemberPersonalInformation &
  MemberRegistrationDetails &
  MemberAddressInformation &
  MemberFamilyFinancialInformation &
  MemberKycInformation &
  MemberNomineeInformation &
  MemberBankInformation &
  MemberAssignmentInformation &
  MemberVerificationConsentInformation &
  MemberInternalApprovalInformation;

export type UpdateMemberInput = Partial<CreateMemberInput>;

export interface Member extends Omit<
  CreateMemberInput,
  | "identity_proof_number"
  | "address_proof_reference"
  | "pan"
  | "voter_id"
  | "nominee_identity_proof"
  | "bank_account_number"
  | "years_at_current_address"
  | "member_monthly_income"
  | "spouse_monthly_income"
  | "other_household_income"
  | "monthly_household_expenses"
  | "household_annual_income"
  | "existing_monthly_loan_repayment"
> {
  id: string;
  member_number: string;
  branch_name: string;
  years_at_current_address: number | string | null;
  member_monthly_income: number | string | null;
  spouse_monthly_income: number | string | null;
  other_household_income: number | string | null;
  monthly_household_expenses: number | string | null;
  household_annual_income: number | string | null;
  existing_monthly_loan_repayment: number | string | null;
  identity_proof_number_masked: string | null;
  address_proof_reference_masked: string | null;
  pan_masked: string | null;
  voter_id_masked: string | null;
  nominee_identity_proof_masked: string | null;
  bank_account_number_masked: string | null;
  created_by: string;
  updated_by: string;
  assigned_by: string | null;
  kyc_verified_by: string | null;
  communication_consent_recorded_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  created_at: Date;
  updated_at: Date;
  reviewed_at: Date | null;
  approved_at: Date | null;
}

export interface MemberListQuery {
  page?: number;
  limit?: number;
}
