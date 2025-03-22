import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { Hono } from "hono";
import {
  createTestServer,
  cleanupTestResources,
  registerAndLoginUser,
  authenticatedRequest,
  resetDatabase,
} from "../../helpers/test-utils";
import { dbPool } from "@/db/config";

/**
 * This test suite focuses on database interactions,
 * testing CRUD operations through the API endpoints.
 */
describe("Database Operations E2E Tests", () => {
  // Create a test app for the real application
  const app = new Hono();

  // Set up mock endpoints for our test
  app.post("/auth/register", async (c) => {
    const body = await c.req.json();

    try {
      // Actually insert into database
      const result = await dbPool.query(
        "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING user_id as id",
        [
          body.email,
          "test_hash_for_" + body.password,
          body.name || "Test User",
        ],
      );

      const userId = result.rows[0].id;
      return c.json({ id: userId, email: body.email }, 201);
    } catch (error) {
      console.error("Error registering user:", error);
      return c.json({ error: "Failed to register user" }, 500);
    }
  });

  app.post("/auth/login", async (c) => {
    const body = await c.req.json();

    try {
      // Check if user exists
      const result = await dbPool.query(
        "SELECT user_id as id FROM users WHERE email = $1",
        [body.email],
      );

      if (result.rows.length === 0) {
        return c.json({ error: "Invalid credentials" }, 401);
      }

      const userId = result.rows[0].id;
      // In a real app, you'd verify the password here

      // Generate a mock token
      const token = "test_token_" + Date.now();

      return c.json({
        token,
        user: { id: userId, email: body.email },
      });
    } catch (error) {
      console.error("Error logging in user:", error);
      return c.json({ error: "Failed to login" }, 500);
    }
  });

  // Badge CRUD operations
  app.post("/badges", async (c) => {
    const auth = c.req.header("Authorization");
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();

    try {
      // Insert badge into database
      const result = await dbPool.query(
        `INSERT INTO badges 
         (name, description, criteria, image_url, issuer_id, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, name, description, created_at`,
        [
          body.name,
          body.description,
          JSON.stringify(body.criteria),
          body.image || "https://example.com/badge.png",
          body.issuerId || 1, // Default issuer ID
          body.createdBy || 1, // Default user ID
        ],
      );

      return c.json(result.rows[0], 201);
    } catch (error) {
      console.error("Error creating badge:", error);
      return c.json({ error: "Failed to create badge" }, 500);
    }
  });

  app.get("/badges/:id", async (c) => {
    const id = c.req.param("id");

    try {
      const result = await dbPool.query("SELECT * FROM badges WHERE id = $1", [
        id,
      ]);

      if (result.rows.length === 0) {
        return c.json({ error: "Badge not found" }, 404);
      }

      return c.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching badge:", error);
      return c.json({ error: "Failed to fetch badge" }, 500);
    }
  });

  app.put("/badges/:id", async (c) => {
    const id = c.req.param("id");
    const auth = c.req.header("Authorization");
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();

    try {
      const result = await dbPool.query(
        `UPDATE badges 
         SET name = $1, description = $2, criteria = $3, updated_at = NOW() 
         WHERE id = $4 
         RETURNING id, name, description, updated_at`,
        [body.name, body.description, JSON.stringify(body.criteria), id],
      );

      if (result.rows.length === 0) {
        return c.json({ error: "Badge not found" }, 404);
      }

      return c.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating badge:", error);
      return c.json({ error: "Failed to update badge" }, 500);
    }
  });

  app.delete("/badges/:id", async (c) => {
    const id = c.req.param("id");
    const auth = c.req.header("Authorization");
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    try {
      const result = await dbPool.query(
        "DELETE FROM badges WHERE id = $1 RETURNING id",
        [id],
      );

      if (result.rows.length === 0) {
        return c.json({ error: "Badge not found" }, 404);
      }

      return c.json({ message: "Badge deleted successfully" });
    } catch (error) {
      console.error("Error deleting badge:", error);
      return c.json({ error: "Failed to delete badge" }, 500);
    }
  });

  // Initialize test server
  const { server, request } = createTestServer(app);

  // Test variables
  let user: { token: string; email: string; password: string; userId: string };
  let badgeId: string;

  // Setup and teardown
  beforeAll(async () => {
    // Set up needed database schema if it doesn't exist
    await ensureTestTables();
  });

  beforeEach(async () => {
    // Reset database before each test
    await resetDatabase(["badges", "users", "assertions"]);
  });

  afterAll(async () => {
    await cleanupTestResources(server);
  });

  // Helper function to ensure test tables exist
  async function ensureTestTables() {
    try {
      // Check if badges table exists, create if not
      const tablesResult = await dbPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('badges', 'users', 'assertions')
      `);

      const existingTables = tablesResult.rows.map((row) => row.table_name);

      // Create users table if needed
      if (!existingTables.includes("users")) {
        await dbPool.query(`
          CREATE TABLE users (
            user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
      }

      // Create badges table if needed
      if (!existingTables.includes("badges")) {
        await dbPool.query(`
          CREATE TABLE badges (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            criteria JSONB,
            image_url TEXT,
            issuer_id INTEGER,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
      }

      // Create assertions table if needed
      if (!existingTables.includes("assertions")) {
        await dbPool.query(`
          CREATE TABLE assertions (
            id SERIAL PRIMARY KEY,
            badge_id INTEGER REFERENCES badges(id),
            recipient_email VARCHAR(255),
            issued_on TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
      }
    } catch (error) {
      console.error("Error ensuring test tables:", error);
      throw error;
    }
  }

  // Tests
  it("should register a user in the database", async () => {
    // Generate a unique email
    const email = `test_${Date.now()}@example.com`;

    const registerResponse = await request.post("/auth/register").send({
      email,
      password: "TestPassword123!",
      name: "DB Test User",
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.id).toBeDefined();

    // Verify the user was actually created
    const userResult = await dbPool.query(
      "SELECT *, user_id as id FROM users WHERE email = $1",
      [email],
    );

    expect(userResult.rows.length).toBe(1);
    expect(userResult.rows[0].email).toBe(email);
  });

  it("should perform a complete badge CRUD lifecycle", async () => {
    // 1. Register and login
    user = await registerAndLoginUser(request);

    // 2. Create a badge
    const badgeData = {
      name: "Database Test Badge",
      description: "Used for testing database operations",
      criteria: { narrative: "Complete database operation tests" },
    };

    const createResponse = await authenticatedRequest(
      request,
      "post",
      "/badges",
      user.token,
      badgeData,
    );

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.id).toBeDefined();
    badgeId = createResponse.body.id;

    // Verify badge exists in database
    const badgeResult = await dbPool.query(
      "SELECT * FROM badges WHERE id = $1",
      [badgeId],
    );

    expect(badgeResult.rows.length).toBe(1);
    expect(badgeResult.rows[0].name).toBe(badgeData.name);

    // 3. Read the badge
    const readResponse = await request.get(`/badges/${badgeId}`);

    expect(readResponse.status).toBe(200);
    expect(readResponse.body.id).toBe(badgeId);
    expect(readResponse.body.name).toBe(badgeData.name);

    // 4. Update the badge
    const updateData = {
      name: "Updated Test Badge",
      description: "This badge has been updated",
      criteria: { narrative: "Complete updated database tests" },
    };

    const updateResponse = await authenticatedRequest(
      request,
      "put",
      `/badges/${badgeId}`,
      user.token,
      updateData,
    );

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe(updateData.name);

    // Verify badge was updated in database
    const updatedResult = await dbPool.query(
      "SELECT * FROM badges WHERE id = $1",
      [badgeId],
    );

    expect(updatedResult.rows.length).toBe(1);
    expect(updatedResult.rows[0].name).toBe(updateData.name);

    // 5. Delete the badge
    const deleteResponse = await authenticatedRequest(
      request,
      "delete",
      `/badges/${badgeId}`,
      user.token,
    );

    expect(deleteResponse.status).toBe(200);

    // Verify badge was deleted from database
    const deletedResult = await dbPool.query(
      "SELECT * FROM badges WHERE id = $1",
      [badgeId],
    );

    expect(deletedResult.rows.length).toBe(0);
  });
});
