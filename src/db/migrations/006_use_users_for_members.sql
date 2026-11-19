-- Up Migration
ALTER TABLE users
  DROP CONSTRAINT users_role_check;

UPDATE users
SET role = 'member'
WHERE role = 'borrower';

ALTER TABLE users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'member', 'lender')),
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD COLUMN contact_email VARCHAR(255),
  ADD COLUMN first_name VARCHAR(100),
  ADD COLUMN last_name VARCHAR(100),
  ADD COLUMN father_or_husband_name VARCHAR(150),
  ADD COLUMN date_of_birth DATE,
  ADD COLUMN gender VARCHAR(30)
    CHECK (gender IS NULL OR gender IN (
      'male', 'female', 'other', 'prefer_not_to_say'
    )),
  ADD COLUMN marital_status VARCHAR(30)
    CHECK (marital_status IS NULL OR marital_status IN (
      'single', 'married', 'widowed', 'divorced', 'separated'
    )),
  ADD COLUMN mobile_number VARCHAR(20),
  ADD COLUMN alternate_mobile_number VARCHAR(20),
  ADD COLUMN photograph_reference VARCHAR(512),
  ADD COLUMN member_number VARCHAR(20),
  ADD COLUMN registration_date DATE,
  ADD COLUMN registration_status VARCHAR(30)
    CHECK (registration_status IS NULL OR registration_status IN (
      'draft', 'submitted', 'under_review', 'kyc_pending',
      'approved', 'rejected', 'inactive'
    )),
  ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
  ADD COLUMN member_status VARCHAR(30)
    CHECK (member_status IS NULL OR member_status IN (
      'draft', 'submitted', 'under_review', 'kyc_pending',
      'approved', 'rejected', 'inactive'
    )),
  ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE users
  ALTER COLUMN registration_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN registration_status SET DEFAULT 'draft',
  ALTER COLUMN member_status SET DEFAULT 'draft',
  ALTER COLUMN member_number SET DEFAULT
    ('MF-' || TO_CHAR(nextval('member_number_seq'), 'FM00000000'));

ALTER TABLE users
  ADD CONSTRAINT users_member_number_unique UNIQUE (member_number),
  ADD CONSTRAINT users_member_first_name_check
    CHECK (first_name IS NULL OR length(btrim(first_name)) > 0),
  ADD CONSTRAINT users_member_last_name_check
    CHECK (last_name IS NULL OR length(btrim(last_name)) > 0),
  ADD CONSTRAINT users_member_father_or_husband_name_check
    CHECK (
      father_or_husband_name IS NULL OR
      length(btrim(father_or_husband_name)) > 0
    ),
  ADD CONSTRAINT users_member_mobile_number_check
    CHECK (mobile_number IS NULL OR length(btrim(mobile_number)) > 0),
  ADD CONSTRAINT users_member_alternate_mobile_number_check
    CHECK (
      alternate_mobile_number IS NULL OR
      length(btrim(alternate_mobile_number)) > 0
    );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM members AS m
    JOIN users AS u ON u.id = m.id
  ) THEN
    RAISE EXCEPTION
      'Cannot merge members into users because at least one member ID already exists in users';
  END IF;
END;
$$;

INSERT INTO users (
  id, email, name, password_hash, role, created_at, updated_at,
  contact_email, first_name, last_name, father_or_husband_name,
  date_of_birth, gender, marital_status, mobile_number,
  alternate_mobile_number, photograph_reference, member_number,
  registration_date, registration_status, branch_id, member_status,
  created_by, updated_by
)
SELECT
  m.id, NULL, btrim(m.first_name || ' ' || m.last_name), NULL, 'member',
  m.created_at, m.updated_at, m.email, m.first_name, m.last_name,
  m.father_or_husband_name, m.date_of_birth, m.gender, m.marital_status,
  m.mobile_number, m.alternate_mobile_number, m.photograph_reference,
  m.member_number, m.registration_date, m.registration_status, m.branch_id,
  m.member_status, m.created_by, m.updated_by
FROM members AS m;

ALTER TABLE member_addresses
  DROP CONSTRAINT member_addresses_member_id_fkey;
ALTER TABLE member_addresses RENAME COLUMN member_id TO user_id;
ALTER TABLE member_addresses
  ADD CONSTRAINT member_addresses_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE member_financials
  DROP CONSTRAINT member_financials_member_id_fkey;
ALTER TABLE member_financials RENAME COLUMN member_id TO user_id;
ALTER TABLE member_financials
  ADD CONSTRAINT member_financials_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE member_kyc
  DROP CONSTRAINT member_kyc_member_id_fkey;
ALTER TABLE member_kyc RENAME COLUMN member_id TO user_id;
ALTER TABLE member_kyc
  ADD CONSTRAINT member_kyc_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE member_nominees
  DROP CONSTRAINT member_nominees_member_id_fkey;
ALTER TABLE member_nominees RENAME COLUMN member_id TO user_id;
ALTER TABLE member_nominees
  ADD CONSTRAINT member_nominees_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE member_bank_accounts
  DROP CONSTRAINT member_bank_accounts_member_id_fkey;
ALTER TABLE member_bank_accounts RENAME COLUMN member_id TO user_id;
ALTER TABLE member_bank_accounts
  ADD CONSTRAINT member_bank_accounts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE member_assignments
  DROP CONSTRAINT member_assignments_member_id_fkey;
ALTER TABLE member_assignments RENAME COLUMN member_id TO user_id;
ALTER TABLE member_assignments
  ADD CONSTRAINT member_assignments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE member_verification_consents
  DROP CONSTRAINT member_verification_consents_member_id_fkey;
ALTER TABLE member_verification_consents RENAME COLUMN member_id TO user_id;
ALTER TABLE member_verification_consents
  ADD CONSTRAINT member_verification_consents_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE member_approvals
  DROP CONSTRAINT member_approvals_member_id_fkey;
ALTER TABLE member_approvals RENAME COLUMN member_id TO user_id;
ALTER TABLE member_approvals
  ADD CONSTRAINT member_approvals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE member_sensitive_data
  DROP CONSTRAINT member_sensitive_data_member_id_fkey;
ALTER TABLE member_sensitive_data RENAME COLUMN member_id TO user_id;
ALTER TABLE member_sensitive_data
  ADD CONSTRAINT member_sensitive_data_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

DROP TABLE members;

CREATE INDEX idx_users_member_mobile_number
  ON users (mobile_number)
  WHERE role = 'member';
CREATE INDEX idx_users_member_branch_created_at
  ON users (branch_id, created_at DESC)
  WHERE role = 'member' AND member_number IS NOT NULL;
CREATE INDEX idx_users_member_registration_status
  ON users (registration_status)
  WHERE role = 'member' AND member_number IS NOT NULL;

-- Down Migration
DROP INDEX idx_users_member_registration_status;
DROP INDEX idx_users_member_branch_created_at;
DROP INDEX idx_users_member_mobile_number;

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL CHECK (length(btrim(first_name)) > 0),
  last_name VARCHAR(100) NOT NULL CHECK (length(btrim(last_name)) > 0),
  father_or_husband_name VARCHAR(150) NOT NULL
    CHECK (length(btrim(father_or_husband_name)) > 0),
  date_of_birth DATE NOT NULL,
  gender VARCHAR(30) NOT NULL
    CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  marital_status VARCHAR(30)
    CHECK (
      marital_status IS NULL OR
      marital_status IN ('single', 'married', 'widowed', 'divorced', 'separated')
    ),
  mobile_number VARCHAR(20) NOT NULL
    CHECK (length(btrim(mobile_number)) > 0),
  alternate_mobile_number VARCHAR(20)
    CHECK (
      alternate_mobile_number IS NULL OR
      length(btrim(alternate_mobile_number)) > 0
    ),
  email VARCHAR(255),
  photograph_reference VARCHAR(512),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  member_number VARCHAR(20) NOT NULL
    DEFAULT ('MF-' || TO_CHAR(nextval('member_number_seq'), 'FM00000000'))
    UNIQUE,
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  registration_status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (registration_status IN (
      'draft', 'submitted', 'under_review', 'kyc_pending',
      'approved', 'rejected', 'inactive'
    )),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  member_status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (member_status IN (
      'draft', 'submitted', 'under_review', 'kyc_pending',
      'approved', 'rejected', 'inactive'
    )),
  CONSTRAINT members_member_number_unique UNIQUE (member_number)
);

INSERT INTO members (
  id, first_name, last_name, father_or_husband_name, date_of_birth,
  gender, marital_status, mobile_number, alternate_mobile_number, email,
  photograph_reference, created_by, updated_by, created_at, updated_at,
  member_number, registration_date, registration_status, branch_id,
  member_status
)
SELECT
  id, first_name, last_name, father_or_husband_name, date_of_birth,
  gender, marital_status, mobile_number, alternate_mobile_number,
  contact_email, photograph_reference, created_by, updated_by, created_at,
  updated_at, member_number, registration_date, registration_status,
  branch_id, member_status
FROM users
WHERE role = 'member' AND member_number IS NOT NULL;

ALTER TABLE member_addresses
  DROP CONSTRAINT member_addresses_user_id_fkey;
ALTER TABLE member_addresses RENAME COLUMN user_id TO member_id;
ALTER TABLE member_addresses
  ADD CONSTRAINT member_addresses_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE member_financials
  DROP CONSTRAINT member_financials_user_id_fkey;
ALTER TABLE member_financials RENAME COLUMN user_id TO member_id;
ALTER TABLE member_financials
  ADD CONSTRAINT member_financials_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE member_kyc
  DROP CONSTRAINT member_kyc_user_id_fkey;
ALTER TABLE member_kyc RENAME COLUMN user_id TO member_id;
ALTER TABLE member_kyc
  ADD CONSTRAINT member_kyc_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE member_nominees
  DROP CONSTRAINT member_nominees_user_id_fkey;
ALTER TABLE member_nominees RENAME COLUMN user_id TO member_id;
ALTER TABLE member_nominees
  ADD CONSTRAINT member_nominees_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE member_bank_accounts
  DROP CONSTRAINT member_bank_accounts_user_id_fkey;
ALTER TABLE member_bank_accounts RENAME COLUMN user_id TO member_id;
ALTER TABLE member_bank_accounts
  ADD CONSTRAINT member_bank_accounts_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE member_assignments
  DROP CONSTRAINT member_assignments_user_id_fkey;
ALTER TABLE member_assignments RENAME COLUMN user_id TO member_id;
ALTER TABLE member_assignments
  ADD CONSTRAINT member_assignments_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE member_verification_consents
  DROP CONSTRAINT member_verification_consents_user_id_fkey;
ALTER TABLE member_verification_consents RENAME COLUMN user_id TO member_id;
ALTER TABLE member_verification_consents
  ADD CONSTRAINT member_verification_consents_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE member_approvals
  DROP CONSTRAINT member_approvals_user_id_fkey;
ALTER TABLE member_approvals RENAME COLUMN user_id TO member_id;
ALTER TABLE member_approvals
  ADD CONSTRAINT member_approvals_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE member_sensitive_data
  DROP CONSTRAINT member_sensitive_data_user_id_fkey;
ALTER TABLE member_sensitive_data RENAME COLUMN user_id TO member_id;
ALTER TABLE member_sensitive_data
  ADD CONSTRAINT member_sensitive_data_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;

DELETE FROM users
WHERE role = 'member' AND member_number IS NOT NULL;

ALTER TABLE users
  DROP CONSTRAINT users_role_check;
UPDATE users
SET role = 'borrower'
WHERE role = 'member';
ALTER TABLE users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'borrower', 'lender'));

ALTER TABLE users
  DROP CONSTRAINT users_member_number_unique,
  DROP CONSTRAINT users_member_first_name_check,
  DROP CONSTRAINT users_member_last_name_check,
  DROP CONSTRAINT users_member_father_or_husband_name_check,
  DROP CONSTRAINT users_member_mobile_number_check,
  DROP CONSTRAINT users_member_alternate_mobile_number_check,
  DROP COLUMN updated_by,
  DROP COLUMN created_by,
  DROP COLUMN member_status,
  DROP COLUMN branch_id,
  DROP COLUMN registration_status,
  DROP COLUMN registration_date,
  DROP COLUMN member_number,
  DROP COLUMN photograph_reference,
  DROP COLUMN alternate_mobile_number,
  DROP COLUMN mobile_number,
  DROP COLUMN marital_status,
  DROP COLUMN gender,
  DROP COLUMN date_of_birth,
  DROP COLUMN father_or_husband_name,
  DROP COLUMN last_name,
  DROP COLUMN first_name,
  DROP COLUMN contact_email,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN password_hash SET NOT NULL;

CREATE INDEX idx_members_mobile_number ON members (mobile_number);
CREATE INDEX idx_members_name ON members (last_name, first_name);
CREATE INDEX idx_members_created_at ON members (created_at DESC);
CREATE INDEX idx_members_branch_created_at
  ON members (branch_id, created_at DESC);
CREATE INDEX idx_members_registration_status
  ON members (registration_status);
