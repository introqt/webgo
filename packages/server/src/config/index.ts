import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_JWT_SECRETS = [
  'your-secret-key-change-in-production',
  'change-this-in-production',
];

function validateJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is required in production. ' +
        'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    console.warn('⚠️  WARNING: Using default JWT_SECRET in development mode. DO NOT use in production!');
    return DEFAULT_JWT_SECRETS[0];
  }

  if (DEFAULT_JWT_SECRETS.includes(secret)) {
    if (isProduction) {
      throw new Error(
        'FATAL: JWT_SECRET is set to a default/insecure value. ' +
        'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    console.warn('⚠️  WARNING: JWT_SECRET is set to a known default value. This is insecure!');
  }

  if (isProduction && secret.length < 32) {
    throw new Error(
      `FATAL: JWT_SECRET must be at least 32 characters in production (current length: ${secret.length}). ` +
      'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return secret;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'webgo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
  },

  jwt: {
    secret: validateJWTSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
};

export function getDatabaseUrl(): string {
  const { host, port, name, user, password, ssl } = config.database;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgresql://${user}:${password}@${host}:${port}/${name}${sslParam}`;
}
