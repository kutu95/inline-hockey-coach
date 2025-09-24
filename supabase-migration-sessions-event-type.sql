-- Add event_type to sessions to support games and practices
-- Safe, idempotent migration

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'practice'
    CHECK (event_type IN ('practice','game'));

-- Optional: index for filtering by type
CREATE INDEX IF NOT EXISTS idx_sessions_event_type ON sessions(event_type);





