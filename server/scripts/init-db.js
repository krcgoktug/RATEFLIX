require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { sql } = require('../src/db');

const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
  }
};

const dbName = process.env.DB_NAME || 'Rateflix';
const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');
const shouldSeed = process.argv.includes('--seed');

async function run() {
  if (!baseConfig.user || !baseConfig.password || !baseConfig.server) {
    throw new Error('Missing DB connection details in .env.');
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  const masterConfig = { ...baseConfig, database: 'master' };

  await sql.connect(masterConfig);
  await sql.query(`IF DB_ID('${dbName}') IS NULL CREATE DATABASE ${dbName}`);
  await sql.close();

  await sql.connect({ ...baseConfig, database: dbName });
  await sql.query(schemaSql);
  if (shouldSeed) {
    await sql.query(seedSql);
  }
  await sql.close();

  console.log(`Database ${dbName} initialized${shouldSeed ? ' with seed data' : ''}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
