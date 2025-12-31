const express = require('express');
const fetch = require('node-fetch');
const { getPool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function getApiKey() {
  return process.env.TMDB_API_KEY;
}

async function tmdbRequest(path, params = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('TMDB API key is missing.');
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    language: 'en-US',
    include_adult: 'false',
    ...params
  });

  url.search = searchParams.toString();

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB error ${response.status}`);
  }

  return response.json();
}

function mapTmdbItem(item) {
  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const title = mediaType === 'tv' ? item.name : item.title;
  const date = mediaType === 'tv' ? item.first_air_date : item.release_date;
  const year = date ? parseInt(date.slice(0, 4), 10) : 0;
  const posterPath = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : null;

  return {
    TmdbId: item.id,
    TmdbType: mediaType,
    Title: title,
    TitleType: mediaType === 'tv' ? 'Series' : 'Movie',
    ReleaseYear: year,
    PosterPath: posterPath
  };
}

router.get('/search', auth, async (req, res, next) => {
  try {
    const query = String(req.query.query || req.query.search || '').trim();
    const type = String(req.query.type || 'all').toLowerCase();
    const year = parseInt(req.query.year || '0', 10);

    if (!query) {
      return res.status(400).json({ message: 'Search query is required.' });
    }

    let endpoint = '/search/multi';
    const params = { query, page: '1' };

    if (type === 'movie') {
      endpoint = '/search/movie';
      if (year) {
        params.year = year;
      }
    } else if (type === 'tv') {
      endpoint = '/search/tv';
      if (year) {
        params.first_air_date_year = year;
      }
    }

    const data = await tmdbRequest(endpoint, params);
    const items = (data.results || [])
      .filter((item) => {
        if (endpoint !== '/search/multi') {
          return true;
        }
        return item.media_type === 'movie' || item.media_type === 'tv';
      })
      .map(mapTmdbItem);

    return res.json({ items });
  } catch (err) {
    return next(err);
  }
});

router.post('/import', auth, async (req, res, next) => {
  const tmdbId = parseInt(req.body.tmdbId || '0', 10);
  const tmdbType = String(req.body.tmdbType || '').toLowerCase();
  const status = req.body.status === 'watched' ? 'watched' : 'watchlist';

  if (!tmdbId || !['movie', 'tv'].includes(tmdbType)) {
    return res.status(400).json({ message: 'Invalid TMDB payload.' });
  }

  try {
    const details = await tmdbRequest(`/${tmdbType}/${tmdbId}`, {});
    const title = tmdbType === 'tv' ? details.name : details.title;
    const date = tmdbType === 'tv' ? details.first_air_date : details.release_date;
    const year = date ? parseInt(date.slice(0, 4), 10) : new Date().getFullYear();
    const posterPath = details.poster_path
      ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
      : null;
    const genres = (details.genres || []).map((genre) => genre.name).filter(Boolean);

    const pool = await getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existingTitle = await client.query(
        'SELECT title_id FROM titles WHERE tmdb_id = $1 AND tmdb_type = $2',
        [tmdbId, tmdbType]
      );

      let titleId = existingTitle.rows[0]?.title_id;

      if (!titleId) {
        const inserted = await client.query(
          `INSERT INTO titles (title, title_type, release_year, poster_path, tmdb_id, tmdb_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING title_id`,
          [title, tmdbType === 'tv' ? 'Series' : 'Movie', year, posterPath, tmdbId, tmdbType]
        );
        titleId = inserted.rows[0].title_id;

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
      }

      const existingUserTitle = await client.query(
        'SELECT user_title_id FROM user_titles WHERE user_id = $1 AND title_id = $2',
        [req.user.userId, titleId]
      );

      if (existingUserTitle.rowCount > 0) {
        await client.query('COMMIT');
        return res.json({
          titleId,
          userTitleId: existingUserTitle.rows[0].user_title_id,
          existed: true
        });
      }

      const userInsert = await client.query(
        `INSERT INTO user_titles (user_id, title_id, status)
         VALUES ($1, $2, $3)
         RETURNING user_title_id`,
        [req.user.userId, titleId, status]
      );

      await client.query('COMMIT');
      return res.status(201).json({
        titleId,
        userTitleId: userInsert.rows[0].user_title_id,
        existed: false
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
