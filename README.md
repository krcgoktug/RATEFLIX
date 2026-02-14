# RATEFLIX

RATEFLIX is a simple movie/series rating and tracking site (watchlist, watched, favorites) built for an Internet Programming term project. The design is inspired by media dashboards with a blurred background theme and a clean, easy-to-understand UI.

## 🔗 Live Links
- 🌐 Live site: https://rateflix-lime.vercel.app
- 🧠 API health: https://rateflix-api.onrender.com/api/health
- 💻 GitHub: https://github.com/krcgoktug/RATEFLIX

## Features
- Authentication: register, login, profile, change password, forgot-password (email code)
- Dashboard: totals, average rating, recent watched, featured card
- Watchlist & Watched lists with update/remove actions
- Add Movie/Series with status, rating, review, favorites
- Detail page with update/delete actions
- Favorites page
- Explore page with search and filters

## Tech Stack
- Client: React + Vite + CSS
- Server: Node.js + Express
- Database: PostgreSQL

## Project Structure
- `client/` React UI
- `server/` Express API + PostgreSQL
- `server/db/` SQL schema and seed scripts
- `report/` report template (3-5 pages)

## Setup
1. Install Node.js (LTS)
2. Create a PostgreSQL database named `rateflix`
3. Run SQL scripts in this order:
   - `server/db/schema.sql`
   - `server/db/seed.sql` (optional sample data, 50 titles)
   - Or run `npm --prefix server run init-db:seed` / `npm --prefix server run seed:titles` after configuring `.env`
4. Configure server environment:
   - Copy `server/.env.example` to `server/.env`
   - Fill in Postgres connection values (or `DATABASE_URL`), `JWT_SECRET`, and `TMDB_API_KEY` (for TMDB import)
   - For forgot-password emails, configure `SMTP_*` + `SMTP_FROM`, or use Resend API (`EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `RESEND_FROM`)
5. Install dependencies:
   - `npm install`
   - `npm --prefix server install`
   - `npm --prefix client install`
6. Run locally:
   - `npm run dev`

## Hosting (Free Options)
- Client: Vercel or Netlify
- Server/API: Render or Railway
- Database: Neon, Supabase, or Render Postgres (free tiers)

## Notes for Assignment Requirements
- HTML template: `client/src/components/Layout.jsx` is used for every page.
- CSS:
  - External: `client/src/styles/global.css`
  - Internal: `<style>` inside `client/index.html`
  - Inline: status badges in `client/src/components/StatusPill.jsx`
- JavaScript function: `client/src/utils/format.js`

## TMDB Integration
TMDB is used as an external data source for search and import. Add your TMDB API key to `server/.env` to enable:
- `GET /api/tmdb/search` (search TMDB)
- `POST /api/tmdb/import` (import a title into Postgres)

## Sample Data
`server/db/seed.sql` includes 50 movie/series entries with TMDB posters for the Explore page.

## Report
Update `report/Report.md` with your real names, student numbers, and screenshots.

## GitHub
If you want to push to GitHub, add a remote and push:
- `git remote add origin https://github.com/<username>/RATEFLIX.git`
- `git push -u origin main`
