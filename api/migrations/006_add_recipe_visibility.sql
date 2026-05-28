-- Add recipe ownership and visibility fields used by shared/public recipe saves.
ALTER TABLE recipes ADD COLUMN owner_id TEXT;
UPDATE recipes SET owner_id = user_id WHERE owner_id IS NULL;

ALTER TABLE recipes ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_recipes_owner_id ON recipes(owner_id);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);
