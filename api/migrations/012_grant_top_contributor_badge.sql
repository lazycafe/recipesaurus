INSERT OR IGNORE INTO profile_badges (user_id, badge, granted_at)
SELECT id, 'top_contributor', CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM users
WHERE id = '01e661dd94b580d2ac099044800a3096';
