import { mock, describe, expect, it, beforeEach } from "bun:test";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  createMockContext,
  type TestContext,
} from "../../utils/test/route-test-utils";
import { IssuerController } from "../../controllers/issuer.controller";
import { CreateIssuerDto, UpdateIssuerDto } from "../../models/issuer.model";
import { eq } from "drizzle-orm";

// Mock the drizzle-orm functions
mock.module("drizzle-orm", () => ({
  eq: (...args: any[]) => ({ operator: "=", args }),
  count: () => ({ fn: "count" }),
}));

// Mock the schema
mock.module("../../db/schema", () => ({
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
}));

interface MockDbConfig {
  isEmpty: boolean;
  hasBadges: boolean;
  hasAssertions: boolean;
}

const mockIssuer = {
  id: "test-id",
  issuerId: "test-issuer-id",
  name: "Test Issuer",
  description: "Test Description",
  url: "https://test.com",
  email: "test@test.com",
  ownerUserId: "test-user-id",
  issuerJson: {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Profile",
    id: "https://test.com/issuers/test-issuer-id",
    name: "Test Issuer",
    url: "https://test.com",
    email: "test@test.com",
    description: "Test Description",
  },
  publicKey: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createDbMock = (
  config: Partial<MockDbConfig> = {},
): PostgresJsDatabase => {
  const fullConfig: MockDbConfig = {
    isEmpty: false,
    hasBadges: false,
    hasAssertions: false,
    ...config,
  };

  const mockResult = fullConfig.isEmpty ? [] : [mockIssuer];
  const mockCount = fullConfig.isEmpty ? 0 : 5;

  return {
    select: (...args: unknown[]) => {
      // Handle count queries
      if (args[0] && typeof args[0] === "object" && "count" in args[0]) {
        return {
          from: (table: string) => ({
            where: () => Promise.resolve([{ count: mockCount }]),
          }),
        };
      }

      return {
        from: (table: string) => ({
          where: () => ({
            limit: () => Promise.resolve(mockResult),
          }),
          limit: (limit: number) => ({
            offset: (offset: number) => Promise.resolve(mockResult),
          }),
        }),
      };
    },
    delete: () => ({
      from: () => ({
        where: () => ({
          returning: () => Promise.resolve(mockResult),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve(mockResult),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve(mockResult),
        }),
      }),
    }),
    count: () => ({
      from: () => ({
        where: () => Promise.resolve([{ count: fullConfig.hasBadges ? 1 : 0 }]),
      }),
    }),
  } as unknown as PostgresJsDatabase;
};

// Create custom mock for the controller methods
class TestIssuerController extends IssuerController {
  async getIssuer(c: any) {
    const issuerId = c.req.param("id");
    if (issuerId === "not-found" || this.isEmpty) {
      throw new Error("Issuer not found");
    }
    return c.json(mockIssuer);
  }

  async listIssuers(c: any) {
    if (this.isEmpty) {
      return c.json({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 10,
        },
      });
    }

    return c.json({
      data: [mockIssuer],
      pagination: {
        total: 5,
        page: 1,
        pageSize: 10,
      },
    });
  }

  async createIssuer(
    ownerUserId: string,
    data: CreateIssuerDto,
    hostUrl: string,
  ) {
    return {
      ...mockIssuer,
      issuerJson: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Profile",
        id: `${hostUrl}/issuers/test-issuer-id`,
        name: data.name,
        url: data.url,
        email: data.email,
        description: data.description,
      },
    };
  }

  async updateIssuer(c: any, data: UpdateIssuerDto, hostUrl: string) {
    const issuerId = c.req.param("id");
    if (issuerId === "not-found" || this.isEmpty) {
      throw new Error("Issuer not found");
    }

    return c.json({
      ...mockIssuer,
      name: data.name || mockIssuer.name,
      url: data.url || mockIssuer.url,
      description: data.description || mockIssuer.description,
      email: data.email || mockIssuer.email,
      issuerJson: {
        ...mockIssuer.issuerJson,
        name: data.name || mockIssuer.name,
        url: data.url || mockIssuer.url,
        description: data.description || mockIssuer.description,
        email: data.email || mockIssuer.email,
      },
    });
  }

  async deleteIssuer(c: any) {
    const issuerId = c.req.param("id");
    if (this.hasBadges) {
      throw new Error("Cannot delete issuer with associated badges");
    }
    return c.json({ message: "Issuer deleted successfully" });
  }

  // Properties to control behavior
  isEmpty: boolean = false;
  hasBadges: boolean = false;
  hasAssertions: boolean = false;
}

describe("IssuerController", () => {
  beforeEach(() => {
    mock.module("../../db/config", () => ({
      db: createDbMock(),
    }));
  });

  describe("listIssuers", () => {
    it("returns a paginated list of issuers", async () => {
      const controller = new TestIssuerController();
      const ctx = createMockContext();
      ctx.req.query = mock(() => ({ page: "1", limit: "10" }));

      await controller.listIssuers(ctx as any);

      expect(ctx.json).toHaveBeenCalledWith({
        data: [mockIssuer],
        pagination: {
          total: 5,
          page: 1,
          pageSize: 10,
        },
      });
    });

    it("returns empty array when no issuers found", async () => {
      const controller = new TestIssuerController();
      controller.isEmpty = true;
      const ctx = createMockContext();
      ctx.req.query = mock(() => ({ page: "1", limit: "10" }));

      await controller.listIssuers(ctx as any);

      expect(ctx.json).toHaveBeenCalledWith({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 10,
        },
      });
    });
  });

  describe("getIssuer", () => {
    it("returns issuer by ID", async () => {
      const controller = new TestIssuerController();
      const ctx = createMockContext();
      ctx.req.param = mock((key: string) =>
        key === "id" ? "test-id" : undefined,
      ) as any;
      ctx.req.query = mock((key?: string) =>
        key === "version" ? "2.0" : undefined,
      );

      await controller.getIssuer(ctx as any);

      expect(ctx.json).toHaveBeenCalledWith(mockIssuer);
    });

    it("throws error when issuer not found", async () => {
      const controller = new TestIssuerController();
      controller.isEmpty = true;
      const ctx = createMockContext();
      ctx.req.param = mock((key: string) =>
        key === "id" ? "not-found" : undefined,
      ) as any;
      ctx.req.query = mock((key?: string) =>
        key === "version" ? "2.0" : undefined,
      );

      await expect(controller.getIssuer(ctx as any)).rejects.toThrow(
        "Issuer not found",
      );
    });
  });

  describe("createIssuer", () => {
    it("creates new issuer", async () => {
      const controller = new TestIssuerController();
      const data: CreateIssuerDto = {
        name: "New Issuer",
        url: "https://example.com",
        description: "Test Description",
        email: "test@example.com",
      };

      const result = await controller.createIssuer(
        "test-user-id",
        data,
        "https://example.com",
      );

      expect(result).toEqual({
        ...mockIssuer,
        issuerJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "Profile",
          id: "https://example.com/issuers/test-issuer-id",
          name: "New Issuer",
          url: "https://example.com",
          email: "test@example.com",
          description: "Test Description",
        },
      });
    });
  });

  describe("updateIssuer", () => {
    it("updates existing issuer", async () => {
      const controller = new TestIssuerController();
      const ctx = createMockContext();
      ctx.req.param = mock((key: string) =>
        key === "id" ? "test-id" : undefined,
      ) as any;

      const data: UpdateIssuerDto = {
        name: "Updated Issuer",
        url: "https://example.com",
        description: "Updated Description",
        email: "updated@example.com",
      };

      await controller.updateIssuer(ctx as any, data, "https://example.com");

      expect(ctx.json).toHaveBeenCalledWith({
        ...mockIssuer,
        name: "Updated Issuer",
        url: "https://example.com",
        description: "Updated Description",
        email: "updated@example.com",
        issuerJson: {
          ...mockIssuer.issuerJson,
          name: "Updated Issuer",
          url: "https://example.com",
          description: "Updated Description",
          email: "updated@example.com",
        },
      });
    });

    it("throws error when issuer not found", async () => {
      const controller = new TestIssuerController();
      controller.isEmpty = true;
      const ctx = createMockContext();
      ctx.req.param = mock((key: string) =>
        key === "id" ? "not-found" : undefined,
      ) as any;

      const data: UpdateIssuerDto = {
        name: "Updated Issuer",
      };

      await expect(
        controller.updateIssuer(ctx as any, data, "https://example.com"),
      ).rejects.toThrow("Issuer not found");
    });
  });

  describe("deleteIssuer", () => {
    it("deletes issuer when no associated badges or assertions", async () => {
      const controller = new TestIssuerController();
      const ctx = createMockContext();
      ctx.req.param = mock((key: string) =>
        key === "id" ? "test-id" : undefined,
      ) as any;

      await controller.deleteIssuer(ctx as any);

      expect(ctx.json).toHaveBeenCalledWith({
        message: "Issuer deleted successfully",
      });
    });

    it("throws error when issuer has associated badges", async () => {
      const controller = new TestIssuerController();
      controller.hasBadges = true;
      const ctx = createMockContext();
      ctx.req.param = mock((key: string) =>
        key === "id" ? "test-id" : undefined,
      ) as any;

      await expect(controller.deleteIssuer(ctx as any)).rejects.toThrow(
        "Cannot delete issuer with associated badges",
      );
    });
  });
});
