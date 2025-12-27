const express = require('express');
const { sql, getPool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();

    const summaryResult = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .query(
        `SELECT
           COUNT(*) AS TotalTitles,
           SUM(CASE WHEN ut.Status = 'watchlist' THEN 1 ELSE 0 END) AS WatchlistCount,
           SUM(CASE WHEN ut.Status = 'watched' THEN 1 ELSE 0 END) AS WatchedCount,
           AVG(CAST(ut.Rating AS FLOAT)) AS AvgRating
         FROM UserTitles ut
         WHERE ut.UserId = @userId`
      );

    const typeCounts = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .query(
        `SELECT
           SUM(CASE WHEN t.TitleType = 'Movie' THEN 1 ELSE 0 END) AS MoviesCount,
           SUM(CASE WHEN t.TitleType = 'Series' THEN 1 ELSE 0 END) AS SeriesCount
         FROM UserTitles ut
         INNER JOIN Titles t ON ut.TitleId = t.TitleId
         WHERE ut.UserId = @userId`
      );

    const recent = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .query(
        `SELECT TOP 5
           t.TitleId,
           t.Title,
           t.TitleType,
           t.ReleaseYear,
           t.PosterPath,
           ut.Rating,
           ut.WatchedAt
         FROM UserTitles ut
         INNER JOIN Titles t ON ut.TitleId = t.TitleId
         WHERE ut.UserId = @userId AND ut.Status = 'watched'
         ORDER BY ut.WatchedAt DESC, ut.UpdatedAt DESC`
      );

    const featured = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .query(
        `SELECT TOP 1
           t.TitleId,
           t.Title,
           t.TitleType,
           t.ReleaseYear,
           t.PosterPath,
           ut.Rating
         FROM UserTitles ut
         INNER JOIN Titles t ON ut.TitleId = t.TitleId
         WHERE ut.UserId = @userId
         ORDER BY ut.Rating DESC, ut.UpdatedAt DESC`
      );

    const summary = summaryResult.recordset[0] || {};
    const types = typeCounts.recordset[0] || {};

    return res.json({
      summary: {
        totalTitles: summary.TotalTitles || 0,
        watchlistCount: summary.WatchlistCount || 0,
        watchedCount: summary.WatchedCount || 0,
        avgRating: summary.AvgRating ? Number(summary.AvgRating.toFixed(1)) : 0,
        moviesCount: types.MoviesCount || 0,
        seriesCount: types.SeriesCount || 0
      },
      recent: recent.recordset,
      featured: featured.recordset[0] || null
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/profile', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .query(
        `SELECT TOP 1 g.Name, COUNT(*) AS Count
         FROM UserTitles ut
         INNER JOIN TitleGenres tg ON ut.TitleId = tg.TitleId
         INNER JOIN Genres g ON g.GenreId = tg.GenreId
         WHERE ut.UserId = @userId AND ut.Status = 'watched'
         GROUP BY g.Name
         ORDER BY COUNT(*) DESC`
      );

    return res.json({ topGenre: result.recordset[0] || null });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;