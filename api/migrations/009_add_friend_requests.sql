CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  requested_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  responded_at INTEGER,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(requester_id, requested_user_id),
  CHECK (requester_id <> requested_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_requested_user ON friend_requests(requested_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
