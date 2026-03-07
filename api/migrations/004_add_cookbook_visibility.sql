-- Add system cookbook and visibility columns to cookbooks table
ALTER TABLE cookbooks ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cookbooks ADD COLUMN system_type TEXT;
ALTER TABLE cookbooks ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cookbooks_is_public ON cookbooks(is_public);
CREATE INDEX IF NOT EXISTS idx_cookbooks_system_type ON cookbooks(system_type);
