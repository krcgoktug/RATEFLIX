const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../db');
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
    const exists = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('SELECT UserId FROM Users WHERE Email = @email');

    if (exists.recordset.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await pool
      .request()
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('email', sql.NVarChar, email)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .query(
        `INSERT INTO Users (FirstName, LastName, Email, PasswordHash)
         OUTPUT INSERTED.UserId, INSERTED.FirstName, INSERTED.LastName, INSERTED.Email
         VALUES (@firstName, @lastName, @email, @passwordHash)`
      );

    const user = inserted.recordset[0];
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
    const result = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query(
        `SELECT UserId, FirstName, LastName, Email, PasswordHash
         FROM Users
         WHERE Email = @email`
      );

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result.recordset[0];
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
    const result = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .query(
        `SELECT UserId, FirstName, LastName, Email, CreatedAt
         FROM Users
         WHERE UserId = @userId`
      );

    return res.json({ user: result.recordset[0] });
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
    const result = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT PasswordHash FROM Users WHERE UserId = @userId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const ok = await bcrypt.compare(currentPassword, result.recordset[0].PasswordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .query('UPDATE Users SET PasswordHash = @passwordHash WHERE UserId = @userId');

    return res.json({ message: 'Password updated.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;