import { describe, expect, test, beforeEach } from "bun:test";
import { IssuerController } from "../../controllers/issuer.controller";
import { CreateIssuerDto, UpdateIssuerDto } from "../../models/issuer.model";
import { mock } from "bun:test";

// Mock issuer data
const mockIssuer = {
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
};

// Mock database module
const createMockDb = () => {
  let isFirstCall = true;

  return {
    select: mock(() => mockDb),
    from: mock(() => mockDb),
    where: mock(() => mockDb),
    limit: mock(() => mockDb),
    offset: mock(() => mockDb),
    insert: mock(() => mockDb),
    values: mock(() => mockDb),
    update: mock(() => mockDb),
    set: mock(() => mockDb),
    delete: mock(() => mockDb),
    returning: mock(() => {
      if (isFirstCall) {
        isFirstCall = false;
        return [{ count: 5 }];
      }
      return [mockIssuer];
    }),
  };
};

let mockDb: ReturnType<typeof createMockDb>;
let controller: IssuerController;

describe("IssuerController", () => {
  beforeEach(() => {
    mockDb = createMockDb();
    controller = new IssuerController();
  });

  describe("listIssuers", () => {
    test("returns paginated list of issuers", async () => {
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
      const result = await controller.getIssuer("123");
      expect(result).toEqual(mockIssuer);
    });

    test("throws error when issuer not found", async () => {
      mockDb.returning = mock(() => []);
      await expect(controller.getIssuer("invalid")).rejects.toThrow(
        "Issuer not found",
      );
    });
  });

  describe("createIssuer", () => {
    test("creates new issuer", async () => {
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
      mockDb.returning = mock(() => []);
      const data: UpdateIssuerDto = {
        name: "Updated Issuer",
      };

      await expect(
        controller.updateIssuer("invalid", data, "https://example.com"),
      ).rejects.toThrow("Issuer not found");
    });
  });

  describe("deleteIssuer", () => {
    test("deletes issuer when no associated badges or assertions", async () => {
      const result = await controller.deleteIssuer("123");
      expect(result).toBe(true);
    });

    test("throws error when issuer has associated badges", async () => {
      mockDb.returning = mock(() => [{ count: 1 }]);
      await expect(controller.deleteIssuer("123")).rejects.toThrow(
        "Cannot delete issuer with associated badges",
      );
    });
  });
});
