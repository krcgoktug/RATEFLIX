const express = require('express');
const fetch = require('node-fetch');
const { sql, getPool } = require('../db');
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
  try {
    const tmdbId = parseInt(req.body.tmdbId || '0', 10);
    const tmdbType = String(req.body.tmdbType || '').toLowerCase();
    const status = req.body.status === 'watched' ? 'watched' : 'watchlist';

    if (!tmdbId || !['movie', 'tv'].includes(tmdbType)) {
      return res.status(400).json({ message: 'Invalid TMDB payload.' });
    }

    const details = await tmdbRequest(`/${tmdbType}/${tmdbId}`, {});
    const title = tmdbType === 'tv' ? details.name : details.title;
    const date = tmdbType === 'tv' ? details.first_air_date : details.release_date;
    const year = date ? parseInt(date.slice(0, 4), 10) : new Date().getFullYear();
    const posterPath = details.poster_path
      ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
      : null;
    const genres = (details.genres || []).map((genre) => genre.name).filter(Boolean);

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const existingTitle = await new sql.Request(transaction)
        .input('tmdbId', sql.Int, tmdbId)
        .input('tmdbType', sql.NVarChar, tmdbType)
        .query('SELECT TitleId FROM Titles WHERE TmdbId = @tmdbId AND TmdbType = @tmdbType');

      let titleId = existingTitle.recordset[0]?.TitleId;

      if (!titleId) {
        const inserted = await new sql.Request(transaction)
          .input('title', sql.NVarChar, title)
          .input('type', sql.NVarChar, tmdbType === 'tv' ? 'Series' : 'Movie')
          .input('year', sql.Int, year)
          .input('posterPath', sql.NVarChar, posterPath)
          .input('tmdbId', sql.Int, tmdbId)
          .input('tmdbType', sql.NVarChar, tmdbType)
          .query(
            `INSERT INTO Titles (Title, TitleType, ReleaseYear, PosterPath, TmdbId, TmdbType)
             OUTPUT INSERTED.TitleId
             VALUES (@title, @type, @year, @posterPath, @tmdbId, @tmdbType)`
          );
        titleId = inserted.recordset[0].TitleId;

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
      }

      const existingUserTitle = await new sql.Request(transaction)
        .input('userId', sql.Int, req.user.userId)
        .input('titleId', sql.Int, titleId)
        .query('SELECT UserTitleId FROM UserTitles WHERE UserId = @userId AND TitleId = @titleId');

      if (existingUserTitle.recordset.length > 0) {
        await transaction.commit();
        return res.json({
          titleId,
          userTitleId: existingUserTitle.recordset[0].UserTitleId,
          existed: true
        });
      }

      const userInsert = await new sql.Request(transaction)
        .input('userId', sql.Int, req.user.userId)
        .input('titleId', sql.Int, titleId)
        .input('status', sql.NVarChar, status)
        .query(
          `INSERT INTO UserTitles (UserId, TitleId, Status)
           OUTPUT INSERTED.UserTitleId
           VALUES (@userId, @titleId, @status)`
        );

      await transaction.commit();
      return res.status(201).json({
        titleId,
        userTitleId: userInsert.recordset[0].UserTitleId,
        existed: false
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
