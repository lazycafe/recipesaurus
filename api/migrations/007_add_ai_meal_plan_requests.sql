CREATE TABLE IF NOT EXISTS ai_meal_plan_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_meal_plan_requests_user_created ON ai_meal_plan_requests(user_id, created_at);
