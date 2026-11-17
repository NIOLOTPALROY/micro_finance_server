-- Micro Finance Database Schema
-- Run against PostgreSQL: psql -U postgres -d micro_finance -f src/db/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'borrower' CHECK (role IN ('admin', 'borrower', 'lender')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session table for storing user sessions in database
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Create index on session expiry for cleanup
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- Create index on users email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

