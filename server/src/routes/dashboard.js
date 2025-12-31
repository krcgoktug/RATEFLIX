const express = require('express');
const { getPool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();

    const summaryResult = await pool.query(
      `SELECT
         COUNT(*) AS "TotalTitles",
         SUM(CASE WHEN ut.status = 'watchlist' THEN 1 ELSE 0 END) AS "WatchlistCount",
         SUM(CASE WHEN ut.status = 'watched' THEN 1 ELSE 0 END) AS "WatchedCount",
         AVG(ut.rating::float) AS "AvgRating"
       FROM user_titles ut
       WHERE ut.user_id = $1`,
      [req.user.userId]
    );

    const typeCounts = await pool.query(
      `SELECT
         SUM(CASE WHEN t.title_type = 'Movie' THEN 1 ELSE 0 END) AS "MoviesCount",
         SUM(CASE WHEN t.title_type = 'Series' THEN 1 ELSE 0 END) AS "SeriesCount"
       FROM user_titles ut
       INNER JOIN titles t ON ut.title_id = t.title_id
       WHERE ut.user_id = $1`,
      [req.user.userId]
    );

    const recent = await pool.query(
      `SELECT
         t.title_id AS "TitleId",
         t.title AS "Title",
         t.title_type AS "TitleType",
         t.release_year AS "ReleaseYear",
         t.poster_path AS "PosterPath",
         ut.rating AS "Rating",
         ut.watched_at AS "WatchedAt"
       FROM user_titles ut
       INNER JOIN titles t ON ut.title_id = t.title_id
       WHERE ut.user_id = $1 AND ut.status = 'watched'
       ORDER BY ut.watched_at DESC NULLS LAST, ut.updated_at DESC
       LIMIT 5`,
      [req.user.userId]
    );

    const featured = await pool.query(
      `SELECT
         t.title_id AS "TitleId",
         t.title AS "Title",
         t.title_type AS "TitleType",
         t.release_year AS "ReleaseYear",
         t.poster_path AS "PosterPath",
         ut.rating AS "Rating"
       FROM user_titles ut
       INNER JOIN titles t ON ut.title_id = t.title_id
       WHERE ut.user_id = $1
       ORDER BY ut.rating DESC NULLS LAST, ut.updated_at DESC
       LIMIT 1`,
      [req.user.userId]
    );

    const summary = summaryResult.rows[0] || {};
    const types = typeCounts.rows[0] || {};

    return res.json({
      summary: {
        totalTitles: summary.TotalTitles || 0,
        watchlistCount: summary.WatchlistCount || 0,
        watchedCount: summary.WatchedCount || 0,
        avgRating: summary.AvgRating ? Number(Number(summary.AvgRating).toFixed(1)) : 0,
        moviesCount: types.MoviesCount || 0,
        seriesCount: types.SeriesCount || 0
      },
      recent: recent.rows,
      featured: featured.rows[0] || null
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/profile', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.query(
      `SELECT g.name AS "Name", COUNT(*) AS "Count"
       FROM user_titles ut
       INNER JOIN title_genres tg ON ut.title_id = tg.title_id
       INNER JOIN genres g ON g.genre_id = tg.genre_id
       WHERE ut.user_id = $1 AND ut.status = 'watched'
       GROUP BY g.name
       ORDER BY COUNT(*) DESC
       LIMIT 1`,
      [req.user.userId]
    );

    return res.json({ topGenre: result.rows[0] || null });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
