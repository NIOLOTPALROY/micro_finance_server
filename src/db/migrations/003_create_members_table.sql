CREATE TABLE IF NOT EXISTS members (
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_mobile_number
  ON members (mobile_number);
CREATE INDEX IF NOT EXISTS idx_members_name
  ON members (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_members_created_at
  ON members (created_at DESC);
