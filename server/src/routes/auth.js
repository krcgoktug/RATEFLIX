const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function signToken(user) {
  return jwt.sign(
    {
      userId: user.UserId,
      email: user.Email,
      name: `${user.FirstName} ${user.LastName}`
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '').trim();

    if (!firstName || !lastName || !email || password.length < 6) {
      return res.status(400).json({ message: 'Invalid registration data.' });
    }

    const pool = await getPool();
    const exists = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);

    if (exists.rowCount > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id AS "UserId",
                 first_name AS "FirstName",
                 last_name AS "LastName",
                 email AS "Email"`,
      [firstName, lastName, email, passwordHash]
    );

    const user = inserted.rows[0];
    const token = signToken(user);

    return res.status(201).json({ token, user });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing credentials.' });
    }

    const pool = await getPool();
    const result = await pool.query(
      `SELECT user_id AS "UserId",
              first_name AS "FirstName",
              last_name AS "LastName",
              email AS "Email",
              password_hash AS "PasswordHash"
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    delete user.PasswordHash;

    return res.json({ token, user });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.query(
      `SELECT user_id AS "UserId",
              first_name AS "FirstName",
              last_name AS "LastName",
              email AS "Email",
              created_at AS "CreatedAt"
       FROM users
       WHERE user_id = $1`,
      [req.user.userId]
    );

    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.patch('/password', auth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '').trim();
    const newPassword = String(req.body.newPassword || '').trim();

    if (!currentPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Invalid password data.' });
    }

    const pool = await getPool();
    const result = await pool.query(
      'SELECT password_hash AS "PasswordHash" FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const ok = await bcrypt.compare(currentPassword, result.rows[0].PasswordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [
      passwordHash,
      req.user.userId
    ]);

    return res.json({ message: 'Password updated.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
