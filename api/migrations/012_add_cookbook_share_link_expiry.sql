-- Add expiration to cookbook share links.
ALTER TABLE cookbook_share_links ADD COLUMN expires_at INTEGER;

UPDATE cookbook_share_links
SET expires_at = created_at + 2592000000
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cookbook_share_links_expires_at ON cookbook_share_links(expires_at);
