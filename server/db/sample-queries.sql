-- Example queries for the report
-- 1) Dashboard summary
SELECT
  COUNT(*) AS TotalTitles,
  SUM(CASE WHEN Status = 'watchlist' THEN 1 ELSE 0 END) AS WatchlistCount,
  SUM(CASE WHEN Status = 'watched' THEN 1 ELSE 0 END) AS WatchedCount,
  AVG(CAST(Rating AS FLOAT)) AS AvgRating
FROM dbo.UserTitles
WHERE UserId = 1;

-- 2) Recent watched list
SELECT TOP 5 t.Title, t.TitleType, ut.Rating, ut.WatchedAt
FROM dbo.UserTitles ut
INNER JOIN dbo.Titles t ON ut.TitleId = t.TitleId
WHERE ut.UserId = 1 AND ut.Status = 'watched'
ORDER BY ut.WatchedAt DESC;

-- 3) Most watched genre
SELECT TOP 1 g.Name, COUNT(*) AS Count
FROM dbo.UserTitles ut
INNER JOIN dbo.TitleGenres tg ON ut.TitleId = tg.TitleId
INNER JOIN dbo.Genres g ON tg.GenreId = g.GenreId
WHERE ut.UserId = 1 AND ut.Status = 'watched'
GROUP BY g.Name
ORDER BY COUNT(*) DESC;