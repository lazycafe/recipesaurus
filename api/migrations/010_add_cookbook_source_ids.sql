ALTER TABLE cookbooks ADD COLUMN source_cookbook_id TEXT;

CREATE INDEX IF NOT EXISTS idx_cookbooks_source_cookbook_id ON cookbooks(source_cookbook_id);
