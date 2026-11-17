-- Create session table for storing user sessions
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Create index on session expiry for cleanup
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);
