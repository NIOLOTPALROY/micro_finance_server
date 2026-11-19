-- Up Migration
CREATE TABLE member_addresses (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  village_town VARCHAR(150),
  post_office VARCHAR(150),
  police_station VARCHAR(150),
  gram_panchayat_municipality VARCHAR(150),
  district VARCHAR(150),
  state VARCHAR(150),
  pin_code VARCHAR(20),
  residence_type VARCHAR(20)
    CHECK (residence_type IS NULL OR residence_type IN ('own', 'rented', 'other')),
  years_at_current_address NUMERIC(5, 2)
    CHECK (years_at_current_address IS NULL OR years_at_current_address >= 0),
  present_address TEXT,
  permanent_address TEXT,
  address_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (address_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    ))
);

CREATE TABLE member_financials (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  family_members_count INTEGER
    CHECK (family_members_count IS NULL OR family_members_count >= 1),
  earning_members_count INTEGER
    CHECK (earning_members_count IS NULL OR earning_members_count >= 0),
  dependents_count INTEGER
    CHECK (dependents_count IS NULL OR dependents_count >= 0),
  occupation VARCHAR(150),
  member_monthly_income NUMERIC(14, 2)
    CHECK (member_monthly_income IS NULL OR member_monthly_income >= 0),
  spouse_occupation VARCHAR(150),
  spouse_monthly_income NUMERIC(14, 2)
    CHECK (spouse_monthly_income IS NULL OR spouse_monthly_income >= 0),
  other_household_income NUMERIC(14, 2)
    CHECK (other_household_income IS NULL OR other_household_income >= 0),
  monthly_household_expenses NUMERIC(14, 2)
    CHECK (monthly_household_expenses IS NULL OR monthly_household_expenses >= 0),
  household_annual_income NUMERIC(14, 2)
    CHECK (household_annual_income IS NULL OR household_annual_income >= 0),
  existing_loan_details TEXT,
  existing_monthly_loan_repayment NUMERIC(14, 2)
    CHECK (
      existing_monthly_loan_repayment IS NULL OR
      existing_monthly_loan_repayment >= 0
    )
);

CREATE TABLE member_kyc (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  identity_proof_type VARCHAR(100),
  address_proof_type VARCHAR(100),
  kyc_document_references JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(kyc_document_references) = 'array'),
  kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'expired')),
  kyc_verified_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  kyc_verified_at TIMESTAMPTZ,
  kyc_approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (kyc_approval_status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE member_nominees (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  nominee_full_name VARCHAR(200),
  nominee_relationship VARCHAR(100),
  nominee_date_of_birth DATE,
  nominee_mobile_number VARCHAR(20),
  nominee_address TEXT
);

CREATE TABLE member_bank_accounts (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  account_holder_name VARCHAR(200),
  bank_name VARCHAR(150),
  bank_branch_name VARCHAR(150),
  ifsc_code VARCHAR(20),
  bank_account_type VARCHAR(30)
    CHECK (bank_account_type IS NULL OR bank_account_type IN (
      'savings', 'current', 'other'
    )),
  bank_document_reference VARCHAR(512),
  bank_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (bank_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    ))
);

CREATE TABLE member_assignments (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  center_name VARCHAR(150),
  group_name VARCHAR(150),
  field_officer_name VARCHAR(200),
  joining_date DATE,
  member_category VARCHAR(100),
  assigned_by UUID REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE member_verification_consents (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  field_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (field_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  residence_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (residence_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  income_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (income_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  credit_bureau_check_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (credit_bureau_check_status IN (
      'pending', 'consented', 'checked', 'declined', 'not_required'
    )),
  credit_bureau_consent_reference VARCHAR(512),
  credit_bureau_consent_date TIMESTAMPTZ,
  privacy_notice_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  communication_sms_consent BOOLEAN NOT NULL DEFAULT FALSE,
  communication_whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE,
  communication_call_consent BOOLEAN NOT NULL DEFAULT FALSE,
  communication_consent_date TIMESTAMPTZ,
  communication_consent_recorded_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  member_declaration_signed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE member_approvals (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  internal_remarks TEXT,
  rejection_or_hold_reason TEXT
);

INSERT INTO member_addresses (
  member_id, village_town, post_office, police_station,
  gram_panchayat_municipality, district, state, pin_code, residence_type,
  years_at_current_address, present_address, permanent_address,
  address_verification_status
)
SELECT id, village_town, post_office, police_station,
       gram_panchayat_municipality, district, state, pin_code, residence_type,
       years_at_current_address, present_address, permanent_address,
       address_verification_status
FROM members;

INSERT INTO member_financials (
  member_id, family_members_count, earning_members_count, dependents_count,
  occupation, member_monthly_income, spouse_occupation, spouse_monthly_income,
  other_household_income, monthly_household_expenses, household_annual_income,
  existing_loan_details, existing_monthly_loan_repayment
)
SELECT id, family_members_count, earning_members_count, dependents_count,
       occupation, member_monthly_income, spouse_occupation,
       spouse_monthly_income, other_household_income,
       monthly_household_expenses, household_annual_income,
       existing_loan_details, existing_monthly_loan_repayment
FROM members;

INSERT INTO member_kyc (
  member_id, identity_proof_type, address_proof_type, kyc_document_references,
  kyc_status, kyc_verified_by, kyc_verified_at, kyc_approval_status
)
SELECT id, identity_proof_type, address_proof_type, kyc_document_references,
       kyc_status, kyc_verified_by, kyc_verified_at, kyc_approval_status
FROM members;

INSERT INTO member_nominees (
  member_id, nominee_full_name, nominee_relationship, nominee_date_of_birth,
  nominee_mobile_number, nominee_address
)
SELECT id, nominee_full_name, nominee_relationship, nominee_date_of_birth,
       nominee_mobile_number, nominee_address
FROM members;

INSERT INTO member_bank_accounts (
  member_id, account_holder_name, bank_name, bank_branch_name, ifsc_code,
  bank_account_type, bank_document_reference, bank_verification_status
)
SELECT id, account_holder_name, bank_name, bank_branch_name, ifsc_code,
       bank_account_type, bank_document_reference, bank_verification_status
FROM members;

INSERT INTO member_assignments (
  member_id, center_name, group_name, field_officer_name, joining_date,
  member_category, assigned_by
)
SELECT id, center_name, group_name, field_officer_name, joining_date,
       member_category, assigned_by
FROM members;

INSERT INTO member_verification_consents (
  member_id, field_verification_status, residence_verification_status,
  income_verification_status, credit_bureau_check_status,
  credit_bureau_consent_reference, credit_bureau_consent_date,
  privacy_notice_accepted, communication_sms_consent,
  communication_whatsapp_consent, communication_call_consent,
  communication_consent_date, communication_consent_recorded_by,
  member_declaration_signed
)
SELECT id, field_verification_status, residence_verification_status,
       income_verification_status, credit_bureau_check_status,
       credit_bureau_consent_reference, credit_bureau_consent_date,
       privacy_notice_accepted, communication_sms_consent,
       communication_whatsapp_consent, communication_call_consent,
       communication_consent_date, communication_consent_recorded_by,
       member_declaration_signed
FROM members;

INSERT INTO member_approvals (
  member_id, reviewed_by, reviewed_at, approved_by, approved_at,
  internal_remarks, rejection_or_hold_reason
)
SELECT id, reviewed_by, reviewed_at, approved_by, approved_at,
       internal_remarks, rejection_or_hold_reason
FROM members;

DROP INDEX idx_members_district;
ALTER TABLE members
  DROP COLUMN village_town,
  DROP COLUMN post_office,
  DROP COLUMN police_station,
  DROP COLUMN gram_panchayat_municipality,
  DROP COLUMN district,
  DROP COLUMN state,
  DROP COLUMN pin_code,
  DROP COLUMN residence_type,
  DROP COLUMN years_at_current_address,
  DROP COLUMN present_address,
  DROP COLUMN permanent_address,
  DROP COLUMN address_verification_status,
  DROP COLUMN family_members_count,
  DROP COLUMN earning_members_count,
  DROP COLUMN dependents_count,
  DROP COLUMN occupation,
  DROP COLUMN member_monthly_income,
  DROP COLUMN spouse_occupation,
  DROP COLUMN spouse_monthly_income,
  DROP COLUMN other_household_income,
  DROP COLUMN monthly_household_expenses,
  DROP COLUMN household_annual_income,
  DROP COLUMN existing_loan_details,
  DROP COLUMN existing_monthly_loan_repayment,
  DROP COLUMN identity_proof_type,
  DROP COLUMN address_proof_type,
  DROP COLUMN kyc_document_references,
  DROP COLUMN kyc_status,
  DROP COLUMN kyc_verified_by,
  DROP COLUMN kyc_verified_at,
  DROP COLUMN nominee_full_name,
  DROP COLUMN nominee_relationship,
  DROP COLUMN nominee_date_of_birth,
  DROP COLUMN nominee_mobile_number,
  DROP COLUMN nominee_address,
  DROP COLUMN account_holder_name,
  DROP COLUMN bank_name,
  DROP COLUMN bank_branch_name,
  DROP COLUMN ifsc_code,
  DROP COLUMN bank_account_type,
  DROP COLUMN bank_document_reference,
  DROP COLUMN bank_verification_status,
  DROP COLUMN center_name,
  DROP COLUMN group_name,
  DROP COLUMN field_officer_name,
  DROP COLUMN joining_date,
  DROP COLUMN member_category,
  DROP COLUMN assigned_by,
  DROP COLUMN field_verification_status,
  DROP COLUMN residence_verification_status,
  DROP COLUMN income_verification_status,
  DROP COLUMN credit_bureau_check_status,
  DROP COLUMN credit_bureau_consent_reference,
  DROP COLUMN credit_bureau_consent_date,
  DROP COLUMN privacy_notice_accepted,
  DROP COLUMN communication_sms_consent,
  DROP COLUMN communication_whatsapp_consent,
  DROP COLUMN communication_call_consent,
  DROP COLUMN communication_consent_date,
  DROP COLUMN communication_consent_recorded_by,
  DROP COLUMN member_declaration_signed,
  DROP COLUMN kyc_approval_status,
  DROP COLUMN reviewed_by,
  DROP COLUMN reviewed_at,
  DROP COLUMN approved_by,
  DROP COLUMN approved_at,
  DROP COLUMN internal_remarks,
  DROP COLUMN rejection_or_hold_reason;

CREATE INDEX idx_member_addresses_district
  ON member_addresses (district);

-- Down Migration
DROP INDEX idx_member_addresses_district;

ALTER TABLE members
  ADD COLUMN village_town VARCHAR(150),
  ADD COLUMN post_office VARCHAR(150),
  ADD COLUMN police_station VARCHAR(150),
  ADD COLUMN gram_panchayat_municipality VARCHAR(150),
  ADD COLUMN district VARCHAR(150),
  ADD COLUMN state VARCHAR(150),
  ADD COLUMN pin_code VARCHAR(20),
  ADD COLUMN residence_type VARCHAR(20),
  ADD COLUMN years_at_current_address NUMERIC(5, 2),
  ADD COLUMN present_address TEXT,
  ADD COLUMN permanent_address TEXT,
  ADD COLUMN address_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (address_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  ADD COLUMN family_members_count INTEGER,
  ADD COLUMN earning_members_count INTEGER,
  ADD COLUMN dependents_count INTEGER,
  ADD COLUMN occupation VARCHAR(150),
  ADD COLUMN member_monthly_income NUMERIC(14, 2),
  ADD COLUMN spouse_occupation VARCHAR(150),
  ADD COLUMN spouse_monthly_income NUMERIC(14, 2),
  ADD COLUMN other_household_income NUMERIC(14, 2),
  ADD COLUMN monthly_household_expenses NUMERIC(14, 2),
  ADD COLUMN household_annual_income NUMERIC(14, 2),
  ADD COLUMN existing_loan_details TEXT,
  ADD COLUMN existing_monthly_loan_repayment NUMERIC(14, 2),
  ADD COLUMN identity_proof_type VARCHAR(100),
  ADD COLUMN address_proof_type VARCHAR(100),
  ADD COLUMN kyc_document_references JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(kyc_document_references) = 'array'),
  ADD COLUMN kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN kyc_verified_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN kyc_verified_at TIMESTAMPTZ,
  ADD COLUMN kyc_approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN nominee_full_name VARCHAR(200),
  ADD COLUMN nominee_relationship VARCHAR(100),
  ADD COLUMN nominee_date_of_birth DATE,
  ADD COLUMN nominee_mobile_number VARCHAR(20),
  ADD COLUMN nominee_address TEXT,
  ADD COLUMN account_holder_name VARCHAR(200),
  ADD COLUMN bank_name VARCHAR(150),
  ADD COLUMN bank_branch_name VARCHAR(150),
  ADD COLUMN ifsc_code VARCHAR(20),
  ADD COLUMN bank_account_type VARCHAR(30),
  ADD COLUMN bank_document_reference VARCHAR(512),
  ADD COLUMN bank_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN center_name VARCHAR(150),
  ADD COLUMN group_name VARCHAR(150),
  ADD COLUMN field_officer_name VARCHAR(200),
  ADD COLUMN joining_date DATE,
  ADD COLUMN member_category VARCHAR(100),
  ADD COLUMN assigned_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN field_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN residence_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN income_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN credit_bureau_check_status VARCHAR(20) NOT NULL DEFAULT 'pending',
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
  ADD COLUMN reviewed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN internal_remarks TEXT,
  ADD COLUMN rejection_or_hold_reason TEXT;

UPDATE members AS m
SET village_town = a.village_town,
    post_office = a.post_office,
    police_station = a.police_station,
    gram_panchayat_municipality = a.gram_panchayat_municipality,
    district = a.district,
    state = a.state,
    pin_code = a.pin_code,
    residence_type = a.residence_type,
    years_at_current_address = a.years_at_current_address,
    present_address = a.present_address,
    permanent_address = a.permanent_address,
    address_verification_status = a.address_verification_status,
    family_members_count = f.family_members_count,
    earning_members_count = f.earning_members_count,
    dependents_count = f.dependents_count,
    occupation = f.occupation,
    member_monthly_income = f.member_monthly_income,
    spouse_occupation = f.spouse_occupation,
    spouse_monthly_income = f.spouse_monthly_income,
    other_household_income = f.other_household_income,
    monthly_household_expenses = f.monthly_household_expenses,
    household_annual_income = f.household_annual_income,
    existing_loan_details = f.existing_loan_details,
    existing_monthly_loan_repayment = f.existing_monthly_loan_repayment,
    identity_proof_type = k.identity_proof_type,
    address_proof_type = k.address_proof_type,
    kyc_document_references = k.kyc_document_references,
    kyc_status = k.kyc_status,
    kyc_verified_by = k.kyc_verified_by,
    kyc_verified_at = k.kyc_verified_at,
    kyc_approval_status = k.kyc_approval_status,
    nominee_full_name = n.nominee_full_name,
    nominee_relationship = n.nominee_relationship,
    nominee_date_of_birth = n.nominee_date_of_birth,
    nominee_mobile_number = n.nominee_mobile_number,
    nominee_address = n.nominee_address,
    account_holder_name = ba.account_holder_name,
    bank_name = ba.bank_name,
    bank_branch_name = ba.bank_branch_name,
    ifsc_code = ba.ifsc_code,
    bank_account_type = ba.bank_account_type,
    bank_document_reference = ba.bank_document_reference,
    bank_verification_status = ba.bank_verification_status,
    center_name = ass.center_name,
    group_name = ass.group_name,
    field_officer_name = ass.field_officer_name,
    joining_date = ass.joining_date,
    member_category = ass.member_category,
    assigned_by = ass.assigned_by,
    field_verification_status = v.field_verification_status,
    residence_verification_status = v.residence_verification_status,
    income_verification_status = v.income_verification_status,
    credit_bureau_check_status = v.credit_bureau_check_status,
    credit_bureau_consent_reference = v.credit_bureau_consent_reference,
    credit_bureau_consent_date = v.credit_bureau_consent_date,
    privacy_notice_accepted = v.privacy_notice_accepted,
    communication_sms_consent = v.communication_sms_consent,
    communication_whatsapp_consent = v.communication_whatsapp_consent,
    communication_call_consent = v.communication_call_consent,
    communication_consent_date = v.communication_consent_date,
    communication_consent_recorded_by = v.communication_consent_recorded_by,
    member_declaration_signed = v.member_declaration_signed,
    reviewed_by = ap.reviewed_by,
    reviewed_at = ap.reviewed_at,
    approved_by = ap.approved_by,
    approved_at = ap.approved_at,
    internal_remarks = ap.internal_remarks,
    rejection_or_hold_reason = ap.rejection_or_hold_reason
FROM member_addresses AS a
JOIN member_financials AS f ON f.member_id = a.member_id
JOIN member_kyc AS k ON k.member_id = a.member_id
JOIN member_nominees AS n ON n.member_id = a.member_id
JOIN member_bank_accounts AS ba ON ba.member_id = a.member_id
JOIN member_assignments AS ass ON ass.member_id = a.member_id
JOIN member_verification_consents AS v ON v.member_id = a.member_id
JOIN member_approvals AS ap ON ap.member_id = a.member_id
WHERE m.id = a.member_id;

ALTER TABLE members
  ADD CONSTRAINT members_residence_type_check
    CHECK (residence_type IS NULL OR residence_type IN ('own', 'rented', 'other')),
  ADD CONSTRAINT members_years_at_current_address_check
    CHECK (years_at_current_address IS NULL OR years_at_current_address >= 0),
  ADD CONSTRAINT members_family_members_count_check
    CHECK (family_members_count IS NULL OR family_members_count >= 1),
  ADD CONSTRAINT members_earning_members_count_check
    CHECK (earning_members_count IS NULL OR earning_members_count >= 0),
  ADD CONSTRAINT members_dependents_count_check
    CHECK (dependents_count IS NULL OR dependents_count >= 0),
  ADD CONSTRAINT members_member_monthly_income_check
    CHECK (member_monthly_income IS NULL OR member_monthly_income >= 0),
  ADD CONSTRAINT members_spouse_monthly_income_check
    CHECK (spouse_monthly_income IS NULL OR spouse_monthly_income >= 0),
  ADD CONSTRAINT members_other_household_income_check
    CHECK (other_household_income IS NULL OR other_household_income >= 0),
  ADD CONSTRAINT members_monthly_household_expenses_check
    CHECK (monthly_household_expenses IS NULL OR monthly_household_expenses >= 0),
  ADD CONSTRAINT members_household_annual_income_check
    CHECK (household_annual_income IS NULL OR household_annual_income >= 0),
  ADD CONSTRAINT members_existing_monthly_loan_repayment_check
    CHECK (
      existing_monthly_loan_repayment IS NULL OR
      existing_monthly_loan_repayment >= 0
    ),
  ADD CONSTRAINT members_kyc_status_check
    CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'expired')),
  ADD CONSTRAINT members_kyc_approval_status_check
    CHECK (kyc_approval_status IN ('pending', 'approved', 'rejected')),
  ADD CONSTRAINT members_bank_account_type_check
    CHECK (bank_account_type IS NULL OR bank_account_type IN (
      'savings', 'current', 'other'
    )),
  ADD CONSTRAINT members_bank_verification_status_check
    CHECK (bank_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  ADD CONSTRAINT members_field_verification_status_check
    CHECK (field_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  ADD CONSTRAINT members_residence_verification_status_check
    CHECK (residence_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  ADD CONSTRAINT members_income_verification_status_check
    CHECK (income_verification_status IN (
      'pending', 'verified', 'rejected', 'not_required'
    )),
  ADD CONSTRAINT members_credit_bureau_check_status_check
    CHECK (credit_bureau_check_status IN (
      'pending', 'consented', 'checked', 'declined', 'not_required'
    ));

CREATE INDEX idx_members_district ON members (district);
DROP TABLE member_approvals;
DROP TABLE member_verification_consents;
DROP TABLE member_assignments;
DROP TABLE member_bank_accounts;
DROP TABLE member_nominees;
DROP TABLE member_kyc;
DROP TABLE member_financials;
DROP TABLE member_addresses;
