-- Sample data for development
INSERT INTO dbo.Genres (Name)
VALUES ('Action'), ('Drama'), ('Sci-Fi'), ('Comedy'), ('Animation'), ('Adventure');

INSERT INTO dbo.Titles (Title, TitleType, ReleaseYear, PosterPath)
VALUES
  ('Across the Spider-Verse', 'Movie', 2023, NULL),
  ('The Bear', 'Series', 2022, NULL),
  ('Interstellar', 'Movie', 2014, NULL),
  ('Stranger Things', 'Series', 2016, NULL);

-- Map genres (assumes identity starting at 1)
INSERT INTO dbo.TitleGenres (TitleId, GenreId)
VALUES
  (1, 3), (1, 5), (1, 6),
  (2, 2), (2, 4),
  (3, 2), (3, 3),
  (4, 3), (4, 6);

-- Create a demo user (replace PasswordHash with a real bcrypt hash)
INSERT INTO dbo.Users (FirstName, LastName, Email, PasswordHash)
VALUES ('Goktug', 'Krc', 'demo@rateflix.com', 'CHANGE_ME_HASH');

-- Add titles to demo user list (UserId = 1)
INSERT INTO dbo.UserTitles (UserId, TitleId, Status, Rating, Review, WatchedAt, IsFavorite)
VALUES
  (1, 1, 'watched', 9, 'Stylish and emotional.', '2024-02-10', 1),
  (1, 2, 'watchlist', NULL, NULL, NULL, 0),
  (1, 3, 'watched', 10, 'All-time favorite.', '2024-01-18', 1),
  (1, 4, 'watchlist', NULL, NULL, NULL, 0);