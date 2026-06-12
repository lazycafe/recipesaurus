-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
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
  owner_id TEXT NOT NULL,
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
  source_recipe_id TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
);

-- Lightweight saves of existing recipes. A saved public recipe stays as a
-- reference until the user edits it, then the API materializes a private row.
CREATE TABLE IF NOT EXISTS recipe_saves (
  user_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, recipe_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Cookbooks table
CREATE TABLE IF NOT EXISTS cookbooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  system_type TEXT,
  source_cookbook_id TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_cookbook_id) REFERENCES cookbooks(id) ON DELETE SET NULL
);

-- Junction table for cookbook-recipe relationships
CREATE TABLE IF NOT EXISTS cookbook_recipes (
  cookbook_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  added_by_user_id TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (cookbook_id, recipe_id),
  FOREIGN KEY (cookbook_id) REFERENCES cookbooks(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by_user_id) REFERENCES users(id) ON DELETE CASCADE
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
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (cookbook_id) REFERENCES cookbooks(id) ON DELETE CASCADE
);

-- Link-based recipe sharing (public access)
CREATE TABLE IF NOT EXISTS recipe_share_links (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  recipe_data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Pending cookbook invites (before user accepts)
CREATE TABLE IF NOT EXISTS cookbook_invites (
  id TEXT PRIMARY KEY,
  cookbook_id TEXT NOT NULL,
  invited_user_id TEXT NOT NULL,
  invited_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (cookbook_id) REFERENCES cookbooks(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(cookbook_id, invited_user_id)
);

-- AI meal planning requests for weekly quota enforcement
CREATE TABLE IF NOT EXISTS ai_meal_plan_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Paid meal planning subscriptions. Stripe remains the source of truth;
-- this table mirrors signed webhook state for quota decisions.
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Public badges awarded to user profiles.
CREATE TABLE IF NOT EXISTS profile_badges (
  user_id TEXT NOT NULL,
  badge TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, badge),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Mutual friendships between users. user_a_id and user_b_id are stored in
-- lexical order so each friendship has exactly one row.
CREATE TABLE IF NOT EXISTS friendships (
  user_a_id TEXT NOT NULL,
  user_b_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_a_id, user_b_id),
  FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (user_a_id <> user_b_id)
);

-- Friend requests are one-way until accepted. Accepted requests create a row in
-- friendships, which remains the canonical mutual-friend table.
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

-- Fixed-window API rate limits for public utility endpoints
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(bucket, key, window_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_cookbook_invites_invited_user ON cookbook_invites(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_invites_status ON cookbook_invites(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_requested_user ON friend_requests(requested_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_owner_id ON recipes(owner_id);
CREATE INDEX IF NOT EXISTS idx_recipes_source_recipe_id ON recipes(source_recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);
CREATE INDEX IF NOT EXISTS idx_recipe_saves_recipe_id ON recipe_saves(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_saves_saved_at ON recipe_saves(saved_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_cookbooks_user_id ON cookbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_cookbooks_is_public ON cookbooks(is_public);
CREATE INDEX IF NOT EXISTS idx_cookbooks_system_type ON cookbooks(system_type);
CREATE INDEX IF NOT EXISTS idx_cookbooks_source_cookbook_id ON cookbooks(source_cookbook_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_cookbook_id ON cookbook_recipes(cookbook_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_recipe_id ON cookbook_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_shares_cookbook_id ON cookbook_shares(cookbook_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_shares_shared_with ON cookbook_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_share_links_token ON cookbook_share_links(token);
CREATE INDEX IF NOT EXISTS idx_cookbook_share_links_cookbook_id ON cookbook_share_links(cookbook_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_share_links_expires_at ON cookbook_share_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_recipe_share_links_token ON recipe_share_links(token);
CREATE INDEX IF NOT EXISTS idx_recipe_share_links_created_at ON recipe_share_links(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_meal_plan_requests_user_created ON ai_meal_plan_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profile_badges_user_id ON profile_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket_key ON rate_limits(bucket, key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
