const express = require('express');
const { getPool } = require('../db');
const auth = require('../middleware/auth');
const { createAssistantReply } = require('../services/aiAssistant');

const router = express.Router();

function parsePositiveInt(value, fallback, max = 100) {
  const parsed = parseInt(String(value || ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function normalizeMessages(messages, fallbackMessage) {
  const maxHistory = parsePositiveInt(process.env.AI_MAX_HISTORY, 8, 20);
  const input = Array.isArray(messages) ? messages : [];
  const normalized = input
    .map((item) => {
      const role = item?.role === 'assistant' ? 'assistant' : (item?.role === 'user' ? 'user' : null);
      const content = String(item?.content || '').trim();
      if (!role || !content) return null;
      return { role, content: content.slice(0, 1600) };
    })
    .filter(Boolean);

  if (normalized.length === 0 && fallbackMessage) {
    normalized.push({ role: 'user', content: String(fallbackMessage).trim().slice(0, 1600) });
  }

  return normalized.slice(-maxHistory);
}

async function loadTasteProfile(userId) {
  const pool = await getPool();
  const maxContextTitles = parsePositiveInt(process.env.AI_MAX_CONTEXT_TITLES, 24, 60);

  const [userResult, statsResult, genresResult, titlesResult] = await Promise.all([
    pool.query(
      `SELECT first_name AS "FirstName"
       FROM users
       WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT
         COUNT(*) AS "TotalTitles",
         SUM(CASE WHEN status = 'watched' THEN 1 ELSE 0 END) AS "WatchedCount",
         SUM(CASE WHEN status = 'watchlist' THEN 1 ELSE 0 END) AS "WatchlistCount",
         SUM(CASE WHEN is_favorite = true THEN 1 ELSE 0 END) AS "FavoriteCount",
         AVG(rating::float) AS "AvgRating"
       FROM user_titles
       WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT g.name AS "Name", COUNT(*) AS "Count"
       FROM user_titles ut
       INNER JOIN title_genres tg ON ut.title_id = tg.title_id
       INNER JOIN genres g ON g.genre_id = tg.genre_id
       WHERE ut.user_id = $1
         AND (ut.status = 'watched' OR ut.is_favorite = true)
       GROUP BY g.name
       ORDER BY COUNT(*) DESC, g.name ASC
       LIMIT 6`,
      [userId]
    ),
    pool.query(
      `SELECT
         ut.status AS "Status",
         ut.rating AS "Rating",
         ut.is_favorite AS "IsFavorite",
         ut.watched_at AS "WatchedAt",
         ut.updated_at AS "UpdatedAt",
         t.title_id AS "TitleId",
         t.title AS "Title",
         t.title_type AS "TitleType",
         t.release_year AS "ReleaseYear",
         COALESCE(STRING_AGG(g.name, ', ' ORDER BY g.name), '') AS "Genres"
       FROM user_titles ut
       INNER JOIN titles t ON ut.title_id = t.title_id
       LEFT JOIN title_genres tg ON tg.title_id = t.title_id
       LEFT JOIN genres g ON g.genre_id = tg.genre_id
       WHERE ut.user_id = $1
       GROUP BY
         ut.status, ut.rating, ut.is_favorite, ut.watched_at, ut.updated_at,
         t.title_id, t.title, t.title_type, t.release_year
       ORDER BY
         ut.is_favorite DESC,
         ut.rating DESC NULLS LAST,
         ut.watched_at DESC NULLS LAST,
         ut.updated_at DESC
       LIMIT $2`,
      [userId, maxContextTitles]
    )
  ]);

  const stats = statsResult.rows[0] || {};
  const allTitles = titlesResult.rows || [];

  return {
    firstName: userResult.rows[0]?.FirstName || 'User',
    summary: {
      totalTitles: Number(stats.TotalTitles || 0),
      watchedCount: Number(stats.WatchedCount || 0),
      watchlistCount: Number(stats.WatchlistCount || 0),
      favoriteCount: Number(stats.FavoriteCount || 0),
      avgRating: stats.AvgRating ? Number(Number(stats.AvgRating).toFixed(1)) : 0
    },
    topGenres: genresResult.rows.map((row) => row.Name),
    allTitles,
    favorites: allTitles.filter((item) => item.IsFavorite),
    watched: allTitles.filter((item) => item.Status === 'watched'),
    watchlist: allTitles.filter((item) => item.Status === 'watchlist')
  };
}

router.post('/chat', auth, async (req, res, next) => {
  try {
    const messages = normalizeMessages(req.body?.messages, req.body?.message);
    if (messages.length === 0) {
      return res.status(400).json({ message: 'Please enter a message.' });
    }

    const hasUserMessage = messages.some((item) => item.role === 'user');
    if (!hasUserMessage) {
      return res.status(400).json({ message: 'A user message is required.' });
    }

    const profile = await loadTasteProfile(req.user.userId);
    const result = await createAssistantReply({ messages, profile });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
