CREATE TABLE IF NOT EXISTS recipe_saves (
  user_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, recipe_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recipe_saves_recipe_id ON recipe_saves(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_saves_saved_at ON recipe_saves(saved_at);
