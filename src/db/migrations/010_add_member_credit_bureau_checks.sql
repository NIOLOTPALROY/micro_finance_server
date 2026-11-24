-- Up Migration
ALTER TABLE employee_permissions
  DROP CONSTRAINT employee_permissions_permission_check;

ALTER TABLE employee_permissions
  ADD CONSTRAINT employee_permissions_permission_check
  CHECK (permission IN (
    'members.read',
    'members.create',
    'members.update',
    'members.deactivate',
    'member_files.upload',
    'member_files.download',
    'member_assessment.credit_check'
  ));

CREATE TABLE member_credit_bureau_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  consent_reference VARCHAR(512) NOT NULL,
  consent_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(30) NOT NULL
    CHECK (status IN (
      'provider_not_configured', 'pending', 'completed', 'failed'
    )),
  provider_name VARCHAR(100),
  provider_reference VARCHAR(255),
  score_nonce BYTEA,
  score_ciphertext BYTEA,
  score_auth_tag BYTEA,
  checked_at TIMESTAMPTZ,
  failure_code VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_credit_bureau_checks_score_encryption CHECK (
    (score_nonce IS NULL AND score_ciphertext IS NULL AND score_auth_tag IS NULL)
    OR
    (score_nonce IS NOT NULL AND score_ciphertext IS NOT NULL
      AND score_auth_tag IS NOT NULL)
  ),
  CONSTRAINT member_credit_bureau_checks_result_consistency CHECK (
    (status = 'completed' AND checked_at IS NOT NULL
      AND provider_name IS NOT NULL AND failure_code IS NULL)
    OR
    (status = 'provider_not_configured' AND score_nonce IS NULL
      AND score_ciphertext IS NULL AND score_auth_tag IS NULL
      AND checked_at IS NULL AND provider_name IS NULL
      AND failure_code = 'provider_not_configured')
    OR
    (status = 'pending' AND score_nonce IS NULL AND score_ciphertext IS NULL
      AND score_auth_tag IS NULL AND checked_at IS NULL
      AND failure_code IS NULL)
    OR
    (status = 'failed' AND score_nonce IS NULL AND score_ciphertext IS NULL
      AND score_auth_tag IS NULL AND checked_at IS NULL
      AND failure_code IS NOT NULL)
  )
);

CREATE INDEX idx_member_credit_bureau_checks_member_created
  ON member_credit_bureau_checks (member_id, created_at DESC);

CREATE INDEX idx_member_credit_bureau_checks_requested_by
  ON member_credit_bureau_checks (requested_by, created_at DESC);

-- Down Migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM member_credit_bureau_checks) THEN
    RAISE EXCEPTION
      'Cannot roll back member credit bureau checks while check history exists';
  END IF;
END;
$$;

DROP INDEX idx_member_credit_bureau_checks_requested_by;
DROP INDEX idx_member_credit_bureau_checks_member_created;
DROP TABLE member_credit_bureau_checks;

DELETE FROM employee_permissions
WHERE permission = 'member_assessment.credit_check';

ALTER TABLE employee_permissions
  DROP CONSTRAINT employee_permissions_permission_check;

ALTER TABLE employee_permissions
  ADD CONSTRAINT employee_permissions_permission_check
  CHECK (permission IN (
    'members.read',
    'members.create',
    'members.update',
    'members.deactivate',
    'member_files.upload',
    'member_files.download'
  ));
