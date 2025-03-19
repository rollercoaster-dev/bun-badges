/**
 * Database mock for integration tests
 *
 * This file provides a mocked database implementation for integration tests
 * to avoid actual database connections during test runs.
 */
import { mock } from "bun:test";

// Mock data storage
const mockStorage: Record<string, any[]> = {
  issuerProfiles: [],
  badgeClasses: [],
  badgeAssertions: [],
  signingKeys: [],
};

// Mock database operations
const mockDb = {
  insert: (table: any) => {
    const tableName = table.name || Object.keys(mockStorage)[0];

    return {
      values: (data: any) => {
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

  select: () => {
    return {
      from: (table: any) => {
        const tableName = table.name || Object.keys(mockStorage)[0];

        return {
          where: (_condition: any) => {
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

  delete: (table: any) => {
    const tableName = table.name || Object.keys(mockStorage)[0];

    return {
      where: (_condition: any) => {
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
  issuerProfiles: { name: "issuerProfiles" },
  badgeClasses: { name: "badgeClasses" },
  badgeAssertions: { name: "badgeAssertions" },
  signingKeys: { name: "signingKeys" },
};
