# RATEFLIX

RATEFLIX is a simple movie/series rating and tracking site (watchlist, watched, favorites) built for an Internet Programming term project. The design is inspired by media dashboards with a blurred background theme and a clean, easy-to-understand UI.

## Features
- Authentication: register, login, profile, change password
- Dashboard: totals, average rating, recent watched, featured card
- Watchlist & Watched lists with update/remove actions
- Add Movie/Series with poster upload, status, rating, review
- Detail page with update/delete actions
- Favorites page
- Explore page with search and filters

## Tech Stack
- Client: React + Vite + CSS
- Server: Node.js + Express
- Database: Microsoft SQL Server (MSSQL)

## Project Structure
- `client/` React UI
- `server/` Express API + MSSQL
- `server/db/` SQL schema and seed scripts
- `report/` report template (3-5 pages)

## Setup
1. Install Node.js (LTS)
2. Create an MSSQL database named `Rateflix`
3. Run SQL scripts in this order:
   - `server/db/schema.sql`
   - `server/db/seed.sql` (optional sample data)
4. Configure server environment:
   - Copy `server/.env.example` to `server/.env`
   - Fill in MSSQL connection values and `JWT_SECRET`
5. Install dependencies:
   - `npm install`
   - `npm --prefix server install`
   - `npm --prefix client install`
6. Run locally:
   - `npm run dev`

## Hosting (Free Options)
- Client: Vercel or Netlify
- Server/API: Render or Railway
- Database: Azure SQL free tier (student) or SQL Server on a VM

## Notes for Assignment Requirements
- HTML template: `client/src/components/Layout.jsx` is used for every page.
- CSS:
  - External: `client/src/styles/global.css`
  - Internal: `<style>` inside `client/index.html`
  - Inline: status badges in `client/src/components/StatusPill.jsx`
- JavaScript function: `client/src/utils/format.js`

## Report
Update `report/Report.md` with your real names, student numbers, and screenshots.

## GitHub
If you want to push to GitHub, add a remote and push:
- `git remote add origin https://github.com/<username>/RATEFLIX.git`
- `git push -u origin main`