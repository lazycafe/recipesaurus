CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  page_key TEXT NOT NULL,
  user_id TEXT,
  viewed_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_page_views_page_key_viewed_at ON page_views(page_key, viewed_at);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views(viewed_at);
