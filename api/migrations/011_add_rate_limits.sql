-- Fixed-window API rate limits for public utility endpoints
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(bucket, key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket_key ON rate_limits(bucket, key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
