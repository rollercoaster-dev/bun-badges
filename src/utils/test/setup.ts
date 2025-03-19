import { config } from "dotenv";
import * as path from "path";
import { mock } from "bun:test";

// Load test environment variables
config({ path: path.resolve(process.cwd(), "test.env") });

// Mock drizzle-orm to fix import issues
mock.module("drizzle-orm", () => {
  // Create mock functions for all operators
  const eq = () => ({ operator: "eq" });
  const and = () => ({ operator: "and" });
  const gt = () => ({ operator: "gt" });
  const lt = () => ({ operator: "lt" });

  return {
    eq,
    and,
    gt,
    lt,
    // Add other exports as needed
  };
});

// Create a function that returns a chainable mock
const createChainableMock = () => {
  const handler = {
    get: (target: object, prop: string | symbol) => {
      if (prop === "array") {
        return () => new Proxy({}, handler);
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
};

// Mock drizzle-orm/pg-core
mock.module("drizzle-orm/pg-core", () => {
  const pgTable = () => createChainableMock();

  // Create chainable column types
  const text = () => createChainableMock();
  const varchar = () => createChainableMock();
  const uuid = () => createChainableMock();
  const timestamp = () => createChainableMock();
  const boolean = () => createChainableMock();
  const jsonb = () => createChainableMock();

  return {
    pgTable,
    text,
    varchar,
    uuid,
    timestamp,
    boolean,
    jsonb,
  };
});

// Import crypto setup for consistent mock behavior
import "./crypto-setup";

// Mock the DatabaseService for tests that need database access
mock.module("@/services/db.service", () => {
  const dbMock = {
    insert: () => ({ values: () => Promise.resolve([]) }),
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    }),
  };

  return {
    DatabaseService: class {
      constructor() {
        // No initialization needed for mock
      }
      // Add any required methods that controllers might call
      db = dbMock;
    },
  };
});

// Setup complete - test environment is ready
