require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const { getPool } = require('./db');
const authRoutes = require('./routes/auth');
const titlesRoutes = require('./routes/titles');
const userTitlesRoutes = require('./routes/userTitles');
const dashboardRoutes = require('./routes/dashboard');
const tmdbRoutes = require('./routes/tmdb');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: true });
  } catch (err) {
    console.error('Health check failed', err);
    res.json({ ok: false, db: false });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/titles', titlesRoutes);
app.use('/api/user-titles', userTitlesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tmdb', tmdbRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`RATEFLIX API running on port ${PORT}`);
});
