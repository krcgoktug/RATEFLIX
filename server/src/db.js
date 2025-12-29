const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  connectionTimeout: parseInt(process.env.DB_CONN_TIMEOUT || '30000', 10),
  requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000', 10),
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
  }
};

let pool;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry(retries = 3, delayMs = 1500) {
  try {
    const connectedPool = await sql.connect(config);
    connectedPool.on('error', (err) => {
      console.error('SQL pool error', err);
      pool = null;
    });
    return connectedPool;
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }
    await wait(delayMs);
    return connectWithRetry(retries - 1, Math.min(delayMs * 2, 8000));
  }
}

async function getPool() {
  if (!pool || !pool.connected) {
    pool = await connectWithRetry();
  }
  return pool;
}

module.exports = { sql, getPool };
