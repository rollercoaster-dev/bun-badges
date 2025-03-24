import { Pool } from "pg";
import { randomUUID } from "crypto";

/**
 * Pool manager for handling database connections in tests
 * This utility creates and manages database connection pools for tests,
 * ensuring each test file gets its own isolated connection pool.
 */

// Track all active pools by ID
const activePools = new Map<string, ManagedPool>();

interface ManagedPool {
  id: string;
  pool: Pool;
  isActive: boolean;
  createdAt: Date;
  testFile: string;
}

/**
 * Creates a new database connection pool for a test file
 * @param testFile Name of test file using this pool
 * @returns A managed database pool
 */
export function createTestPool(testFile: string): {
  pool: Pool;
  cleanup: () => Promise<void>;
} {
  // Get connection details from environment
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const poolId = randomUUID();

  console.log(`[pool-manager] Creating new pool (${poolId}) for ${testFile}`);

  // Create a new pool with specific configuration for tests
  const pool = new Pool({
    connectionString,
    max: 10, // Limit connections per pool
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

  // Store in our registry
  const managedPool: ManagedPool = {
    id: poolId,
    pool,
    isActive: true,
    createdAt: new Date(),
    testFile,
  };

  activePools.set(poolId, managedPool);

  // Create a cleanup function
  const cleanup = async () => {
    const pool = activePools.get(poolId);
    if (pool && pool.isActive) {
      console.log(
        `[pool-manager] Cleaning up pool (${poolId}) for ${testFile}`,
      );
      pool.isActive = false;
      await pool.pool.end();
      activePools.delete(poolId);
    }
  };

  // Add a listener to check pool status before each query
  const originalEnd = pool.end.bind(pool);
  pool.end = async () => {
    const managedPool = activePools.get(poolId);
    if (managedPool) {
      managedPool.isActive = false;
      activePools.delete(poolId);
    }
    return originalEnd();
  };

  return {
    pool,
    cleanup,
  };
}

/**
 * Get information about all active pools
 */
export function getActivePoolsInfo() {
  return Array.from(activePools.values()).map((pool) => ({
    id: pool.id,
    isActive: pool.isActive,
    createdAt: pool.createdAt,
    testFile: pool.testFile,
  }));
}

/**
 * Check if a pool is still active
 */
export function isPoolActive(pool: Pool): boolean {
  for (const [_, managedPool] of activePools.entries()) {
    if (managedPool.pool === pool) {
      return managedPool.isActive;
    }
  }
  return false;
}

// Clean up any remaining pools on process exit
process.on("beforeExit", async () => {
  console.log(
    `[pool-manager] Cleaning up ${activePools.size} remaining pools on exit`,
  );

  for (const [id, managedPool] of activePools.entries()) {
    if (managedPool.isActive) {
      console.log(
        `[pool-manager] Closing leftover pool (${id}) for ${managedPool.testFile}`,
      );
      managedPool.isActive = false;
      await managedPool.pool.end();
    }
  }

  activePools.clear();
});
