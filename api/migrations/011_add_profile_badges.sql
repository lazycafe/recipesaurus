CREATE TABLE IF NOT EXISTS profile_badges (
  user_id TEXT NOT NULL,
  badge TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, badge),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_badges_user_id ON profile_badges(user_id);

INSERT OR IGNORE INTO profile_badges (user_id, badge, granted_at)
SELECT id, 'early_adopter', CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM users
WHERE id = '01e661dd94b580d2ac099044800a3096';
