const express = require('express');
const { sql, getPool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const favorite = String(req.query.favorite || '').trim().toLowerCase() === 'true';
    const titleId = parseInt(req.query.titleId || '0', 10);

    const pool = await getPool();
    const request = pool.request();
    request.input('userId', sql.Int, req.user.userId);
    request.input('status', sql.NVarChar, status);
    request.input('favorite', sql.Bit, favorite ? 1 : 0);
    request.input('titleId', sql.Int, Number.isNaN(titleId) ? 0 : titleId);

    const result = await request.query(
      `SELECT
         ut.UserTitleId,
         ut.Status,
         ut.Rating,
         ut.Review,
         ut.WatchedAt,
         ut.IsFavorite,
         ut.AddedAt,
         t.TitleId,
         t.Title,
         t.TitleType,
         t.ReleaseYear,
         t.PosterPath,
         STRING_AGG(g.Name, ', ') AS Genres
       FROM UserTitles ut
       INNER JOIN Titles t ON ut.TitleId = t.TitleId
       LEFT JOIN TitleGenres tg ON tg.TitleId = t.TitleId
       LEFT JOIN Genres g ON g.GenreId = tg.GenreId
       WHERE ut.UserId = @userId
         AND (@status = '' OR ut.Status = @status)
         AND (@favorite = 0 OR ut.IsFavorite = 1)
         AND (@titleId = 0 OR ut.TitleId = @titleId)
       GROUP BY ut.UserTitleId, ut.Status, ut.Rating, ut.Review, ut.WatchedAt, ut.IsFavorite, ut.AddedAt,
                t.TitleId, t.Title, t.TitleType, t.ReleaseYear, t.PosterPath
       ORDER BY ut.AddedAt DESC`
    );

    return res.json({ items: result.recordset });
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

    const exists = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .input('titleId', sql.Int, titleId)
      .query('SELECT UserTitleId FROM UserTitles WHERE UserId = @userId AND TitleId = @titleId');

    if (exists.recordset.length > 0) {
      return res.status(409).json({ message: 'Title already in your list.' });
    }

    const inserted = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .input('titleId', sql.Int, titleId)
      .input('status', sql.NVarChar, normalizedStatus)
      .input('rating', sql.Int, rating)
      .input('review', sql.NVarChar, review || null)
      .input('watchedAt', sql.Date, watchedDateValue)
      .input('isFavorite', sql.Bit, isFavorite)
      .query(
        `INSERT INTO UserTitles (UserId, TitleId, Status, Rating, Review, WatchedAt, IsFavorite)
         OUTPUT INSERTED.UserTitleId
         VALUES (@userId, @titleId, @status, @rating, @review, @watchedAt, @isFavorite)`
      );

    return res.status(201).json({ userTitleId: inserted.recordset[0].UserTitleId });
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
    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('userId', sql.Int, req.user.userId);
    request.input('status', sql.NVarChar, normalizedStatus);
    request.input('rating', sql.Int, rating);
    request.input('review', sql.NVarChar, review || null);
    request.input('watchedAt', sql.Date, watchedDateValue);
    request.input('isFavorite', sql.Bit, isFavorite);

    await request.query(
      `UPDATE UserTitles
       SET
         Status = COALESCE(@status, Status),
         Rating = COALESCE(@rating, Rating),
         Review = COALESCE(@review, Review),
         WatchedAt = CASE
           WHEN @status = 'watched' THEN @watchedAt
           ELSE WatchedAt
         END,
         IsFavorite = COALESCE(@isFavorite, IsFavorite),
         UpdatedAt = SYSUTCDATETIME()
       WHERE UserTitleId = @id AND UserId = @userId`
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
    await pool
      .request()
      .input('id', sql.Int, id)
      .input('userId', sql.Int, req.user.userId)
      .query('DELETE FROM UserTitles WHERE UserTitleId = @id AND UserId = @userId');

    return res.json({ message: 'Removed.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;