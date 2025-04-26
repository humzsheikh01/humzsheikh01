import { Pool, type PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Allow skipping the database connection in development mode
const skipDbConnection = process.env.NODE_ENV === 'development' && 
                         (process.env.SKIP_DB_CONNECTION === 'true' || !process.env.DATABASE_URL);

if (!process.env.DATABASE_URL && !skipDbConnection) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a mock database client for development if needed
class MockDatabaseClient {
  // Mock database for development that stores data in memory
  private static store: Record<string, any[]> = {};
  
  async query(text: string, params?: any[]) {
    console.log('[MOCK DB] Query:', text);
    
    // Just return empty results for any query
    return { rows: [], rowCount: 0 };
  }
  
  release() {
    // No need to do anything
  }
}

class MockPool {
  async connect() {
    console.log('[MOCK DB] Connected to mock database');
    return new MockDatabaseClient();
  }
  
  on(event: string, callback: any) {
    if (event === 'connect') {
      // Simulate a connection event
      setTimeout(callback, 100);
    }
    return this;
  }
}

let pool: Pool | MockPool | null = null;

if (skipDbConnection) {
  console.log('Using mock database for development');
  pool = new MockPool() as any;
} else {
  const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  };

  // Configure pool with error handling
  pool = new Pool(poolConfig);

  // Add error handling for the pool
  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle database client', err);
    // Log error but don't terminate process immediately
    // This allows the application to attempt recovery
    console.error('Database connection error. The application will attempt to recover.');
  });

  // Add connection recovery mechanism
  let isConnected = false;
  const checkConnection = async () => {
    try {
      if (!isConnected && pool) {
        const client = await pool.connect();
        console.log('Database connection re-established');
        client.release();
        isConnected = true;
      }
    } catch (err) {
      console.error('Failed to re-establish database connection:', err);
      isConnected = false;
      // Try again after delay
      setTimeout(checkConnection, 5000);
    }
  };

  pool.on('connect', () => {
    console.log('Database connection established');
  });

  // Test database connection on startup
  (async () => {
    try {
      if (pool) {
        const client = await pool.connect();
        console.log('Successfully connected to database');
        client.release();
        isConnected = true;
      }
    } catch (err) {
      console.error('Error connecting to the database:', err);
      isConnected = false;
      // Instead of terminating, schedule connection recovery
      console.error('Will attempt to reconnect to database...');
      setTimeout(checkConnection, 5000);
    }
  })();
}

// Create drizzle ORM instance using the appropriate pool
export const db = skipDbConnection 
  ? {
      query: async () => ({ rows: [] }),
      // Add any other methods that might be used by the application
      ...Object.fromEntries(
        Object.entries(schema).map(([key, value]) => [
          key, 
          Array.isArray(value) ? [] : {}
        ])
      )
    } as any 
  : drizzle(pool as Pool, { schema });

export { pool };
