-- Example queries for the report
-- 1) Dashboard summary
SELECT
  COUNT(*) AS total_titles,
  SUM(CASE WHEN status = 'watchlist' THEN 1 ELSE 0 END) AS watchlist_count,
  SUM(CASE WHEN status = 'watched' THEN 1 ELSE 0 END) AS watched_count,
  AVG(rating::NUMERIC) AS avg_rating
FROM user_titles
WHERE user_id = 1;

-- 2) Recent watched list
SELECT t.title, t.title_type, ut.rating, ut.watched_at
FROM user_titles ut
INNER JOIN titles t ON ut.title_id = t.title_id
WHERE ut.user_id = 1 AND ut.status = 'watched'
ORDER BY ut.watched_at DESC
LIMIT 5;

-- 3) Most watched genre
SELECT g.name, COUNT(*) AS count
FROM user_titles ut
INNER JOIN title_genres tg ON ut.title_id = tg.title_id
INNER JOIN genres g ON tg.genre_id = g.genre_id
WHERE ut.user_id = 1 AND ut.status = 'watched'
GROUP BY g.name
ORDER BY COUNT(*) DESC
LIMIT 1;
