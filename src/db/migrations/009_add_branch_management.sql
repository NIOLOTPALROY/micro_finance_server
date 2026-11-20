-- Up Migration
ALTER TABLE branches
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX idx_branches_active_name
  ON branches (name)
  WHERE is_active = TRUE;

-- Down Migration
DROP INDEX idx_branches_active_name;

ALTER TABLE branches
  DROP COLUMN updated_at,
  DROP COLUMN is_active;
