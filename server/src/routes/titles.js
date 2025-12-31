const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getPool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed.'));
    }
    return cb(null, true);
  }
});

function parseGenres(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((g) => String(g).trim()).filter(Boolean);
  const text = String(value).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((g) => String(g).trim()).filter(Boolean);
    }
  } catch (err) {
    // fallback below
  }
  return text.split(',').map((g) => g.trim()).filter(Boolean);
}

router.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const type = String(req.query.type || '').trim();
    const year = parseInt(req.query.year || '0', 10);
    const genre = String(req.query.genre || '').trim();

    const pool = await getPool();
    const result = await pool.query(
      `SELECT
         t.title_id AS "TitleId",
         t.title AS "Title",
         t.title_type AS "TitleType",
         t.release_year AS "ReleaseYear",
         t.poster_path AS "PosterPath",
         STRING_AGG(g.name, ', ') AS "Genres"
       FROM titles t
       LEFT JOIN title_genres tg ON tg.title_id = t.title_id
       LEFT JOIN genres g ON g.genre_id = tg.genre_id
       WHERE ($1 = '' OR t.title ILIKE '%' || $1 || '%')
         AND ($2 = '' OR t.title_type = $2)
         AND ($3 = 0 OR t.release_year = $3)
         AND ($4 = '' OR g.name = $4)
       GROUP BY t.title_id, t.title, t.title_type, t.release_year, t.poster_path
       ORDER BY t.title ASC`,
      [search, type, Number.isNaN(year) ? 0 : year, genre]
    );

    return res.json({ items: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid title id.' });
    }

    const pool = await getPool();
    const result = await pool.query(
      `SELECT
         t.title_id AS "TitleId",
         t.title AS "Title",
         t.title_type AS "TitleType",
         t.release_year AS "ReleaseYear",
         t.poster_path AS "PosterPath",
         STRING_AGG(g.name, ', ') AS "Genres"
       FROM titles t
       LEFT JOIN title_genres tg ON tg.title_id = t.title_id
       LEFT JOIN genres g ON g.genre_id = tg.genre_id
       WHERE t.title_id = $1
       GROUP BY t.title_id, t.title, t.title_type, t.release_year, t.poster_path`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Title not found.' });
    }

    return res.json({ item: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.post('/', auth, upload.single('poster'), async (req, res, next) => {
  const title = String(req.body.title || '').trim();
  const type = String(req.body.type || '').trim();
  const year = parseInt(req.body.year || '0', 10);
  const status = String(req.body.status || 'watchlist').trim();
  const rating = req.body.rating ? parseInt(req.body.rating, 10) : null;
  const review = String(req.body.review || '').trim();
  const watchedAt = String(req.body.watchedAt || '').trim();
  const isFavorite = String(req.body.isFavorite || 'false').toLowerCase() === 'true';
  const genres = parseGenres(req.body.genres);

  if (!title || !type || Number.isNaN(year) || year < 1900) {
    return res.status(400).json({ message: 'Missing or invalid title data.' });
  }

  const normalizedStatus = status === 'watched' ? 'watched' : 'watchlist';
  const posterPath = req.file ? `/uploads/${req.file.filename}` : null;

  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const titleInsert = await client.query(
      `INSERT INTO titles (title, title_type, release_year, poster_path)
       VALUES ($1, $2, $3, $4)
       RETURNING title_id`,
      [title, type, year, posterPath]
    );

    const titleId = titleInsert.rows[0].title_id;

    for (const name of genres) {
      const genreInsert = await client.query(
        `INSERT INTO genres (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING genre_id`,
        [name]
      );
      const genreId = genreInsert.rows[0].genre_id;
      await client.query(
        `INSERT INTO title_genres (title_id, genre_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [titleId, genreId]
      );
    }

    const watchedDateValue = normalizedStatus === 'watched'
      ? (watchedAt ? new Date(watchedAt) : new Date())
      : null;

    await client.query(
      `INSERT INTO user_titles (user_id, title_id, status, rating, review, watched_at, is_favorite)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
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

    await client.query('COMMIT');
    return res.status(201).json({ titleId });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
