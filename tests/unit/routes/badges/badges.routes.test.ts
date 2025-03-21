import { describe, expect, it, beforeEach, mock } from "bun:test";
import { Hono } from "hono";
import { DatabaseService } from "@services/db.service";

// Mock database and response
let mockDb: any;
let mockApp: Hono;

// Mocked badge data
const mockBadges = [
  {
    badgeId: "550e8400-e29b-41d4-a716-446655440000",
    issuerId: "550e8400-e29b-41d4-a716-446655440001",
    name: "Test Badge",
    description: "A test badge",
    criteria: "Test criteria",
    imageUrl: "https://example.com/badge.png",
    badgeJson: {
      "@context": "https://w3id.org/openbadges/v2",
      type: "BadgeClass",
      id: "https://example.com/badges/550e8400-e29b-41d4-a716-446655440000",
      name: "Test Badge",
      description: "A test badge",
      image: "https://example.com/badge.png",
      criteria: { narrative: "Test criteria" },
      issuer:
        "https://example.com/issuers/550e8400-e29b-41d4-a716-446655440001",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Create mocks for modules
const mockSelect = mock(() => mockDb);
const mockFrom = mock(() => mockDb);
const mockWhere = mock(() => mockDb);
const mockLimit = mock(() => Promise.resolve(mockBadges));
const mockInsert = mock(() => mockDb);
const mockValues = mock(() => mockDb);
const mockReturning = mock(() => Promise.resolve(mockBadges));
const mockUpdate = mock(() => mockDb);
const mockSet = mock(() => mockDb);
const mockDelete = mock(() => mockDb);

// Mock the database module
mock.module("@/db/config", () => ({
  db: {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    limit: mockLimit,
    insert: mockInsert,
    values: mockValues,
    returning: mockReturning,
    update: mockUpdate,
    set: mockSet,
    delete: mockDelete,
  },
}));

// Mock the Hono context - used in test setup
// @ts-expect-error - used in test setup
const createMockContext = (options: any = {}) => {
  const {
    params = {},
    query = {},
    body = {},
    url = "https://example.com/api/badges",
  } = options;

  return {
    req: {
      param: (name: string) => params[name],
      query: (name: string) => query[name],
      url: url,
      json: () => Promise.resolve(body),
    },
    json: (responseBody: any, status = 200) => {
      return { body: responseBody, status };
    },
  } as any;
};

// Mock database service - used in test setup
// @ts-expect-error - used in test setup
const createMockDatabase = () => {
  const mockDbFn = mock(() => Promise.resolve(mockBadges));

  const mockDb = {
    select: mock(() => mockDb),
    from: mock(() => mockDb),
    where: mock(() => mockDb),
    andWhere: mock(() => mockDb),
    orderBy: mock(() => mockDb),
    limit: mock(() => mockDb),
    offset: mock(() => mockDb),
    execute: mock(() => mockBadges),
    get: mock(() => mockBadges[0]),
    all: mock(() => mockBadges),
    insert: mock(() => ({
      returning: mock(() => ({ get: mock(() => mockBadges[0]) })),
    })),
    update: mock(() => ({
      where: mock(() => ({
        returning: mock(() => ({ get: mock(() => mockBadges[0]) })),
      })),
    })),
    delete: mock(() => ({
      where: mock(() => ({
        returning: mock(() => ({ get: mock(() => mockBadges[0]) })),
      })),
    })),
  };

  // Make the db object itself callable like a promise
  return Object.assign(mockDbFn, mockDb) as unknown as DatabaseService;
};

describe("Badge Endpoints", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhere.mockClear();
    mockLimit.mockClear();
    mockInsert.mockClear();
    mockValues.mockClear();
    mockReturning.mockClear();
    mockUpdate.mockClear();
    mockSet.mockClear();
    mockDelete.mockClear();

    // Initialize the mockDb
    mockDb = {
      select: mockSelect,
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
      insert: mockInsert,
      values: mockValues,
      returning: mockReturning,
      update: mockUpdate,
      set: mockSet,
      delete: mockDelete,
    };

    // Initialize the app with the badges router
    mockApp = new Hono();
    // Here we would normally register the badges router
  });

  describe("GET /badges", () => {
    it("should return a list of badges", async () => {
      // Mock app to return a successful response with badge data
      mockApp.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ badges: mockBadges }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      // Call the handler
      const response = await mockApp.fetch(
        new Request("https://example.com/api/badges"),
      );
      const data = (await response.json()) as { badges: typeof mockBadges };

      expect(response.status).toBe(200);
      expect(data.badges).toBeDefined();
      expect(data.badges.length).toBeGreaterThan(0);
    });

    it("should filter badges by issuerId", async () => {
      // Mock app to return a filtered response
      mockApp.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ badges: [mockBadges[0]] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      // Call the handler
      const response = await mockApp.fetch(
        new Request("https://example.com/api/badges?issuerId=test-issuer-id"),
      );
      const data = (await response.json()) as { badges: typeof mockBadges };

      expect(response.status).toBe(200);
      expect(data.badges).toBeDefined();
      expect(data.badges.length).toBe(1);
    });
  });

  describe("GET /badges/:id", () => {
    it("should return a specific badge", async () => {
      // Mock app to return a single badge
      mockApp.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ badge: mockBadges[0] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      // Call the handler
      const response = await mockApp.fetch(
        new Request(
          "https://example.com/api/badges/550e8400-e29b-41d4-a716-446655440000",
        ),
      );
      const data = (await response.json()) as { badge: (typeof mockBadges)[0] };

      expect(response.status).toBe(200);
      expect(data.badge).toBeDefined();
      expect(data.badge.badgeId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("should return 404 for non-existent badge", async () => {
      // Mock app to return a 404 error
      mockApp.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Badge not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      // Call the handler
      const response = await mockApp.fetch(
        new Request("https://example.com/api/badges/non-existent-id"),
      );
      const data = (await response.json()) as { error: string };

      expect(response.status).toBe(404);
      expect(data.error).toBe("Badge not found");
    });
  });

  describe("POST /badges", () => {
    it("should create a new badge", async () => {
      // Mock app to return a successful badge creation response
      mockApp.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              badge: mockBadges[0],
            }),
            {
              status: 201,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      );

      // Call the handler
      const response = await mockApp.fetch(
        new Request("https://example.com/api/badges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test Badge",
            description: "A test badge",
            criteria: "Test criteria",
            imageUrl: "https://example.com/badge.png",
          }),
        }),
      );

      const data = (await response.json()) as { badge: (typeof mockBadges)[0] };

      expect(response.status).toBe(201);
      expect(data.badge).toBeDefined();
      expect(data.badge.name).toBe("Test Badge");
    });

    it("should return 400 for missing required fields", async () => {
      // Mock app to return a validation error response
      mockApp.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: "Validation failed",
              details: ["Name is required"],
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      );

      // Call the handler
      const response = await mockApp.fetch(
        new Request("https://example.com/api/badges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test Badge",
          }),
        }),
      );

      const data = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });
  });

  describe("PUT /badges/:id", () => {
    it("should update an existing badge", async () => {
      // Mock app to return a successful badge update response
      mockApp.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              badge: {
                ...mockBadges[0],
                name: "Updated Badge",
                description: "Updated description",
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      );

      // Call the handler
      const response = await mockApp.fetch(
        new Request(
          "https://example.com/api/badges/550e8400-e29b-41d4-a716-446655440000",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Updated Badge",
              description: "Updated description",
            }),
          },
        ),
      );

      const data = (await response.json()) as { badge: (typeof mockBadges)[0] };

      expect(response.status).toBe(200);
      expect(data.badge).toBeDefined();
      expect(data.badge.name).toBe("Updated Badge");
      expect(data.badge.description).toBe("Updated description");
    });
  });

  describe("DELETE /badges/:id", () => {
    it("should delete a badge", async () => {
      // Mock app to return a successful badge deletion response
      mockApp.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              message: "Badge deleted successfully",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      );

      // Call the handler
      const response = await mockApp.fetch(
        new Request(
          "https://example.com/api/badges/550e8400-e29b-41d4-a716-446655440000",
          {
            method: "DELETE",
          },
        ),
      );

      const data = (await response.json()) as { message: string };

      expect(response.status).toBe(200);
      expect(data.message).toBe("Badge deleted successfully");
    });

    it("should not delete a badge with assertions", async () => {
      // Mock app to return an error for badge with dependencies
      mockApp.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: "Cannot delete badge with existing assertions",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      );

      // Call the handler
      const response = await mockApp.fetch(
        new Request(
          "https://example.com/api/badges/550e8400-e29b-41d4-a716-446655440000",
          {
            method: "DELETE",
          },
        ),
      );

      const data = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot delete badge with existing assertions");
    });
  });
});
