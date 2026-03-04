-- Add added_by_user_id column to cookbook_recipes table
-- For existing records, set added_by_user_id to the cookbook owner's user_id

ALTER TABLE cookbook_recipes ADD COLUMN added_by_user_id TEXT;

-- Update existing records to have the cookbook owner as the added_by user
UPDATE cookbook_recipes
SET added_by_user_id = (
  SELECT c.user_id FROM cookbooks c WHERE c.id = cookbook_recipes.cookbook_id
);
