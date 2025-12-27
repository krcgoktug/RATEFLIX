const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sql, getPool } = require('../db');
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
    const request = pool.request();
    request.input('search', sql.NVarChar, search);
    request.input('type', sql.NVarChar, type);
    request.input('year', sql.Int, Number.isNaN(year) ? 0 : year);
    request.input('genre', sql.NVarChar, genre);

    const result = await request.query(
      `SELECT
         t.TitleId,
         t.Title,
         t.TitleType,
         t.ReleaseYear,
         t.PosterPath,
         STRING_AGG(g.Name, ', ') AS Genres
       FROM Titles t
       LEFT JOIN TitleGenres tg ON tg.TitleId = t.TitleId
       LEFT JOIN Genres g ON g.GenreId = tg.GenreId
       WHERE (@search = '' OR t.Title LIKE '%' + @search + '%')
         AND (@type = '' OR t.TitleType = @type)
         AND (@year = 0 OR t.ReleaseYear = @year)
         AND (@genre = '' OR g.Name = @genre)
       GROUP BY t.TitleId, t.Title, t.TitleType, t.ReleaseYear, t.PosterPath
       ORDER BY t.Title ASC`
    );

    return res.json({ items: result.recordset });
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
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(
        `SELECT
           t.TitleId,
           t.Title,
           t.TitleType,
           t.ReleaseYear,
           t.PosterPath,
           STRING_AGG(g.Name, ', ') AS Genres
         FROM Titles t
         LEFT JOIN TitleGenres tg ON tg.TitleId = t.TitleId
         LEFT JOIN Genres g ON g.GenreId = tg.GenreId
         WHERE t.TitleId = @id
         GROUP BY t.TitleId, t.Title, t.TitleType, t.ReleaseYear, t.PosterPath`
      );

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Title not found.' });
    }

    return res.json({ item: result.recordset[0] });
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

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const titleInsert = await new sql.Request(transaction)
        .input('title', sql.NVarChar, title)
        .input('type', sql.NVarChar, type)
        .input('year', sql.Int, year)
        .input('posterPath', sql.NVarChar, posterPath)
        .query(
          `INSERT INTO Titles (Title, TitleType, ReleaseYear, PosterPath)
           OUTPUT INSERTED.TitleId
           VALUES (@title, @type, @year, @posterPath)`
        );

      const titleId = titleInsert.recordset[0].TitleId;

      for (const name of genres) {
        const genreCheck = await new sql.Request(transaction)
          .input('name', sql.NVarChar, name)
          .query('SELECT GenreId FROM Genres WHERE Name = @name');

        let genreId;
        if (genreCheck.recordset.length > 0) {
          genreId = genreCheck.recordset[0].GenreId;
        } else {
          const genreInsert = await new sql.Request(transaction)
            .input('name', sql.NVarChar, name)
            .query('INSERT INTO Genres (Name) OUTPUT INSERTED.GenreId VALUES (@name)');
          genreId = genreInsert.recordset[0].GenreId;
        }

        await new sql.Request(transaction)
          .input('titleId', sql.Int, titleId)
          .input('genreId', sql.Int, genreId)
          .query('INSERT INTO TitleGenres (TitleId, GenreId) VALUES (@titleId, @genreId)');
      }

      const watchedDateValue = normalizedStatus === 'watched'
        ? (watchedAt ? new Date(watchedAt) : new Date())
        : null;

      await new sql.Request(transaction)
        .input('userId', sql.Int, req.user.userId)
        .input('titleId', sql.Int, titleId)
        .input('status', sql.NVarChar, normalizedStatus)
        .input('rating', sql.Int, rating)
        .input('review', sql.NVarChar, review || null)
        .input('watchedAt', sql.Date, watchedDateValue)
        .input('isFavorite', sql.Bit, isFavorite)
        .query(
          `INSERT INTO UserTitles (UserId, TitleId, Status, Rating, Review, WatchedAt, IsFavorite)
           VALUES (@userId, @titleId, @status, @rating, @review, @watchedAt, @isFavorite)`
        );

      await transaction.commit();
      return res.status(201).json({ titleId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    return next(err);
  }
});

module.exports = router;