CREATE TABLE IF NOT EXISTS recipe_share_links (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  recipe_data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipe_share_links_token ON recipe_share_links(token);
CREATE INDEX IF NOT EXISTS idx_recipe_share_links_created_at ON recipe_share_links(created_at);
