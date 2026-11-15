import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Database connection singleton to prevent creating multiple connection pools
 * in a serverless environment. Initialized lazily so a missing DATABASE_URL
 * fails at first use (pages can still be built without a live database).
 */
function requireDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return connectionString;
}

const globalForDb = global as unknown as {
  conn: postgres.Sql | undefined;
  db: any;
};

function getConn(): postgres.Sql {
  if (!globalForDb.conn) {
    globalForDb.conn = postgres(requireDatabaseUrl(), {
      prepare: false, // Necessary for some serverless environments like Vercel/PlanetScale
    });
  }
  return globalForDb.conn;
}

function getDb() {
  if (!globalForDb.db) {
    globalForDb.db = drizzle(getConn());
  }
  return globalForDb.db;
}

export const conn = new Proxy({} as postgres.Sql, {
  get(_target, prop) {
    const real = getConn() as any;
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export const db = new Proxy({} as any, {
  get(_target, prop) {
    const real = getDb();
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export type DbClient = ReturnType<typeof drizzle>;
