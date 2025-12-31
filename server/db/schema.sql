DROP TABLE IF EXISTS user_titles;
DROP TABLE IF EXISTS title_genres;
DROP TABLE IF EXISTS genres;
DROP TABLE IF EXISTS titles;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE titles (
  title_id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  title_type VARCHAR(20) NOT NULL CHECK (title_type IN ('Movie', 'Series')),
  release_year INT NOT NULL,
  poster_path VARCHAR(400),
  tmdb_id INT,
  tmdb_type VARCHAR(10) CHECK (tmdb_type IN ('movie', 'tv')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX titles_tmdb_unique
  ON titles (tmdb_id, tmdb_type)
  WHERE tmdb_id IS NOT NULL AND tmdb_type IS NOT NULL;

CREATE TABLE genres (
  genre_id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE title_genres (
  title_id INT NOT NULL,
  genre_id INT NOT NULL,
  PRIMARY KEY (title_id, genre_id),
  CONSTRAINT fk_title_genres_title FOREIGN KEY (title_id) REFERENCES titles(title_id) ON DELETE CASCADE,
  CONSTRAINT fk_title_genres_genre FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE
);

CREATE TABLE user_titles (
  user_title_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  title_id INT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('watchlist', 'watched')),
  rating INT NULL CHECK (rating BETWEEN 1 AND 10),
  review VARCHAR(800) NULL,
  watched_at DATE NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_titles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_titles_title FOREIGN KEY (title_id) REFERENCES titles(title_id) ON DELETE CASCADE,
  CONSTRAINT uq_user_titles UNIQUE (user_id, title_id)
);
