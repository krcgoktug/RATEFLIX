require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');
const shouldSeed = process.argv.includes('--seed');

async function run() {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    throw new Error('Missing Postgres connection details in .env.');
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  await pool.query(schemaSql);
  if (shouldSeed) {
    await pool.query(seedSql);
  }

  await pool.end();
  console.log(`Database initialized${shouldSeed ? ' with seed data' : ''}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
