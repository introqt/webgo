import pg, { QueryResultRow } from 'pg';
import { config } from './index.js';

const { Pool } = pg;

function getSSLConfig() {
  if (!config.database.ssl) {
    return false;
  }

  const isProduction = config.nodeEnv === 'production';
  
  if (isProduction) {
    // Production: Require proper SSL certificate validation
    // For self-signed certificates, set DB_SSL_CA env var with the CA certificate path
    const sslConfig: { rejectUnauthorized: boolean; ca?: string } = {
      rejectUnauthorized: true,
    };

    if (process.env.DB_SSL_CA) {
      // Allow custom CA certificate if provided
      sslConfig.ca = process.env.DB_SSL_CA;
    }

    return sslConfig;
  } else {
    // Development: Allow self-signed certificates
    console.warn('⚠️  WARNING: SSL certificate verification is disabled in development mode');
    return { rejectUnauthorized: false };
  }
}

export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: getSSLConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development') {
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
  }
  return res;
}

export async function getClient(): Promise<pg.PoolClient> {
  return pool.connect();
}

export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
