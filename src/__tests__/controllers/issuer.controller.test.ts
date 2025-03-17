import { describe, expect, test, beforeEach } from "bun:test";
import { IssuerController } from "../../controllers/issuer.controller";
import { CreateIssuerDto, UpdateIssuerDto } from "../../models/issuer.model";
import { mock } from "bun:test";
import { eq, count } from "drizzle-orm";

// Mock issuer data
const mockIssuer = {
  issuerId: "123",
  name: "Test Issuer",
  url: "https://example.com",
  email: "test@example.com",
  description: "Test Description",
  ownerUserId: "user123",
  publicKey: {
    id: "key-1",
    type: "Ed25519VerificationKey2020",
    controller: "did:web:example.com:issuers:123",
    publicKeyJwk: {
      kty: "OKP",
      crv: "Ed25519",
      x: "test-key-x",
    },
  },
  issuerJson: {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Profile",
    id: "https://example.com/issuers/123",
    name: "Test Issuer",
    url: "https://example.com",
    email: "test@example.com",
    description: "Test Description",
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Fully implemented mock database
function createDbMock(
  options = { isEmpty: false, hasBadges: false, hasAssertions: false },
) {
  return {
    select: (...args) => {
      // Handle count queries
      if (args.length > 0 && args[0].count) {
        return {
          from: (table) => {
            return {
              where: () => {
                if (table === "badgeClasses") {
                  return Promise.resolve([
                    { count: options.hasBadges ? 1 : 0 },
                  ]);
                }
                if (table === "badgeAssertions") {
                  return Promise.resolve([
                    { count: options.hasAssertions ? 1 : 0 },
                  ]);
                }
                // Default count for pagination
                return Promise.resolve([{ count: 5 }]);
              },
            };
          },
        };
      }

      // Regular select
      return {
        from: (table) => {
          return {
            where: () => {
              if (options.isEmpty) {
                return {
                  limit: () => Promise.resolve([]),
                };
              }
              return {
                limit: () => Promise.resolve([mockIssuer]),
              };
            },
            limit: (limit) => {
              return {
                offset: (offset) =>
                  Promise.resolve(options.isEmpty ? [] : [mockIssuer]),
              };
            },
          };
        },
      };
    },

    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([mockIssuer]),
      }),
    }),

    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([mockIssuer]),
        }),
      }),
    }),

    delete: () => ({
      where: () => ({
        returning: () => Promise.resolve([mockIssuer]),
      }),
    }),
  };
}

// Mock schema objects
const schemaObjects = {
  issuerProfiles: {
    issuerId: "issuerId",
    name: "name",
    url: "url",
    description: "description",
    email: "email",
    ownerUserId: "ownerUserId",
    publicKey: "publicKey",
    issuerJson: "issuerJson",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  badgeClasses: {
    issuerId: "issuerId",
  },
  badgeAssertions: {
    issuerId: "issuerId",
  },
};

describe("IssuerController", () => {
  beforeEach(() => {
    // Reset mock for each test with default options
    mock.module("../../db/config", () => ({
      db: createDbMock(),
    }));

    mock.module("../../db/schema", () => schemaObjects);

    // Must also mock drizzle-orm to handle the eq and count functions properly
    mock.module("drizzle-orm", () => ({
      eq: (...args) => ({ operator: "=", args }),
      count: () => ({ function: "count" }),
    }));
  });

  describe("listIssuers", () => {
    test("returns paginated list of issuers", async () => {
      // Custom mock for listIssuers test
      mock.module("../../db/config", () => ({
        db: {
          select: (...args: any[]) => {
            // If this is a count query
            if (args.length > 0 && args[0].count) {
              return {
                from: () => Promise.resolve([{ count: 5 }]),
              };
            }

            // If this is a regular select
            return {
              from: () => ({
                limit: () => ({
                  offset: () => Promise.resolve([mockIssuer]),
                }),
              }),
            };
          },
        },
      }));

      const controller = new IssuerController();
      const result = await controller.listIssuers(1, 20);

      expect(result.issuers).toEqual([mockIssuer]);
      expect(result.pagination).toEqual({
        total: 5,
        page: 1,
        limit: 20,
        pages: 1,
      });
    });
  });

  describe("getIssuer", () => {
    test("returns issuer by ID", async () => {
      const controller = new IssuerController();
      const result = await controller.getIssuer("123");
      expect(result).toEqual(mockIssuer);
    });

    test("throws error when issuer not found", async () => {
      // Set up empty results for this test
      mock.module("../../db/config", () => ({
        db: createDbMock({ isEmpty: true }),
      }));

      const controller = new IssuerController();
      await expect(controller.getIssuer("invalid")).rejects.toThrow(
        "Failed to get issuer: Issuer not found",
      );
    });
  });

  describe("createIssuer", () => {
    test("creates new issuer", async () => {
      const controller = new IssuerController();
      const data: CreateIssuerDto = {
        name: "New Issuer",
        url: "https://new.example.com",
        email: "new@example.com",
        description: "New Description",
      };

      const result = await controller.createIssuer(
        "user123",
        data,
        "https://example.com",
      );
      expect(result.name).toBe(mockIssuer.name);
    });
  });

  describe("updateIssuer", () => {
    test("updates existing issuer", async () => {
      const controller = new IssuerController();
      const data: UpdateIssuerDto = {
        name: "Updated Issuer",
        url: "https://updated.example.com",
      };

      const result = await controller.updateIssuer(
        "123",
        data,
        "https://example.com",
      );
      expect(result).toEqual(mockIssuer);
    });

    test("throws error when issuer not found", async () => {
      // Set up empty results for this test
      mock.module("../../db/config", () => ({
        db: createDbMock({ isEmpty: true }),
      }));

      const controller = new IssuerController();
      const data: UpdateIssuerDto = {
        name: "Updated Issuer",
      };

      await expect(
        controller.updateIssuer("invalid", data, "https://example.com"),
      ).rejects.toThrow(
        "Failed to update issuer: Failed to get issuer: Issuer not found",
      );
    });
  });

  describe("deleteIssuer", () => {
    test("deletes issuer when no associated badges or assertions", async () => {
      // Custom mock for delete test
      mock.module("../../db/config", () => ({
        db: {
          select: (...args: any[]) => {
            // If this is a count query (for badges or assertions)
            if (args.length > 0 && args[0].count) {
              return {
                from: () => ({
                  where: () => Promise.resolve([{ count: 0 }]),
                }),
              };
            }

            // Regular select
            return {
              from: () => ({
                where: () => ({
                  limit: () => Promise.resolve([mockIssuer]),
                }),
              }),
            };
          },

          delete: () => ({
            where: () => ({
              returning: () => Promise.resolve([mockIssuer]),
            }),
          }),
        },
      }));

      const controller = new IssuerController();
      const result = await controller.deleteIssuer("123");
      expect(result).toBe(true);
    });

    test("throws error when issuer has associated badges", async () => {
      // Set up badge results for this test
      mock.module("../../db/config", () => ({
        db: createDbMock({ hasBadges: true }),
      }));

      const controller = new IssuerController();
      await expect(controller.deleteIssuer("123")).rejects.toThrow(
        "Failed to delete issuer: Cannot delete issuer with associated badges",
      );
    });
  });
});
