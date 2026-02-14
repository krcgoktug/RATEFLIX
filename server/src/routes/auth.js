const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPool } = require('../db');
const auth = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/mailer');

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

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(String(value || ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getResetCodeTtlMinutes() {
  return Math.min(parsePositiveInt(process.env.RESET_CODE_TTL_MINUTES, 10), 60);
}

function getResetCodeMaxAttempts() {
  return Math.min(parsePositiveInt(process.env.RESET_CODE_MAX_ATTEMPTS, 5), 10);
}

function generateResetCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

function hashResetCode(email, code) {
  const resetSecret = process.env.RESET_CODE_SECRET || process.env.JWT_SECRET || 'rateflix_reset_secret';
  return crypto
    .createHash('sha256')
    .update(`${email}:${code}:${resetSecret}`)
    .digest('hex');
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

router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const genericResponse = 'If that email exists, a verification code has been sent.';
    const pool = await getPool();

    const userResult = await pool.query(
      `SELECT user_id AS "UserId",
              first_name AS "FirstName",
              email AS "Email"
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rowCount === 0) {
      return res.json({ message: genericResponse });
    }

    const user = userResult.rows[0];
    const code = generateResetCode();
    const codeHash = hashResetCode(email, code);
    const expiresMinutes = getResetCodeTtlMinutes();

    await pool.query('DELETE FROM password_reset_codes WHERE expires_at < NOW() OR used_at IS NOT NULL');
    await pool.query(
      'DELETE FROM password_reset_codes WHERE user_id = $1 AND used_at IS NULL',
      [user.UserId]
    );

    await pool.query(
      `INSERT INTO password_reset_codes (user_id, code_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))`,
      [user.UserId, codeHash, expiresMinutes]
    );

    await sendPasswordResetEmail({
      to: user.Email,
      firstName: user.FirstName,
      code,
      expiresMinutes
    });

    return res.json({ message: genericResponse });
  } catch (err) {
    return next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const newPassword = String(req.body.newPassword || '').trim();

    if (!email || !/^\d{6}$/.test(code) || newPassword.length < 6) {
      return res.status(400).json({ message: 'Invalid reset data.' });
    }

    const invalidCodeMessage = 'Invalid or expired verification code.';
    const pool = await getPool();

    const userResult = await pool.query(
      'SELECT user_id AS "UserId" FROM users WHERE email = $1',
      [email]
    );
    if (userResult.rowCount === 0) {
      return res.status(400).json({ message: invalidCodeMessage });
    }

    const userId = userResult.rows[0].UserId;
    const codeResult = await pool.query(
      `SELECT reset_id AS "ResetId",
              code_hash AS "CodeHash",
              attempts AS "Attempts",
              expires_at AS "ExpiresAt"
       FROM password_reset_codes
       WHERE user_id = $1
         AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (codeResult.rowCount === 0) {
      return res.status(400).json({ message: invalidCodeMessage });
    }

    const resetRow = codeResult.rows[0];
    const maxAttempts = getResetCodeMaxAttempts();
    const isExpired = new Date(resetRow.ExpiresAt).getTime() <= Date.now();
    if (isExpired || resetRow.Attempts >= maxAttempts) {
      await pool.query('DELETE FROM password_reset_codes WHERE reset_id = $1', [resetRow.ResetId]);
      return res.status(400).json({ message: invalidCodeMessage });
    }

    const expectedCodeHash = hashResetCode(email, code);
    if (expectedCodeHash !== resetRow.CodeHash) {
      await pool.query(
        'UPDATE password_reset_codes SET attempts = attempts + 1 WHERE reset_id = $1',
        [resetRow.ResetId]
      );
      return res.status(400).json({ message: invalidCodeMessage });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [
        passwordHash,
        userId
      ]);
      await client.query('UPDATE password_reset_codes SET used_at = NOW() WHERE reset_id = $1', [
        resetRow.ResetId
      ]);
      await client.query(
        'DELETE FROM password_reset_codes WHERE user_id = $1 AND reset_id <> $2',
        [userId, resetRow.ResetId]
      );
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    return res.json({ message: 'Password reset successful. You can now sign in.' });
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
