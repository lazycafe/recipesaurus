-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT NOT NULL,
  instructions TEXT NOT NULL,
  tags TEXT,
  image_url TEXT,
  source_url TEXT,
  prep_time TEXT,
  cook_time TEXT,
  servings TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cookbooks table
CREATE TABLE IF NOT EXISTS cookbooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Junction table for cookbook-recipe relationships
CREATE TABLE IF NOT EXISTS cookbook_recipes (
  cookbook_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (cookbook_id, recipe_id),
  FOREIGN KEY (cookbook_id) REFERENCES cookbooks(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Email-based sharing (requires account)
CREATE TABLE IF NOT EXISTS cookbook_shares (
  id TEXT PRIMARY KEY,
  cookbook_id TEXT NOT NULL,
  shared_with_user_id TEXT NOT NULL,
  shared_by_user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (cookbook_id) REFERENCES cookbooks(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(cookbook_id, shared_with_user_id)
);

-- Link-based sharing (public access)
CREATE TABLE IF NOT EXISTS cookbook_share_links (
  id TEXT PRIMARY KEY,
  cookbook_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (cookbook_id) REFERENCES cookbooks(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_cookbooks_user_id ON cookbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_cookbook_id ON cookbook_recipes(cookbook_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_recipe_id ON cookbook_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_shares_cookbook_id ON cookbook_shares(cookbook_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_shares_shared_with ON cookbook_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_share_links_token ON cookbook_share_links(token);
CREATE INDEX IF NOT EXISTS idx_cookbook_share_links_cookbook_id ON cookbook_share_links(cookbook_id);
