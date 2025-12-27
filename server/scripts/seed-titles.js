require('dotenv').config();

const { sql, getPool } = require('../src/db');

const genres = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Drama',
  'Fantasy',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller'
];

const titles = [
  {
    title: 'Spider-Man: Across the Spider-Verse',
    aliases: ['Across the Spider-Verse'],
    type: 'Movie',
    year: 2023,
    posterPath: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    tmdbId: 569094,
    tmdbType: 'movie',
    genres: ['Animation', 'Action', 'Adventure', 'Sci-Fi']
  },
  {
    title: 'Interstellar',
    type: 'Movie',
    year: 2014,
    posterPath: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    tmdbId: 157336,
    tmdbType: 'movie',
    genres: ['Drama', 'Sci-Fi', 'Adventure']
  },
  {
    title: 'Stranger Things',
    type: 'Series',
    year: 2016,
    posterPath: 'https://image.tmdb.org/t/p/w500/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg',
    tmdbId: 66732,
    tmdbType: 'tv',
    genres: ['Drama', 'Sci-Fi', 'Mystery']
  },
  {
    title: 'Dune: Part Two',
    type: 'Movie',
    year: 2024,
    posterPath: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    tmdbId: 693134,
    tmdbType: 'movie',
    genres: ['Sci-Fi', 'Adventure', 'Action']
  },
  {
    title: 'The Dark Knight',
    type: 'Movie',
    year: 2008,
    posterPath: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    tmdbId: 155,
    tmdbType: 'movie',
    genres: ['Action', 'Crime', 'Drama', 'Thriller']
  },
  {
    title: 'Oppenheimer',
    type: 'Movie',
    year: 2023,
    posterPath: 'https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg',
    tmdbId: 872585,
    tmdbType: 'movie',
    genres: ['Drama', 'Thriller']
  },
  {
    title: 'Avatar: The Way of Water',
    type: 'Movie',
    year: 2022,
    posterPath: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
    tmdbId: 76600,
    tmdbType: 'movie',
    genres: ['Adventure', 'Sci-Fi', 'Action']
  },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    type: 'Movie',
    year: 2001,
    posterPath: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
    tmdbId: 120,
    tmdbType: 'movie',
    genres: ['Adventure', 'Fantasy', 'Action']
  },
  {
    title: 'Breaking Bad',
    type: 'Series',
    year: 2008,
    posterPath: 'https://image.tmdb.org/t/p/w500/3xnWaLQjelJDDF7LT1WBo6f4BRe.jpg',
    tmdbId: 1396,
    tmdbType: 'tv',
    genres: ['Crime', 'Drama', 'Thriller']
  },
  {
    title: 'The Last of Us',
    type: 'Series',
    year: 2023,
    posterPath: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
    tmdbId: 100088,
    tmdbType: 'tv',
    genres: ['Drama', 'Action', 'Adventure']
  },
  {
    title: 'Arcane',
    type: 'Series',
    year: 2021,
    posterPath: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    tmdbId: 94605,
    tmdbType: 'tv',
    genres: ['Animation', 'Action', 'Adventure']
  },
  {
    title: 'The Mandalorian',
    type: 'Series',
    year: 2019,
    posterPath: 'https://image.tmdb.org/t/p/w500/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg',
    tmdbId: 82856,
    tmdbType: 'tv',
    genres: ['Action', 'Adventure', 'Sci-Fi']
  },
  {
    title: 'Your Name',
    type: 'Movie',
    year: 2016,
    posterPath: 'https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg',
    tmdbId: 372058,
    tmdbType: 'movie',
    genres: ['Animation', 'Romance', 'Fantasy']
  },
  {
    title: 'The Matrix',
    type: 'Movie',
    year: 1999,
    posterPath: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    tmdbId: 603,
    tmdbType: 'movie',
    genres: ['Action', 'Sci-Fi', 'Thriller']
  },
  {
    title: 'Inception',
    type: 'Movie',
    year: 2010,
    posterPath: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    tmdbId: 27205,
    tmdbType: 'movie',
    genres: ['Action', 'Sci-Fi', 'Thriller']
  },
  {
    title: 'The Dark Knight Rises',
    type: 'Movie',
    year: 2012,
    posterPath: 'https://image.tmdb.org/t/p/w500/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg',
    tmdbId: 49026,
    tmdbType: 'movie',
    genres: ['Action', 'Crime', 'Drama']
  },
  {
    title: 'Joker',
    type: 'Movie',
    year: 2019,
    posterPath: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg',
    tmdbId: 475557,
    tmdbType: 'movie',
    genres: ['Crime', 'Drama', 'Thriller']
  },
  {
    title: 'Parasite',
    type: 'Movie',
    year: 2019,
    posterPath: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    tmdbId: 496243,
    tmdbType: 'movie',
    genres: ['Drama', 'Thriller']
  },
  {
    title: 'The Shawshank Redemption',
    type: 'Movie',
    year: 1994,
    posterPath: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    tmdbId: 278,
    tmdbType: 'movie',
    genres: ['Drama', 'Crime']
  },
  {
    title: 'Fight Club',
    type: 'Movie',
    year: 1999,
    posterPath: 'https://image.tmdb.org/t/p/w500/a26cQPRhJPX6GbWfQbvZdrrp9j9.jpg',
    tmdbId: 550,
    tmdbType: 'movie',
    genres: ['Drama', 'Thriller']
  },
  {
    title: 'Pulp Fiction',
    type: 'Movie',
    year: 1994,
    posterPath: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    tmdbId: 680,
    tmdbType: 'movie',
    genres: ['Crime', 'Drama']
  },
  {
    title: 'Forrest Gump',
    type: 'Movie',
    year: 1994,
    posterPath: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
    tmdbId: 13,
    tmdbType: 'movie',
    genres: ['Drama', 'Romance']
  },
  {
    title: 'The Godfather',
    type: 'Movie',
    year: 1972,
    posterPath: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    tmdbId: 238,
    tmdbType: 'movie',
    genres: ['Crime', 'Drama']
  },
  {
    title: 'The Godfather Part II',
    type: 'Movie',
    year: 1974,
    posterPath: 'https://image.tmdb.org/t/p/w500/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg',
    tmdbId: 240,
    tmdbType: 'movie',
    genres: ['Crime', 'Drama']
  },
  {
    title: 'The Avengers',
    type: 'Movie',
    year: 2012,
    posterPath: 'https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg',
    tmdbId: 24428,
    tmdbType: 'movie',
    genres: ['Action', 'Adventure', 'Sci-Fi']
  },
  {
    title: 'Avengers: Endgame',
    type: 'Movie',
    year: 2019,
    posterPath: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    tmdbId: 299534,
    tmdbType: 'movie',
    genres: ['Action', 'Adventure', 'Sci-Fi']
  },
  {
    title: 'Guardians of the Galaxy',
    type: 'Movie',
    year: 2014,
    posterPath: 'https://image.tmdb.org/t/p/w500/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg',
    tmdbId: 118340,
    tmdbType: 'movie',
    genres: ['Action', 'Adventure', 'Sci-Fi']
  },
  {
    title: 'Star Wars: A New Hope',
    type: 'Movie',
    year: 1977,
    posterPath: 'https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg',
    tmdbId: 11,
    tmdbType: 'movie',
    genres: ['Action', 'Adventure', 'Sci-Fi']
  },
  {
    title: 'The Batman',
    type: 'Movie',
    year: 2022,
    posterPath: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    tmdbId: 414906,
    tmdbType: 'movie',
    genres: ['Crime', 'Drama', 'Thriller']
  },
  {
    title: 'The Prestige',
    type: 'Movie',
    year: 2006,
    posterPath: 'https://image.tmdb.org/t/p/w500/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg',
    tmdbId: 1124,
    tmdbType: 'movie',
    genres: ['Drama', 'Mystery', 'Thriller']
  },
  {
    title: 'Whiplash',
    type: 'Movie',
    year: 2014,
    posterPath: 'https://image.tmdb.org/t/p/w500/lIv1QinFqz4dlp5U4lQ6HaiskOZ.jpg',
    tmdbId: 244786,
    tmdbType: 'movie',
    genres: ['Drama']
  },
  {
    title: 'La La Land',
    type: 'Movie',
    year: 2016,
    posterPath: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
    tmdbId: 313369,
    tmdbType: 'movie',
    genres: ['Drama', 'Romance']
  },
  {
    title: 'Mad Max: Fury Road',
    type: 'Movie',
    year: 2015,
    posterPath: 'https://image.tmdb.org/t/p/w500/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg',
    tmdbId: 76341,
    tmdbType: 'movie',
    genres: ['Action', 'Adventure', 'Sci-Fi']
  },
  {
    title: 'Game of Thrones',
    type: 'Series',
    year: 2011,
    posterPath: 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
    tmdbId: 1399,
    tmdbType: 'tv',
    genres: ['Drama', 'Fantasy', 'Adventure']
  },
  {
    title: 'The Boys',
    type: 'Series',
    year: 2019,
    posterPath: 'https://image.tmdb.org/t/p/w500/stTEycfG9928HYGEISBFaG1ngjM.jpg',
    tmdbId: 76479,
    tmdbType: 'tv',
    genres: ['Action', 'Sci-Fi', 'Crime']
  },
  {
    title: 'Chernobyl',
    type: 'Series',
    year: 2019,
    posterPath: 'https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg',
    tmdbId: 87108,
    tmdbType: 'tv',
    genres: ['Drama', 'Thriller']
  },
  {
    title: 'Peaky Blinders',
    type: 'Series',
    year: 2013,
    posterPath: 'https://image.tmdb.org/t/p/w500/bGZn5RVzMMXju4ev7xbl1aLdXqq.jpg',
    tmdbId: 60574,
    tmdbType: 'tv',
    genres: ['Crime', 'Drama']
  },
  {
    title: 'House of the Dragon',
    type: 'Series',
    year: 2022,
    posterPath: 'https://image.tmdb.org/t/p/w500/z2yahl2uefxDCl0nogcRBstwruJ.jpg',
    tmdbId: 94997,
    tmdbType: 'tv',
    genres: ['Drama', 'Fantasy', 'Action']
  },
  {
    title: 'Rick and Morty',
    type: 'Series',
    year: 2013,
    posterPath: 'https://image.tmdb.org/t/p/w500/cvhNj9eoRBe5SxjCbQTkh05UP5K.jpg',
    tmdbId: 60625,
    tmdbType: 'tv',
    genres: ['Animation', 'Sci-Fi', 'Comedy']
  },
  {
    title: 'The Office',
    type: 'Series',
    year: 2005,
    posterPath: 'https://image.tmdb.org/t/p/w500/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg',
    tmdbId: 2316,
    tmdbType: 'tv',
    genres: ['Comedy']
  },
  {
    title: 'Narcos',
    type: 'Series',
    year: 2015,
    posterPath: 'https://image.tmdb.org/t/p/w500/rTmal9fDbwh5F0waol2hq35U4ah.jpg',
    tmdbId: 63351,
    tmdbType: 'tv',
    genres: ['Crime', 'Drama', 'Thriller']
  },
  {
    title: 'Kuzey Guney',
    type: 'Series',
    year: 2011,
    posterPath: 'https://image.tmdb.org/t/p/w500/eG35U9iYp6cWigQxIpzwlPEPY0l.jpg',
    tmdbId: 42099,
    tmdbType: 'tv',
    genres: ['Drama']
  },
  {
    title: 'Ask-i Memnu',
    type: 'Series',
    year: 2008,
    posterPath: 'https://image.tmdb.org/t/p/w500/xHulNzEqtgkTuwrRorBRXdGzHML.jpg',
    tmdbId: 17635,
    tmdbType: 'tv',
    genres: ['Drama', 'Romance']
  },
  {
    title: 'Ayla',
    type: 'Movie',
    year: 2017,
    posterPath: 'https://image.tmdb.org/t/p/w500/ggtQgembIFKJcSSeuxJocOklasp.jpg',
    tmdbId: 472454,
    tmdbType: 'movie',
    genres: ['Drama']
  },
  {
    title: 'Green Book',
    type: 'Movie',
    year: 2018,
    posterPath: 'https://image.tmdb.org/t/p/w500/vEzS2VOhdpBIANoEYBHRvcaeBXD.jpg',
    tmdbId: 490132,
    tmdbType: 'movie',
    genres: ['Drama', 'Comedy']
  },
  {
    title: 'Ezel',
    type: 'Series',
    year: 2009,
    posterPath: 'https://image.tmdb.org/t/p/w500/pHSjh4MINU2JnK7qQvjogQaX3wr.jpg',
    tmdbId: 32519,
    tmdbType: 'tv',
    genres: ['Crime', 'Drama', 'Thriller']
  },
  {
    title: 'Sahsiyet',
    type: 'Series',
    year: 2018,
    posterPath: 'https://image.tmdb.org/t/p/w500/vnAsH4kvVVQYQZZ4pf3rJKx1fcR.jpg',
    tmdbId: 77994,
    tmdbType: 'tv',
    genres: ['Crime', 'Drama', 'Thriller']
  },
  {
    title: 'Kurtlar Vadisi',
    type: 'Series',
    year: 2003,
    posterPath: 'https://image.tmdb.org/t/p/w500/yX6JEIijuH6KNCgO8I2yLKu2Psb.jpg',
    tmdbId: 34587,
    tmdbType: 'tv',
    genres: ['Crime', 'Drama', 'Action']
  },
  {
    title: '7. Kogustaki Mucize',
    type: 'Movie',
    year: 2019,
    posterPath: 'https://image.tmdb.org/t/p/w500/sOfUbzu6OUL5cscGODPdpHn9C1g.jpg',
    tmdbId: 637920,
    tmdbType: 'movie',
    genres: ['Drama']
  },
  {
    title: 'Organize Isler',
    type: 'Movie',
    year: 2005,
    posterPath: 'https://image.tmdb.org/t/p/w500/52EZHd5hKzBpfCXJCgAcVNE4GKO.jpg',
    tmdbId: 30634,
    tmdbType: 'movie',
    genres: ['Comedy', 'Crime']
  }
];

async function ensureGenre(pool, name) {
  await pool
    .request()
    .input('name', sql.NVarChar, name)
    .query('IF NOT EXISTS (SELECT 1 FROM Genres WHERE Name = @name) INSERT INTO Genres (Name) VALUES (@name)');
}

async function upsertTitle(pool, entry) {
  const request = pool.request();
  request.input('tmdbId', sql.Int, entry.tmdbId);
  request.input('tmdbType', sql.NVarChar, entry.tmdbType);
  request.input('title', sql.NVarChar, entry.title);
  request.input('type', sql.NVarChar, entry.type);
  request.input('year', sql.Int, entry.year);
  request.input('posterPath', sql.NVarChar, entry.posterPath);

  let titleId = null;
  let aliasMatched = false;

  if (entry.aliases && entry.aliases.length > 0) {
    for (const alias of entry.aliases) {
      const aliasResult = await pool
        .request()
        .input('alias', sql.NVarChar, alias)
        .input('type', sql.NVarChar, entry.type)
        .query('SELECT TitleId FROM Titles WHERE Title = @alias AND TitleType = @type');
      if (aliasResult.recordset.length > 0) {
        titleId = aliasResult.recordset[0].TitleId;
        aliasMatched = true;
        break;
      }
    }
  }

  if (!titleId && entry.tmdbId && entry.tmdbType) {
    const tmdbResult = await request.query(
      `SELECT TitleId FROM Titles WHERE TmdbId = @tmdbId AND TmdbType = @tmdbType`
    );
    if (tmdbResult.recordset.length > 0) {
      titleId = tmdbResult.recordset[0].TitleId;
    }
  }

  if (!titleId) {
    const titleResult = await request.query(
      `SELECT TitleId FROM Titles WHERE Title = @title AND TitleType = @type`
    );
    if (titleResult.recordset.length > 0) {
      titleId = titleResult.recordset[0].TitleId;
    }
  }

  if (!titleId) {
    const inserted = await request.query(
      `INSERT INTO Titles (Title, TitleType, ReleaseYear, PosterPath, TmdbId, TmdbType)
       OUTPUT INSERTED.TitleId
       VALUES (@title, @type, @year, @posterPath, @tmdbId, @tmdbType)`
    );
    titleId = inserted.recordset[0].TitleId;
  } else {
    if (aliasMatched && entry.tmdbId && entry.tmdbType) {
      const duplicate = await pool
        .request()
        .input('tmdbId', sql.Int, entry.tmdbId)
        .input('tmdbType', sql.NVarChar, entry.tmdbType)
        .input('titleId', sql.Int, titleId)
        .query(
          `SELECT TitleId FROM Titles
           WHERE TmdbId = @tmdbId AND TmdbType = @tmdbType AND TitleId <> @titleId`
        );

      if (duplicate.recordset.length > 0) {
        const dupId = duplicate.recordset[0].TitleId;
        await pool
          .request()
          .input('targetId', sql.Int, titleId)
          .input('dupId', sql.Int, dupId)
          .query(
            `UPDATE ut
             SET TitleId = @targetId
             FROM UserTitles ut
             WHERE ut.TitleId = @dupId
               AND NOT EXISTS (
                 SELECT 1 FROM UserTitles u2
                 WHERE u2.TitleId = @targetId AND u2.UserId = ut.UserId
               )`
          );
        await pool
          .request()
          .input('dupId', sql.Int, dupId)
          .query('DELETE FROM Titles WHERE TitleId = @dupId');
      }
    }

    await request
      .input('titleId', sql.Int, titleId)
      .query(
        `UPDATE Titles
         SET Title = @title,
             TitleType = @type,
             ReleaseYear = @year,
             PosterPath = @posterPath,
             TmdbId = @tmdbId,
             TmdbType = @tmdbType
         WHERE TitleId = @titleId`
      );
  }

  if (entry.tmdbId && entry.tmdbType) {
    const duplicate = await pool
      .request()
      .input('tmdbId', sql.Int, entry.tmdbId)
      .input('tmdbType', sql.NVarChar, entry.tmdbType)
      .input('titleId', sql.Int, titleId)
      .query(
        `SELECT TitleId FROM Titles
         WHERE TmdbId = @tmdbId AND TmdbType = @tmdbType AND TitleId <> @titleId`
      );

    if (duplicate.recordset.length > 0) {
      const dupId = duplicate.recordset[0].TitleId;
      await pool
        .request()
        .input('targetId', sql.Int, titleId)
        .input('dupId', sql.Int, dupId)
        .query(
          `UPDATE ut
           SET TitleId = @targetId
           FROM UserTitles ut
           WHERE ut.TitleId = @dupId
             AND NOT EXISTS (
               SELECT 1 FROM UserTitles u2
               WHERE u2.TitleId = @targetId AND u2.UserId = ut.UserId
             )`
        );
      await pool
        .request()
        .input('dupId', sql.Int, dupId)
        .query('DELETE FROM Titles WHERE TitleId = @dupId');
    }
  }

  return titleId;
}

async function ensureTitleGenre(pool, titleId, genreName) {
  const genreResult = await pool
    .request()
    .input('name', sql.NVarChar, genreName)
    .query('SELECT GenreId FROM Genres WHERE Name = @name');

  if (genreResult.recordset.length === 0) {
    return;
  }

  const genreId = genreResult.recordset[0].GenreId;
  await pool
    .request()
    .input('titleId', sql.Int, titleId)
    .input('genreId', sql.Int, genreId)
    .query(
      `IF NOT EXISTS (SELECT 1 FROM TitleGenres WHERE TitleId = @titleId AND GenreId = @genreId)
       INSERT INTO TitleGenres (TitleId, GenreId) VALUES (@titleId, @genreId)`
    );
}

async function run() {
  const pool = await getPool();

  await pool
    .request()
    .query(
      "DELETE FROM Titles WHERE Title = 'The Bear' AND TitleType = 'Series'"
    );
  await pool
    .request()
    .query(
      "DELETE FROM Titles WHERE Title = 'Interstellar' AND PosterPath IS NULL"
    );
  await pool
    .request()
    .query(
      "DELETE FROM Titles WHERE Title IN ('AROG', 'GORA') AND PosterPath IS NULL"
    );

  for (const name of genres) {
    await ensureGenre(pool, name);
  }

  for (const entry of titles) {
    const titleId = await upsertTitle(pool, entry);
    for (const genreName of entry.genres) {
      await ensureTitleGenre(pool, titleId, genreName);
    }
  }

  console.log('Sample titles updated.');
  await sql.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
