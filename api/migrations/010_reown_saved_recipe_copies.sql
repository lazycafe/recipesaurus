-- Saved Discover recipes are private user copies; source snapshots preserve attribution.
UPDATE recipes
SET owner_id = user_id
WHERE source_recipe_id IS NOT NULL
  AND source_recipe_snapshot IS NOT NULL
  AND is_public = 0;
