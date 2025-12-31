const { Pool } = require('pg');

const hasUrl = Boolean(process.env.DATABASE_URL);
const sslEnabled = process.env.DB_SSL
  ? process.env.DB_SSL === 'true'
  : hasUrl;
const ssl = sslEnabled
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
  : false;

const config = hasUrl
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl,
      max: parseInt(process.env.DB_POOL_MAX || '5', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '30000', 10)
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl,
      max: parseInt(process.env.DB_POOL_MAX || '5', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '30000', 10)
    };

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Postgres pool error', err);
});

async function getPool() {
  return pool;
}

module.exports = { pool, getPool };
