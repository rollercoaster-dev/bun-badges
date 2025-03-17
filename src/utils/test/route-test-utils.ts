import { Hono } from "hono";
import { mock } from "bun:test";
import { setupJwtMock } from "./auth-test-utils";
import { Role } from "../../middleware/auth";

/**
 * Mock database data for testing
 */
export function createMockDbData() {
  return {
    issuer: {
      issuerId: "123",
      name: "Test Issuer",
      url: "https://example.com",
      email: "test@example.com",
      description: "Test Description",
      ownerUserId: "user123",
      publicKey: [
        {
          id: "key-1",
          type: "Ed25519VerificationKey2020",
          controller: "did:web:example.com:issuers:123",
          publicKeyJwk: {
            kty: "OKP",
            crv: "Ed25519",
            x: "test-key-x",
          },
        },
      ],
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
    },
    badge: {
      badgeId: "test-badge",
      issuerId: "123",
      name: "Test Badge",
      description: "Test badge description",
      criteria: "Test criteria",
      imageUrl: "https://test.com/badge.png",
      badgeJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    assertion: {
      assertionId: "test-assertion",
      badgeId: "test-badge",
      issuerId: "123",
      recipientType: "email",
      recipientIdentity: "test@example.com",
      recipientHashed: true,
      issuedOn: new Date(),
      evidenceUrl: null,
      revoked: false,
      revocationReason: null,
      assertionJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

/**
 * Mock database for testing
 */
export function createMockDb() {
  const data = createMockDbData();

  return {
    select: (fields?: any) => {
      // Handle the count query special case
      if (fields && fields.count) {
        return {
          from: () => ({
            where: () => Promise.resolve([{ count: 1 }]),
            execute: () => Promise.resolve([{ count: 1 }]),
          }),
        };
      }

      // Standard select
      return {
        from: () => ({
          limit: () => ({
            offset: () => Promise.resolve([data.issuer]),
          }),
          where: () => ({
            limit: () => Promise.resolve([data.issuer]),
            execute: () => Promise.resolve([data.issuer]),
          }),
          execute: () => Promise.resolve([data.issuer]),
        }),
      };
    },
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([data.issuer]),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([data.issuer]),
        }),
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: () => Promise.resolve([data.issuer]),
      }),
    }),
  };
}

/**
 * Mock IssuerController for testing
 */
export function mockIssuerController() {
  const data = createMockDbData();

  // Create mock controller methods
  mock.module("../../controllers/issuer.controller", () => {
    const controller = {
      // List issuers with pagination
      listIssuers: async () => ({
        issuers: [data.issuer],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          pages: 1,
        },
      }),

      // Get issuer by ID
      getIssuer: async (issuerId: string) => {
        if (issuerId === "123") {
          return data.issuer;
        }
        throw new Error("Issuer not found");
      },

      // Create new issuer
      createIssuer: async (ownerId: string, issuerData: any) => {
        return {
          ...data.issuer,
          ...issuerData,
          ownerUserId: ownerId,
        };
      },

      // Update issuer
      updateIssuer: async (issuerId: string, issuerData: any) => {
        if (issuerId === "123") {
          return {
            ...data.issuer,
            ...issuerData,
            issuerId,
          };
        }
        throw new Error("Issuer not found");
      },

      // Delete issuer
      deleteIssuer: async (issuerId: string) => {
        if (issuerId === "123") {
          return true;
        }
        throw new Error("Issuer not found");
      },

      // Verify issuer
      verifyIssuer: () => ({
        valid: true,
        errors: [],
      }),
    };

    return {
      IssuerController: function () {
        return controller;
      },
    };
  });
}

/**
 * Mock database schema for testing
 */
export function mockDbSchema() {
  return {
    issuerProfiles: {
      issuerId: { name: "issuer_id" },
      ownerUserId: { name: "owner_user_id" },
    },
    badgeClasses: {
      badgeId: { name: "badge_id" },
      issuerId: { name: "issuer_id" },
    },
    badgeAssertions: {
      assertionId: { name: "assertion_id" },
      badgeId: { name: "badge_id" },
      issuerId: { name: "issuer_id" },
    },
  };
}

/**
 * Mock database configuration
 */
export function mockDbConfig() {
  mock.module("../../db/config", () => ({
    db: createMockDb(),
  }));
}

/**
 * Mock Drizzle ORM functions
 */
export function mockDrizzleOrm() {
  mock.module("drizzle-orm", () => ({
    eq: (...args: any[]) => ({ operator: "=", args }),
    ne: (...args: any[]) => ({ operator: "!=", args }),
    gt: (...args: any[]) => ({ operator: ">", args }),
    lt: (...args: any[]) => ({ operator: "<", args }),
    gte: (...args: any[]) => ({ operator: ">=", args }),
    lte: (...args: any[]) => ({ operator: "<=", args }),
    count: () => ({ fn: "count" }),
  }));
}

/**
 * Mock schema objects
 */
export function mockSchema() {
  mock.module("../../db/schema/index", () => mockDbSchema());
}

/**
 * Sets up a standard testing environment for route tests with auth
 */
export function setupRouteTest() {
  // Set up JWT mock
  const { users } = setupJwtMock();

  // Mock controller, database and related modules
  mockIssuerController();
  mockDbConfig();
  mockDrizzleOrm();
  mockSchema();

  return {
    users,
    data: createMockDbData(),
    createApp: (routes: any) => {
      const app = new Hono();
      app.route("/", routes);
      return app;
    },
  };
}

/**
 * Create a test request with auth token
 */
export function createTestRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {},
) {
  const method = options.method || "GET";
  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const request = new Request(`http://localhost${path}`, {
    method,
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  return request;
}
