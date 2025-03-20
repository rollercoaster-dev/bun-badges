/**
 * Database mock for integration tests
 *
 * This file provides a mocked database implementation for integration tests
 * to avoid actual database connections during test runs.
 */
import { mock } from "bun:test";

// Define types for storage and tables
type TableName = string;
type TableRow = Record<string, unknown>;
type MockStorage = Record<TableName, TableRow[]>;

// Mock data storage
const mockStorage: MockStorage = {
  users: [],
  webauthn_credentials: [],
  login_tokens: [],
  issuer_profiles: [],
  badge_classes: [],
  badge_assertions: [],
  signing_keys: [],
  verification_codes: [],
  revoked_tokens: [],
};

interface Table {
  name: string;
}

interface QueryCondition {
  field: string;
  operator: string;
  value: unknown;
}

// Mock database operations
const mockDb = {
  insert: (table: Table) => {
    const tableName = table.name || Object.keys(mockStorage)[0];

    return {
      values: (data: TableRow | TableRow[]) => {
        if (Array.isArray(data)) {
          mockStorage[tableName].push(...data);
        } else {
          mockStorage[tableName].push(data);
        }

        return {
          returning: () => [{ ...data, id: `mock-${Date.now()}` }],
        };
      },
    };
  },

  execute: async (query: { toString(): string }) => {
    // Mock the execute function to handle session_replication_role
    if (query.toString().includes("session_replication_role")) {
      return Promise.resolve();
    }
    return Promise.resolve([]);
  },

  select: () => {
    return {
      from: (table: Table) => {
        const tableName = table.name || Object.keys(mockStorage)[0];

        return {
          where: (_condition: QueryCondition) => {
            // For simple mock implementation, just return the first item
            // In a more complex mock, you could implement actual filtering
            return mockStorage[tableName].length > 0
              ? [mockStorage[tableName][0]]
              : [];
          },
          limit: (limit: number) => {
            return mockStorage[tableName].slice(0, limit);
          },
        };
      },
    };
  },

  delete: (table: Table) => {
    const tableName = table.name || Object.keys(mockStorage)[0];

    return {
      where: (_condition: QueryCondition) => {
        // For simple implementation, just clear the table
        mockStorage[tableName] = [];
        return { numDeletedRows: 1 };
      },
    };
  },

  // Add other needed methods as required
};

// Setup the mock for db config
mock.module("@/db/config", () => ({
  db: mockDb,
}));

export { mockDb, mockStorage };

// Export tables with names for easier reference in tests
export const tables = {
  issuerProfiles: { name: "issuer_profiles" },
  badgeClasses: { name: "badge_classes" },
  badgeAssertions: { name: "badge_assertions" },
  signingKeys: { name: "signing_keys" },
  users: { name: "users" },
  webauthnCredentials: { name: "webauthn_credentials" },
  loginTokens: { name: "login_tokens" },
  verificationCodes: { name: "verification_codes" },
  revokedTokens: { name: "revoked_tokens" },
};
