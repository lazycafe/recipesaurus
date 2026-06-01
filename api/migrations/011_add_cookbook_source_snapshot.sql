ALTER TABLE cookbooks ADD COLUMN source_cookbook_id TEXT;
ALTER TABLE cookbooks ADD COLUMN source_cookbook_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_cookbooks_source_cookbook_id ON cookbooks(source_cookbook_id);
