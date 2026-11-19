-- Up Migration
CREATE TABLE member_personal_information (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
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
  contact_email VARCHAR(255),
  photograph_reference VARCHAR(512)
);

INSERT INTO member_personal_information (
  user_id, first_name, last_name, father_or_husband_name, date_of_birth,
  gender, marital_status, mobile_number, alternate_mobile_number,
  contact_email, photograph_reference
)
SELECT
  id, first_name, last_name, father_or_husband_name, date_of_birth, gender,
  marital_status, mobile_number, alternate_mobile_number, contact_email,
  photograph_reference
FROM users
WHERE role = 'member' AND member_number IS NOT NULL;

DROP INDEX idx_users_member_mobile_number;

ALTER TABLE users
  DROP CONSTRAINT users_member_first_name_check,
  DROP CONSTRAINT users_member_last_name_check,
  DROP CONSTRAINT users_member_father_or_husband_name_check,
  DROP CONSTRAINT users_member_mobile_number_check,
  DROP CONSTRAINT users_member_alternate_mobile_number_check,
  DROP COLUMN contact_email,
  DROP COLUMN first_name,
  DROP COLUMN last_name,
  DROP COLUMN father_or_husband_name,
  DROP COLUMN date_of_birth,
  DROP COLUMN gender,
  DROP COLUMN marital_status,
  DROP COLUMN mobile_number,
  DROP COLUMN alternate_mobile_number,
  DROP COLUMN photograph_reference;

CREATE INDEX idx_member_personal_information_mobile_number
  ON member_personal_information (mobile_number);

-- Down Migration
DROP INDEX idx_member_personal_information_mobile_number;

ALTER TABLE users
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

UPDATE users AS u
SET contact_email = p.contact_email,
    first_name = p.first_name,
    last_name = p.last_name,
    father_or_husband_name = p.father_or_husband_name,
    date_of_birth = p.date_of_birth,
    gender = p.gender,
    marital_status = p.marital_status,
    mobile_number = p.mobile_number,
    alternate_mobile_number = p.alternate_mobile_number,
    photograph_reference = p.photograph_reference
FROM member_personal_information AS p
WHERE p.user_id = u.id;

DROP TABLE member_personal_information;

CREATE INDEX idx_users_member_mobile_number
  ON users (mobile_number)
  WHERE role = 'member';
