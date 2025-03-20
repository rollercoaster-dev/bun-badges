import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import badges from "@/routes/badges.routes";
import { seedTestData, clearTestData, TestData } from "@/utils/test/db-helpers";
import { testDb } from "@/utils/test/integration-setup";
import { badgeClasses } from "@/db/schema";
import { eq } from "drizzle-orm";

// Define response types for type safety
interface ApiResponse<T> {
  status: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface BadgesData {
  badges: Array<{
    badgeId: string;
    issuerId: string;
    name: string;
    [key: string]: any;
  }>;
}

interface BadgeData {
  badge: {
    badgeId: string;
    issuerId: string;
    name: string;
    [key: string]: any;
  };
}

describe("Badge Routes Integration Tests", () => {
  let app: Hono;
  let testData: TestData;

  beforeEach(async () => {
    app = new Hono();
    app.route("/api", badges);
    testData = await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("GET /badges", () => {
    it("should return a list of badges", async () => {
      const response = await app.fetch(
        new Request("http://example.com/api/badges"),
      );

      expect(response.status).toBe(200);

      const responseData = (await response.json()) as ApiResponse<BadgesData>;
      expect(responseData.status).toBe("success");
      expect(responseData.data?.badges.length).toBeGreaterThan(0);
      expect(responseData.data?.badges[0].badgeId).toBeDefined();
    });

    it("should filter badges by issuerId", async () => {
      const response = await app.fetch(
        new Request(
          `http://example.com/api/badges?issuerId=${testData.issuer.issuerId}`,
        ),
      );

      expect(response.status).toBe(200);

      const responseData = (await response.json()) as ApiResponse<BadgesData>;
      expect(responseData.status).toBe("success");
      expect(responseData.data?.badges.length).toBeGreaterThan(0);
      expect(responseData.data?.badges[0].issuerId).toBe(
        testData.issuer.issuerId,
      );
    });
  });

  describe("GET /badges/:id", () => {
    it("should return a specific badge", async () => {
      const response = await app.fetch(
        new Request(`http://example.com/api/badges/${testData.badge.badgeId}`),
      );

      expect(response.status).toBe(200);

      const responseData = (await response.json()) as ApiResponse<BadgeData>;
      expect(responseData.status).toBe("success");
      expect(responseData.data?.badge).toBeDefined();
      expect(responseData.data?.badge.badgeId).toBe(testData.badge.badgeId);
    });

    it("should return 404 for non-existent badge", async () => {
      const response = await app.fetch(
        new Request("http://example.com/api/badges/non-existent-id"),
      );

      expect(response.status).toBe(404);

      const responseData = (await response.json()) as ApiResponse<any>;
      expect(responseData.status).toBe("error");
      expect(responseData.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /badges", () => {
    it("should create a new badge", async () => {
      const requestBody = {
        issuerId: testData.issuer.issuerId,
        name: "New Test Badge",
        description: "A new test badge for integration tests",
        criteria: "Test criteria for earning this badge",
        imageUrl: "https://example.com/new-badge.png",
      };

      const response = await app.fetch(
        new Request("http://example.com/api/badges", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }),
      );

      expect(response.status).toBe(201);

      const responseData = (await response.json()) as ApiResponse<BadgeData>;
      expect(responseData.status).toBe("success");
      expect(responseData.data?.badge).toBeDefined();
      expect(responseData.data?.badge.name).toBe("New Test Badge");

      // Verify the badge was created in the database
      const badges = await testDb
        .select()
        .from(badgeClasses)
        .where(eq(badgeClasses.name, "New Test Badge"));

      expect(badges.length).toBe(1);
      expect(badges[0].issuerId).toBe(testData.issuer.issuerId);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await app.fetch(
        new Request("http://example.com/api/badges", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Missing required fields
          }),
        }),
      );

      expect(response.status).toBe(400);

      const responseData = (await response.json()) as ApiResponse<any>;
      expect(responseData.status).toBe("error");
    });
  });

  describe("PUT /badges/:id", () => {
    it("should update an existing badge", async () => {
      const requestBody = {
        name: "Updated Badge Name",
        description: "Updated badge description",
      };

      const response = await app.fetch(
        new Request(`http://example.com/api/badges/${testData.badge.badgeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }),
      );

      expect(response.status).toBe(200);

      const responseData = (await response.json()) as ApiResponse<BadgeData>;
      expect(responseData.status).toBe("success");
      expect(responseData.data?.badge).toBeDefined();
      expect(responseData.data?.badge.name).toBe("Updated Badge Name");

      // Verify the badge was updated in the database
      const badges = await testDb
        .select()
        .from(badgeClasses)
        .where(eq(badgeClasses.badgeId, testData.badge.badgeId));

      expect(badges.length).toBe(1);
      expect(badges[0].name).toBe("Updated Badge Name");
      expect(badges[0].description).toBe("Updated badge description");
    });
  });

  describe("DELETE /badges/:id", () => {
    it("should delete a badge without assertions", async () => {
      // First create a badge without assertions
      const [newBadge] = await testDb
        .insert(badgeClasses)
        .values({
          issuerId: testData.issuer.issuerId,
          name: "Badge To Delete",
          description: "This badge will be deleted",
          criteria: "Test criteria",
          imageUrl: "https://example.com/badge-to-delete.png",
          badgeJson: {
            "@context": "https://w3id.org/openbadges/v2",
            type: "BadgeClass",
            name: "Badge To Delete",
          },
        })
        .returning();

      const response = await app.fetch(
        new Request(`http://example.com/api/badges/${newBadge.badgeId}`, {
          method: "DELETE",
        }),
      );

      expect(response.status).toBe(200);

      const responseData = (await response.json()) as ApiResponse<{
        message: string;
      }>;
      expect(responseData.status).toBe("success");

      // Verify the badge was deleted from the database
      const badges = await testDb
        .select()
        .from(badgeClasses)
        .where(eq(badgeClasses.badgeId, newBadge.badgeId));

      expect(badges.length).toBe(0);
    });

    it("should not delete a badge with assertions", async () => {
      const response = await app.fetch(
        new Request(`http://example.com/api/badges/${testData.badge.badgeId}`, {
          method: "DELETE",
        }),
      );

      // The status code might vary depending on implementation
      const expectedStatus = response.status === 400 || response.status === 409;
      expect(expectedStatus).toBe(true);

      const responseData = (await response.json()) as ApiResponse<any>;
      expect(responseData.status).toBe("error");

      // Verify the badge still exists in the database
      const badges = await testDb
        .select()
        .from(badgeClasses)
        .where(eq(badgeClasses.badgeId, testData.badge.badgeId));

      expect(badges.length).toBe(1);
    });
  });
});
