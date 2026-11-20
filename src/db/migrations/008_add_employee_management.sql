-- Up Migration
ALTER TABLE users
  DROP CONSTRAINT users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'employee', 'member', 'lender')),
  ADD COLUMN employee_status VARCHAR(20)
    CHECK (employee_status IS NULL OR employee_status IN ('active', 'inactive'));

CREATE TABLE employee_permissions (
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL
    CHECK (permission IN (
      'members.read',
      'members.create',
      'members.update',
      'members.deactivate',
      'member_files.upload',
      'member_files.download'
    )),
  granted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, permission)
);

CREATE INDEX idx_employee_permissions_granted_by
  ON employee_permissions (granted_by);

-- Down Migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE role = 'employee') THEN
    RAISE EXCEPTION
      'Cannot roll back employee management while employee users exist';
  END IF;
END;
$$;

DROP INDEX idx_employee_permissions_granted_by;
DROP TABLE employee_permissions;

ALTER TABLE users
  DROP COLUMN employee_status,
  DROP CONSTRAINT users_role_check,
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'member', 'lender'));
