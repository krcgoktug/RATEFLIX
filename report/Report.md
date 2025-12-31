# RATEFLIX

## Internet Programming Term Project Report

**Course:** Internet Programming

**Project Title:** RATEFLIX (Movie / Series Rating Tracker)

**Team Members**
- Goktug Krc - Student Number: [Fill]
- Miray [Surname] - Student Number: [Fill]

**Date:** [Fill]

<!-- pagebreak -->

## 1. Project Overview
RATEFLIX is a simple web-based database system for tracking movies and TV series. The concept is inspired by Letterboxd, but intentionally minimal and easy to understand. Users can register, log in, create their personal watchlist, mark titles as watched, rate and review, and save favorites. The system demonstrates CRUD operations, relational database usage, authentication, and a clean UI.

### Key Features
- Register and login (user authentication)
- Dashboard summary (counts and average rating)
- Watchlist and Watched tabs
- Add Movie / Series form with poster upload
- Detail page for update and delete actions
- Favorites section
- Profile page with basic stats and password change

<!-- pagebreak -->

## 2. Database Design (PostgreSQL)
The database uses PostgreSQL and includes five relational tables:

### Tables
- **Users**: stores account data
- **Titles**: movies and series metadata
- **Genres**: genre dictionary
- **TitleGenres**: many-to-many relation between Titles and Genres
- **UserTitles**: user-specific data (status, rating, review, favorite)

### Relationships
- A user can have many titles in **UserTitles**.
- A title can have many genres via **TitleGenres**.

### Example Queries
- Dashboard summary (counts and average rating)
- Recent watched list
- Most watched genre

SQL scripts are included in `server/db/schema.sql` and `server/db/sample-queries.sql`.

<!-- pagebreak -->

## 3. UI and Design
The UI uses a blurred background theme, glass-like cards, and a clean sidebar layout. All pages share the same HTML template through a common React layout component.

### Pages
- Login / Register
- Dashboard
- Watchlist
- Watched
- Add Movie / Series
- Detail
- Favorites
- Profile
- Explore (search and filters)

### CSS Requirements
- **External CSS**: `client/src/styles/global.css`
- **Internal CSS**: `<style>` block in `client/index.html`
- **Inline CSS**: status badges in `client/src/components/StatusPill.jsx`

### JavaScript Functions
- `formatRating`, `formatDate`, and `clampText` in `client/src/utils/format.js`

<!-- pagebreak -->

## 4. Application Logic
### API Endpoints (Express)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/password`
- `GET /api/dashboard`
- `GET /api/dashboard/profile`
- `GET /api/titles`
- `GET /api/titles/:id`
- `POST /api/titles`
- `GET /api/user-titles`
- `POST /api/user-titles`
- `PATCH /api/user-titles/:id`
- `DELETE /api/user-titles/:id`

### Validation
- Required fields in registration and add-title form
- Rating constraints (1-10)
- File type check for poster upload

<!-- pagebreak -->

## 5. Hosting and Deployment Plan
- **Client**: Vercel or Netlify (free tier)
- **Server/API**: Render or Railway
- **Database**: Neon, Supabase, or Render Postgres (free tiers)

Deployment steps are documented in `README.md`.

<!-- pagebreak -->

## 6. Screenshots
Add UI screenshots here for the final submission.

- Login page
- Dashboard page
- Watchlist and Watched pages
- Add Movie / Series form
- Detail page

<!-- pagebreak -->

## 7. Conclusion
RATEFLIX fulfills the term project requirements by combining a relational database (PostgreSQL), a web interface (React), and a server-side API (Node/Express). The project is intentionally simple, easy to present, and covers all required features such as CRUD, CSS types, JavaScript functions, and database relations.
