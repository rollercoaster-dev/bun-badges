import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import assertions from "@/routes/assertions.routes";
import { seedTestData, clearTestData, TestData } from "@/utils/test/db-helpers";
import { testDb } from "@/utils/test/integration-setup";
import { badgeAssertions } from "@/db/schema";
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

interface AssertionsData {
  assertions: Array<{
    assertionId: string;
    badgeId: string;
    [key: string]: any;
  }>;
}

interface AssertionData {
  assertion: {
    assertionId: string;
    badgeId: string;
    [key: string]: any;
  };
}

interface NewAssertionData {
  assertionId: string;
  assertion?: any;
  [key: string]: any;
}

interface RevocationData {
  message: string;
  reason?: string;
  [key: string]: any;
}

describe("Assertion Routes Integration Tests", () => {
  let app: Hono;
  let testData: TestData;

  beforeEach(async () => {
    app = new Hono();
    app.route("/api", assertions);
    testData = await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("GET /assertions", () => {
    it("should return a list of assertions", async () => {
      const response = await app.fetch(
        new Request("http://example.com/api/assertions"),
      );

      expect(response.status).toBe(200);

      const responseData =
        (await response.json()) as ApiResponse<AssertionsData>;
      expect(responseData.status).toBe("success");
      expect(responseData.data?.assertions.length).toBeGreaterThan(0);
      expect(responseData.data?.assertions[0].badgeId).toBeDefined();
    });

    it("should filter assertions by badgeId", async () => {
      const response = await app.fetch(
        new Request(
          `http://example.com/api/assertions?badgeId=${testData.badge.badgeId}`,
        ),
      );

      expect(response.status).toBe(200);

      const responseData =
        (await response.json()) as ApiResponse<AssertionsData>;
      expect(responseData.status).toBe("success");
      expect(responseData.data?.assertions.length).toBeGreaterThan(0);
      expect(responseData.data?.assertions[0].badgeId).toBe(
        testData.badge.badgeId,
      );
    });
  });

  describe("GET /assertions/:id", () => {
    it("should return a specific assertion", async () => {
      const response = await app.fetch(
        new Request(
          `http://example.com/api/assertions/${testData.assertion.assertionId}`,
        ),
      );

      expect(response.status).toBe(200);

      const responseData =
        (await response.json()) as ApiResponse<AssertionData>;
      expect(responseData.status).toBe("success");
      expect(responseData.data?.assertion).toBeDefined();
      expect(responseData.data?.assertion.assertionId).toBe(
        testData.assertion.assertionId,
      );
    });

    it("should return 404 for non-existent assertion", async () => {
      const response = await app.fetch(
        new Request("http://example.com/api/assertions/non-existent-id"),
      );

      expect(response.status).toBe(404);

      const responseData = (await response.json()) as ApiResponse<any>;
      expect(responseData.status).toBe("error");
      expect(responseData.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /assertions", () => {
    it("should create a new assertion", async () => {
      const requestBody = {
        badgeId: testData.badge.badgeId,
        recipient: {
          identity: "new-recipient@example.com",
          type: "email",
          hashed: false,
        },
        evidence: "https://example.com/new-evidence",
      };

      const response = await app.fetch(
        new Request("http://example.com/api/assertions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }),
      );

      expect(response.status).toBe(201);

      const responseData =
        (await response.json()) as ApiResponse<NewAssertionData>;
      expect(responseData.status).toBe("success");
      expect(responseData.data?.assertionId).toBeDefined();

      // Verify the assertion was created in the database
      const assertions = await testDb
        .select()
        .from(badgeAssertions)
        .where(
          eq(badgeAssertions.recipientIdentity, "new-recipient@example.com"),
        );

      expect(assertions.length).toBe(1);
      expect(assertions[0].badgeId).toBe(testData.badge.badgeId);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await app.fetch(
        new Request("http://example.com/api/assertions", {
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

  describe("POST /assertions/:id/revoke", () => {
    it("should revoke an assertion", async () => {
      const response = await app.fetch(
        new Request(
          `http://example.com/api/assertions/${testData.assertion.assertionId}/revoke`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reason: "Testing revocation",
            }),
          },
        ),
      );

      expect(response.status).toBe(200);

      const responseData =
        (await response.json()) as ApiResponse<RevocationData>;
      expect(responseData.status).toBe("success");

      // Verify the assertion was revoked in the database
      const assertions = await testDb
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, testData.assertion.assertionId));

      expect(assertions.length).toBe(1);
      expect(assertions[0].revoked).toBe(true);
      expect(assertions[0].revocationReason).toBe("Testing revocation");
    });

    it("should return 400 for missing revocation reason", async () => {
      const response = await app.fetch(
        new Request(
          `http://example.com/api/assertions/${testData.assertion.assertionId}/revoke`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          },
        ),
      );

      expect(response.status).toBe(400);

      const responseData = (await response.json()) as ApiResponse<any>;
      expect(responseData.status).toBe("error");
    });
  });
});
