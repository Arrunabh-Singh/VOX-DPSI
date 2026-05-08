-- Persistent app-level key/value config.
-- Used for round-robin council assignment state.
CREATE TABLE IF NOT EXISTS system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_config (key, value)
VALUES ('round_robin_index', '0')
ON CONFLICT (key) DO NOTHING;
