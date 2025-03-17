import { IssuerController } from "@/controllers/issuer.controller";
import { CreateIssuerDto, UpdateIssuerDto } from "@/models/issuer.model";
import { eq } from "drizzle-orm";
import { issuerProfiles } from "@/db/schema";
import crypto from "crypto";
import { expect, test, describe, mock, beforeEach } from "bun:test";

// Mock UUID generation for consistent testing
mock.module("crypto", () => ({
  randomUUID: () => "test-uuid",
}));

describe("Issuer Controller", () => {
  let controller: IssuerController;
  let isFirstCall = true;

  const mockIssuer = {
    issuerId: "test-uuid",
    name: "Test Issuer",
    url: "https://example.com",
    email: "test@example.com",
    description: "Test Description",
    ownerUserId: "test-user-id",
    issuerJson: {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Issuer",
      id: "https://example.com/issuers/test-uuid",
      name: "Test Issuer",
      url: "https://example.com",
      email: "test@example.com",
      description: "Test Description",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset all mocks before each test
    mock.restore();
    isFirstCall = true;

    // Mock the database module
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: () => ({
            limit: () => ({
              offset: () => Promise.resolve([mockIssuer]),
            }),
            where: () => ({
              limit: () => Promise.resolve([mockIssuer]),
            }),
          }),
        }),
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
      },
    }));

    controller = new IssuerController();
  });

  describe("listIssuers", () => {
    test("returns paginated list of issuers", async () => {
      mock.module("@/db/config", () => ({
        db: {
          select: () => ({
            from: () => {
              if (isFirstCall) {
                isFirstCall = false;
                return {
                  limit: () => ({
                    offset: () => Promise.resolve([mockIssuer]),
                  }),
                };
              }
              return Promise.resolve([{ count: 1 }]);
            },
          }),
        },
      }));

      const result = await controller.listIssuers(1, 10);

      expect(result.issuers).toBeDefined();
      expect(Array.isArray(result.issuers)).toBe(true);
      expect(result.issuers[0].issuerId).toBe(mockIssuer.issuerId);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      });
    });
  });

  describe("getIssuer", () => {
    test("returns issuer by ID", async () => {
      const result = await controller.getIssuer(mockIssuer.issuerId);
      expect(result).toEqual(mockIssuer);
    });

    test("throws error for non-existent issuer", async () => {
      mock.module("@/db/config", () => ({
        db: {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          }),
        },
      }));

      await expect(controller.getIssuer("non-existent-id")).rejects.toThrow(
        "Failed to get issuer: Issuer not found",
      );
    });
  });

  describe("createIssuer", () => {
    const createDto: CreateIssuerDto = {
      name: "Test Issuer",
      url: "https://example.com",
      email: "test@example.com",
      description: "Test Description",
    };

    test("creates new issuer", async () => {
      const result = await controller.createIssuer(
        mockIssuer.ownerUserId,
        createDto,
        "https://example.com",
      );

      expect(result).toEqual(mockIssuer);
    });

    test("throws error for invalid data", async () => {
      mock.module("@/db/config", () => ({
        db: {
          insert: () => ({
            values: () => ({
              returning: () => Promise.resolve([]),
            }),
          }),
        },
      }));

      await expect(
        controller.createIssuer(
          mockIssuer.ownerUserId,
          createDto,
          "https://example.com",
        ),
      ).rejects.toThrow("Failed to create issuer: Failed to insert issuer");
    });
  });

  describe("updateIssuer", () => {
    const updateDto: UpdateIssuerDto = {
      name: "Updated Issuer",
    };

    test("updates existing issuer", async () => {
      const updatedIssuer = { ...mockIssuer, name: "Updated Issuer" };

      mock.module("@/db/config", () => ({
        db: {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockIssuer]),
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([updatedIssuer]),
              }),
            }),
          }),
        },
      }));

      const result = await controller.updateIssuer(
        mockIssuer.issuerId,
        updateDto,
        "https://example.com",
      );

      expect(result).toEqual(updatedIssuer);
    });

    test("throws error for non-existent issuer", async () => {
      mock.module("@/db/config", () => ({
        db: {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          }),
        },
      }));

      await expect(
        controller.updateIssuer(
          "non-existent-id",
          updateDto,
          "https://example.com",
        ),
      ).rejects.toThrow(
        "Failed to update issuer: Failed to get issuer: Issuer not found",
      );
    });
  });

  describe("deleteIssuer", () => {
    test("deletes issuer without associated badges", async () => {
      mock.module("@/db/config", () => ({
        db: {
          select: () => ({
            from: () => ({
              where: () => Promise.resolve([{ count: 0 }]),
            }),
          }),
          delete: () => ({
            where: () => ({
              returning: () => Promise.resolve([mockIssuer]),
            }),
          }),
        },
      }));

      const result = await controller.deleteIssuer(mockIssuer.issuerId);
      expect(result).toBe(true);
    });

    test("prevents deletion of issuer with associated badges", async () => {
      mock.module("@/db/config", () => ({
        db: {
          select: () => ({
            from: () => ({
              where: () => Promise.resolve([{ count: 1 }]),
            }),
          }),
        },
      }));

      await expect(
        controller.deleteIssuer(mockIssuer.issuerId),
      ).rejects.toThrow("Cannot delete issuer with associated badges");
    });
  });

  describe("verifyIssuer", () => {
    test("verifies valid issuer profile", () => {
      const result = controller.verifyIssuer(mockIssuer.issuerJson);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("returns errors for invalid issuer profile", () => {
      const invalidIssuer = {
        type: "InvalidType",
        name: "Test Issuer",
      };

      const result = controller.verifyIssuer(invalidIssuer);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing @context property");
      expect(result.errors).toContain("Invalid type - must be 'Issuer'");
      expect(result.errors).toContain("Missing id property");
      expect(result.errors).toContain("Missing url property");
    });
  });
});
