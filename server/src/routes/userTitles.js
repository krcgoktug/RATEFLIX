const express = require('express');
const { getPool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const favorite = String(req.query.favorite || '').trim().toLowerCase() === 'true';
    const titleId = parseInt(req.query.titleId || '0', 10);

    const pool = await getPool();
    const result = await pool.query(
      `SELECT
         ut.user_title_id AS "UserTitleId",
         ut.status AS "Status",
         ut.rating AS "Rating",
         ut.review AS "Review",
         ut.watched_at AS "WatchedAt",
         ut.is_favorite AS "IsFavorite",
         ut.added_at AS "AddedAt",
         t.title_id AS "TitleId",
         t.title AS "Title",
         t.title_type AS "TitleType",
         t.release_year AS "ReleaseYear",
         t.poster_path AS "PosterPath",
         STRING_AGG(g.name, ', ') AS "Genres"
       FROM user_titles ut
       INNER JOIN titles t ON ut.title_id = t.title_id
       LEFT JOIN title_genres tg ON tg.title_id = t.title_id
       LEFT JOIN genres g ON g.genre_id = tg.genre_id
       WHERE ut.user_id = $1
         AND ($2 = '' OR ut.status = $2)
         AND ($3 = false OR ut.is_favorite = true)
         AND ($4 = 0 OR ut.title_id = $4)
       GROUP BY ut.user_title_id, ut.status, ut.rating, ut.review, ut.watched_at, ut.is_favorite, ut.added_at,
                t.title_id, t.title, t.title_type, t.release_year, t.poster_path
       ORDER BY ut.added_at DESC`,
      [req.user.userId, status, favorite, Number.isNaN(titleId) ? 0 : titleId]
    );

    return res.json({ items: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const titleId = parseInt(req.body.titleId || '0', 10);
    const status = String(req.body.status || 'watchlist').trim();
    const rating = req.body.rating ? parseInt(req.body.rating, 10) : null;
    const review = String(req.body.review || '').trim();
    const watchedAt = String(req.body.watchedAt || '').trim();
    const isFavorite = String(req.body.isFavorite || 'false').toLowerCase() === 'true';

    if (Number.isNaN(titleId) || titleId <= 0) {
      return res.status(400).json({ message: 'Invalid title id.' });
    }

    const normalizedStatus = status === 'watched' ? 'watched' : 'watchlist';
    const watchedDateValue = normalizedStatus === 'watched'
      ? (watchedAt ? new Date(watchedAt) : new Date())
      : null;

    const pool = await getPool();

    const exists = await pool.query(
      'SELECT user_title_id FROM user_titles WHERE user_id = $1 AND title_id = $2',
      [req.user.userId, titleId]
    );

    if (exists.rowCount > 0) {
      return res.status(409).json({ message: 'Title already in your list.' });
    }

    const inserted = await pool.query(
      `INSERT INTO user_titles (user_id, title_id, status, rating, review, watched_at, is_favorite)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_title_id AS "UserTitleId"`,
      [
        req.user.userId,
        titleId,
        normalizedStatus,
        rating,
        review || null,
        watchedDateValue,
        isFavorite
      ]
    );

    return res.status(201).json({ userTitleId: inserted.rows[0].UserTitleId });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user title id.' });
    }

    const status = String(req.body.status || '').trim();
    const rating = req.body.rating ? parseInt(req.body.rating, 10) : null;
    const review = String(req.body.review || '').trim();
    const watchedAt = String(req.body.watchedAt || '').trim();
    const isFavorite = typeof req.body.isFavorite !== 'undefined'
      ? String(req.body.isFavorite).toLowerCase() === 'true'
      : null;

    const normalizedStatus = status === 'watched' ? 'watched' : (status === 'watchlist' ? 'watchlist' : null);
    const watchedDateValue = normalizedStatus === 'watched'
      ? (watchedAt ? new Date(watchedAt) : new Date())
      : null;

    const pool = await getPool();
    await pool.query(
      `UPDATE user_titles
       SET
         status = COALESCE($3, status),
         rating = COALESCE($4, rating),
         review = COALESCE($5, review),
         watched_at = CASE
           WHEN $3 = 'watched' THEN $6
           ELSE watched_at
         END,
         is_favorite = COALESCE($7, is_favorite),
         updated_at = NOW()
       WHERE user_title_id = $1 AND user_id = $2`,
      [
        id,
        req.user.userId,
        normalizedStatus,
        rating,
        review || null,
        watchedDateValue,
        isFavorite
      ]
    );

    return res.json({ message: 'Updated.' });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user title id.' });
    }

    const pool = await getPool();
    await pool.query('DELETE FROM user_titles WHERE user_title_id = $1 AND user_id = $2', [
      id,
      req.user.userId
    ]);

    return res.json({ message: 'Removed.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
