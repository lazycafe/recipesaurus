ALTER TABLE recipes ADD COLUMN source_recipe_id TEXT;

CREATE INDEX IF NOT EXISTS idx_recipes_source_recipe_id ON recipes(source_recipe_id);
