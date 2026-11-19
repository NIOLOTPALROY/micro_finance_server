-- Up Migration
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_branches_single_default
  ON branches (is_default)
  WHERE is_default;

INSERT INTO branches (code, name, is_default)
VALUES ('MAIN', 'Microfinance', TRUE);

CREATE SEQUENCE member_number_seq;

ALTER TABLE members
  ADD COLUMN member_number VARCHAR(20),
  ADD COLUMN registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN registration_status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (registration_status IN (
      'draft', 'submitted', 'under_review', 'kyc_pending',
      'approved', 'rejected', 'inactive'
    )),
  ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
  ADD COLUMN village_town VARCHAR(150),
  ADD COLUMN post_office VARCHAR(150),
  ADD COLUMN police_station VARCHAR(150),
  ADD COLUMN gram_panchayat_municipality VARCHAR(150),
  ADD COLUMN district VARCHAR(150),
  ADD COLUMN state VARCHAR(150),
  ADD COLUMN pin_code VARCHAR(20),
  ADD COLUMN residence_type VARCHAR(20)
    CHECK (residence_type IS NULL OR residence_type IN ('own', 'rented', 'other')),
  ADD COLUMN years_at_current_address NUMERIC(5, 2)
    CHECK (years_at_current_address IS NULL OR years_at_current_address >= 0),
  ADD COLUMN present_address TEXT,
  ADD COLUMN permanent_address TEXT,
  ADD COLUMN address_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (address_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  ADD COLUMN family_members_count INTEGER
    CHECK (family_members_count IS NULL OR family_members_count >= 1),
  ADD COLUMN earning_members_count INTEGER
    CHECK (earning_members_count IS NULL OR earning_members_count >= 0),
  ADD COLUMN dependents_count INTEGER
    CHECK (dependents_count IS NULL OR dependents_count >= 0),
  ADD COLUMN occupation VARCHAR(150),
  ADD COLUMN member_monthly_income NUMERIC(14, 2)
    CHECK (member_monthly_income IS NULL OR member_monthly_income >= 0),
  ADD COLUMN spouse_occupation VARCHAR(150),
  ADD COLUMN spouse_monthly_income NUMERIC(14, 2)
    CHECK (spouse_monthly_income IS NULL OR spouse_monthly_income >= 0),
  ADD COLUMN other_household_income NUMERIC(14, 2)
    CHECK (other_household_income IS NULL OR other_household_income >= 0),
  ADD COLUMN monthly_household_expenses NUMERIC(14, 2)
    CHECK (monthly_household_expenses IS NULL OR monthly_household_expenses >= 0),
  ADD COLUMN household_annual_income NUMERIC(14, 2)
    CHECK (household_annual_income IS NULL OR household_annual_income >= 0),
  ADD COLUMN existing_loan_details TEXT,
  ADD COLUMN existing_monthly_loan_repayment NUMERIC(14, 2)
    CHECK (existing_monthly_loan_repayment IS NULL OR existing_monthly_loan_repayment >= 0),
  ADD COLUMN identity_proof_type VARCHAR(100),
  ADD COLUMN address_proof_type VARCHAR(100),
  ADD COLUMN kyc_document_references JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(kyc_document_references) = 'array'),
  ADD COLUMN kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'expired')),
  ADD COLUMN kyc_verified_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN kyc_verified_at TIMESTAMPTZ,
  ADD COLUMN nominee_full_name VARCHAR(200),
  ADD COLUMN nominee_relationship VARCHAR(100),
  ADD COLUMN nominee_date_of_birth DATE,
  ADD COLUMN nominee_mobile_number VARCHAR(20),
  ADD COLUMN nominee_address TEXT,
  ADD COLUMN account_holder_name VARCHAR(200),
  ADD COLUMN bank_name VARCHAR(150),
  ADD COLUMN bank_branch_name VARCHAR(150),
  ADD COLUMN ifsc_code VARCHAR(20),
  ADD COLUMN bank_account_type VARCHAR(30)
    CHECK (bank_account_type IS NULL OR bank_account_type IN (
      'savings', 'current', 'other'
    )),
  ADD COLUMN bank_document_reference VARCHAR(512),
  ADD COLUMN bank_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (bank_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  ADD COLUMN center_name VARCHAR(150),
  ADD COLUMN group_name VARCHAR(150),
  ADD COLUMN field_officer_name VARCHAR(200),
  ADD COLUMN joining_date DATE,
  ADD COLUMN member_category VARCHAR(100),
  ADD COLUMN member_status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (member_status IN (
      'draft', 'submitted', 'under_review', 'kyc_pending',
      'approved', 'rejected', 'inactive'
    )),
  ADD COLUMN assigned_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN field_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (field_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  ADD COLUMN residence_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (residence_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  ADD COLUMN income_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (income_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  ADD COLUMN credit_bureau_check_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (credit_bureau_check_status IN (
      'pending', 'consented', 'checked', 'declined', 'not_required'
    )),
  ADD COLUMN credit_bureau_consent_reference VARCHAR(512),
  ADD COLUMN credit_bureau_consent_date TIMESTAMPTZ,
  ADD COLUMN privacy_notice_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN communication_sms_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN communication_whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN communication_call_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN communication_consent_date TIMESTAMPTZ,
  ADD COLUMN communication_consent_recorded_by UUID
    REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN member_declaration_signed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN kyc_approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (kyc_approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN reviewed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN internal_remarks TEXT,
  ADD COLUMN rejection_or_hold_reason TEXT;

UPDATE members
SET member_number = 'MF-' || TO_CHAR(nextval('member_number_seq'), 'FM00000000'),
    branch_id = (SELECT id FROM branches WHERE code = 'MAIN');

ALTER TABLE members
  ALTER COLUMN member_number SET NOT NULL,
  ALTER COLUMN member_number SET DEFAULT
    ('MF-' || TO_CHAR(nextval('member_number_seq'), 'FM00000000')),
  ALTER COLUMN branch_id SET NOT NULL;

ALTER TABLE members
  ADD CONSTRAINT members_member_number_unique UNIQUE (member_number);

CREATE INDEX idx_members_branch_created_at
  ON members (branch_id, created_at DESC);
CREATE INDEX idx_members_registration_status
  ON members (registration_status);
CREATE INDEX idx_members_district
  ON members (district);

CREATE TABLE member_sensitive_data (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  nonce BYTEA NOT NULL,
  ciphertext BYTEA NOT NULL,
  auth_tag BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Down Migration
DROP TABLE member_sensitive_data;
DROP INDEX idx_members_district;
DROP INDEX idx_members_registration_status;
DROP INDEX idx_members_branch_created_at;
ALTER TABLE members DROP CONSTRAINT members_member_number_unique;
ALTER TABLE members
  DROP COLUMN rejection_or_hold_reason,
  DROP COLUMN internal_remarks,
  DROP COLUMN approved_at,
  DROP COLUMN approved_by,
  DROP COLUMN reviewed_at,
  DROP COLUMN reviewed_by,
  DROP COLUMN kyc_approval_status,
  DROP COLUMN member_declaration_signed,
  DROP COLUMN communication_consent_recorded_by,
  DROP COLUMN communication_consent_date,
  DROP COLUMN communication_call_consent,
  DROP COLUMN communication_whatsapp_consent,
  DROP COLUMN communication_sms_consent,
  DROP COLUMN privacy_notice_accepted,
  DROP COLUMN credit_bureau_consent_date,
  DROP COLUMN credit_bureau_consent_reference,
  DROP COLUMN credit_bureau_check_status,
  DROP COLUMN income_verification_status,
  DROP COLUMN residence_verification_status,
  DROP COLUMN field_verification_status,
  DROP COLUMN assigned_by,
  DROP COLUMN member_status,
  DROP COLUMN member_category,
  DROP COLUMN joining_date,
  DROP COLUMN field_officer_name,
  DROP COLUMN group_name,
  DROP COLUMN center_name,
  DROP COLUMN bank_verification_status,
  DROP COLUMN bank_document_reference,
  DROP COLUMN bank_account_type,
  DROP COLUMN ifsc_code,
  DROP COLUMN bank_branch_name,
  DROP COLUMN bank_name,
  DROP COLUMN account_holder_name,
  DROP COLUMN nominee_address,
  DROP COLUMN nominee_mobile_number,
  DROP COLUMN nominee_date_of_birth,
  DROP COLUMN nominee_relationship,
  DROP COLUMN nominee_full_name,
  DROP COLUMN kyc_verified_at,
  DROP COLUMN kyc_verified_by,
  DROP COLUMN kyc_status,
  DROP COLUMN kyc_document_references,
  DROP COLUMN address_proof_type,
  DROP COLUMN identity_proof_type,
  DROP COLUMN existing_monthly_loan_repayment,
  DROP COLUMN existing_loan_details,
  DROP COLUMN household_annual_income,
  DROP COLUMN monthly_household_expenses,
  DROP COLUMN other_household_income,
  DROP COLUMN spouse_monthly_income,
  DROP COLUMN spouse_occupation,
  DROP COLUMN member_monthly_income,
  DROP COLUMN occupation,
  DROP COLUMN dependents_count,
  DROP COLUMN earning_members_count,
  DROP COLUMN family_members_count,
  DROP COLUMN address_verification_status,
  DROP COLUMN permanent_address,
  DROP COLUMN present_address,
  DROP COLUMN years_at_current_address,
  DROP COLUMN residence_type,
  DROP COLUMN pin_code,
  DROP COLUMN state,
  DROP COLUMN district,
  DROP COLUMN gram_panchayat_municipality,
  DROP COLUMN police_station,
  DROP COLUMN post_office,
  DROP COLUMN village_town,
  DROP COLUMN branch_id,
  DROP COLUMN registration_status,
  DROP COLUMN registration_date,
  DROP COLUMN member_number;
DROP SEQUENCE member_number_seq;
DROP TABLE branches;
