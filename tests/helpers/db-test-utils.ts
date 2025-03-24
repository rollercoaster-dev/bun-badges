/**
 * Database Test Utilities
 *
 * This module provides standardized database operations for tests.
 * It abstracts away the differences between Drizzle ORM and direct SQL
 * operations, providing consistent interfaces regardless of the execution
 * environment.
 */

import { db, dbPool } from "@/db/config";

/**
 * Safely select rows from the database
 * Falls back to SQL if ORM select is not available
 *
 * @param tableName The name of the table to select from
 * @param columns Array of column names to select
 * @param condition Optional WHERE condition
 * @param params Optional parameters for the condition
 * @param limit Optional limit
 * @returns The selected rows
 */
export async function testSelect(
  tableName: string,
  columns: string[] = ["*"],
  condition?: string,
  params: any[] = [],
  limit?: number,
): Promise<any[]> {
  try {
    let query = `SELECT ${columns.join(", ")} FROM ${tableName}`;

    if (condition) {
      query += ` WHERE ${condition}`;
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    if (dbPool && typeof dbPool.query === "function") {
      const result = await dbPool.query(query, params);
      return result?.rows || [];
    } else if (db && typeof db.execute === "function") {
      const result = await db.execute(query);
      return result?.rows || [];
    } else {
      throw new Error("No database access method available");
    }
  } catch (error) {
    console.error(`Error in testSelect for ${tableName}:`, error);
    throw error;
  }
}

/**
 * Safely insert a row into the database
 * Falls back to SQL if ORM insert is not available
 *
 * @param tableName The name of the table to insert into
 * @param data Object with column names as keys and values to insert
 * @param types Optional object with column names as keys and type annotations as values
 * @param returning Whether to return the inserted row
 * @returns The inserted row if returning is true
 */
export async function testInsert(
  tableName: string,
  data: Record<string, any>,
  types: Record<string, string> = {},
  returning: boolean = true,
): Promise<any> {
  try {
    const columns = Object.keys(data);
    const values = Object.values(data);

    // Build a parameterized query
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const query = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})${returning ? " RETURNING *" : ""}`;

    // Handle type annotations
    let typedQuery = query;
    columns.forEach((col, i) => {
      if (types[col]) {
        const search = new RegExp(`\\$${i + 1}(?![0-9])`, "g");
        typedQuery = typedQuery.replace(search, `$${i + 1}::${types[col]}`);
      }
    });

    // Try direct pool query first
    if (dbPool && typeof dbPool.query === "function") {
      const result = await dbPool.query(typedQuery, values);
      return returning ? result.rows[0] : undefined;
    }
    // Then try db.execute
    else if (db && typeof db.execute === "function") {
      const result = await db.execute(typedQuery);
      return returning ? result.rows[0] : undefined;
    }
    // Fall back to db.insert if available
    else {
      console.log(`Falling back to ORM insert for ${tableName}`);
      // Find the table in schema
      try {
        const schema = (db as any)?._schema;
        if (schema && schema[tableName]) {
          const result = await db.insert(schema[tableName]).values(data);
          return returning && typeof (result as any).returning === "function"
            ? (await (result as any).returning())[0]
            : undefined;
        }
      } catch (e) {
        console.error(`Failed to use ORM insert for ${tableName}:`, e);
      }

      throw new Error(`Cannot insert into ${tableName} - no available method`);
    }
  } catch (error) {
    console.error(`Error in testInsert for ${tableName}:`, error);
    throw error;
  }
}

/**
 * Safely update a row in the database
 * Falls back to SQL if ORM update is not available
 *
 * @param tableName The name of the table to update
 * @param data Object with column names as keys and values to update
 * @param conditionColumn The column name to use in the WHERE clause
 * @param conditionValue The value to match in the WHERE clause
 * @param types Optional object with column names as keys and type annotations as values
 * @param returning Whether to return the updated row
 * @returns The updated row if returning is true
 */
export async function testUpdate(
  tableName: string,
  data: Record<string, any>,
  conditionColumn: string,
  conditionValue: any,
  types: Record<string, string> = {},
  returning: boolean = true,
): Promise<any> {
  try {
    const columns = Object.keys(data);
    const values = Object.values(data);

    // Build the SET clause
    const setClauses = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");

    // Build the full query
    const conditionIndex = values.length + 1;
    const query = `UPDATE ${tableName} SET ${setClauses} WHERE ${conditionColumn} = $${conditionIndex}${returning ? " RETURNING *" : ""}`;

    // All values plus the condition value
    const allValues = [...values, conditionValue];

    // Handle type annotations
    let typedQuery = query;
    columns.forEach((col, i) => {
      if (types[col]) {
        const search = new RegExp(`\\$${i + 1}(?![0-9])`, "g");
        typedQuery = typedQuery.replace(search, `$${i + 1}::${types[col]}`);
      }
    });
    if (types[conditionColumn]) {
      const search = new RegExp(`\\$${conditionIndex}(?![0-9])`, "g");
      typedQuery = typedQuery.replace(
        search,
        `$${conditionIndex}::${types[conditionColumn]}`,
      );
    }

    // Try direct pool query first
    if (dbPool && typeof dbPool.query === "function") {
      const result = await dbPool.query(typedQuery, allValues);
      return returning ? result.rows[0] : undefined;
    }
    // Then try db.execute
    else if (db && typeof db.execute === "function") {
      const result = await db.execute(typedQuery);
      return returning ? result.rows[0] : undefined;
    }
    // Fall back to db.update if available
    else {
      console.log(`Falling back to ORM update for ${tableName}`);
      try {
        const schema = (db as any)?._schema;
        if (schema && schema[tableName]) {
          // Create the condition
          const eq = (col: any, val: any) => ({
            operator: "=",
            left: col,
            right: val,
          });
          const condition = eq(
            schema[tableName][conditionColumn],
            conditionValue,
          );

          // Update using ORM
          const result = await db
            .update(schema[tableName])
            .set(data)
            .where(condition as any);
          return returning && typeof (result as any).returning === "function"
            ? (await (result as any).returning())[0]
            : undefined;
        }
      } catch (e) {
        console.error(`Failed to use ORM update for ${tableName}:`, e);
      }

      throw new Error(`Cannot update ${tableName} - no available method`);
    }
  } catch (error) {
    console.error(`Error in testUpdate for ${tableName}:`, error);
    throw error;
  }
}

/**
 * Safely delete rows from the database
 * Falls back to SQL if ORM delete is not available
 *
 * @param tableName The name of the table to delete from
 * @param conditionColumn Optional column name to use in the WHERE clause
 * @param conditionValue Optional value to match in the WHERE clause
 * @param conditionType Optional type annotation for the condition value
 */
export async function testDelete(
  tableName: string,
  conditionColumn?: string,
  conditionValue?: any,
  conditionType?: string,
): Promise<void> {
  try {
    let query = `DELETE FROM ${tableName}`;
    const params: any[] = [];

    if (conditionColumn && conditionValue !== undefined) {
      params.push(conditionValue);
      let condition = `${conditionColumn} = $1`;
      if (conditionType) {
        condition = `${conditionColumn} = $1::${conditionType}`;
      }
      query += ` WHERE ${condition}`;
    }

    // Try direct pool query first
    if (dbPool && typeof dbPool.query === "function") {
      await dbPool.query(query, params);
      return;
    }
    // Then try db.execute
    else if (db && typeof db.execute === "function") {
      await db.execute(query);
      return;
    }
    // Fall back to db.delete if available
    else {
      console.log(`Falling back to ORM delete for ${tableName}`);
      try {
        const schema = (db as any)?._schema;
        if (schema && schema[tableName]) {
          if (conditionColumn && conditionValue !== undefined) {
            // Create the condition
            const eq = (col: any, val: any) => ({
              operator: "=",
              left: col,
              right: val,
            });
            const condition = eq(
              schema[tableName][conditionColumn],
              conditionValue,
            );

            // Delete using ORM
            await db.delete(schema[tableName]).where(condition as any);
          } else {
            // Delete all
            await db.delete(schema[tableName]);
          }
          return;
        }
      } catch (e) {
        console.error(`Failed to use ORM delete for ${tableName}:`, e);
      }

      throw new Error(`Cannot delete from ${tableName} - no available method`);
    }
  } catch (error) {
    console.error(`Error in testDelete for ${tableName}:`, error);
    throw error;
  }
}

/**
 * Clean up test data from the database
 *
 * @param options Options for cleanup
 */
export async function cleanupTestData(
  options: {
    assertions?: boolean;
    badges?: boolean;
    issuers?: boolean;
    users?: boolean;
    tokens?: boolean;
    keys?: boolean;
    all?: boolean;
  } = { all: true },
): Promise<void> {
  try {
    // Disable foreign key checks if possible
    try {
      if (dbPool && typeof dbPool.query === "function") {
        await dbPool.query("SET session_replication_role = 'replica'");
      }
    } catch (error) {
      console.warn(
        "Could not disable foreign key checks, continuing anyway:",
        error,
      );
    }

    try {
      // Clean up in reverse dependency order
      if (options.all || options.assertions) {
        await testDelete("badge_assertions");
      }

      if (options.all || options.badges) {
        await testDelete("badge_classes");
      }

      if (options.all || options.keys) {
        await testDelete("signing_keys");
      }

      if (options.all || options.issuers) {
        await testDelete("issuer_profiles");
      }

      if (options.all || options.tokens) {
        await testDelete("verification_codes");
        await testDelete("revoked_tokens");
        await testDelete("oauth_access_tokens");
        await testDelete("oauth_refresh_tokens");
        await testDelete("oauth_authorization_codes");
        await testDelete("oauth_clients");
      }

      if (options.all || options.users) {
        await testDelete("users");
      }
    } finally {
      // Re-enable foreign key checks if possible
      try {
        if (dbPool && typeof dbPool.query === "function") {
          await dbPool.query("SET session_replication_role = 'origin'");
        }
      } catch (error) {
        console.warn("Could not re-enable foreign key checks:", error);
      }
    }

    console.log("✅ Test data cleanup successful");
  } catch (error) {
    console.error("Error cleaning up test data:", error);
    throw error;
  }
}

/**
 * Create random test data with the specified tables
 */
export async function createRandomTestData(
  options: {
    createUser?: boolean;
    createIssuer?: boolean;
    createBadge?: boolean;
    createAssertion?: boolean;
    createKey?: boolean;
  } = {},
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  try {
    // Create a test user
    if (options.createUser) {
      const userId = crypto.randomUUID();
      const email = `test-${Date.now()}@example.com`;

      const userData = {
        userId,
        email,
        name: "Test User",
        passwordHash: "not-a-real-hash",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const userTypes = {
        userId: "uuid",
        createdAt: "timestamp",
        updatedAt: "timestamp",
      };

      const user = await testInsert("users", userData, userTypes);
      results.user = user;

      // Use for later creations
      results.userId = userId;
    }

    // Create a test issuer
    if (options.createIssuer && (options.createUser || results.userId)) {
      const issuerId = crypto.randomUUID();

      const issuerData = {
        issuerId,
        name: "Test Issuer",
        url: "https://test-issuer.example.com",
        description: "A test issuer",
        email: "test-issuer@example.com",
        ownerUserId: results.userId || crypto.randomUUID(),
        issuerJson: JSON.stringify({
          "@context": "https://w3id.org/openbadges/v2",
          type: "Issuer",
          id: `https://test-issuer.example.com/issuers/${issuerId}`,
          name: "Test Issuer",
          url: "https://test-issuer.example.com",
          email: "test-issuer@example.com",
          description: "A test issuer for testing purposes",
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const issuerTypes = {
        issuerId: "uuid",
        ownerUserId: "uuid",
        issuerJson: "jsonb",
        createdAt: "timestamp",
        updatedAt: "timestamp",
      };

      const issuer = await testInsert(
        "issuer_profiles",
        issuerData,
        issuerTypes,
      );
      results.issuer = issuer;

      // Use for later creations
      results.issuerId = issuerId;
    }

    // Create a test key
    if (options.createKey && results.issuerId) {
      const keyId = crypto.randomUUID();
      const controller = `did:web:test-issuer.example.com`;

      const keyData = {
        keyId,
        issuerId: results.issuerId,
        type: "Ed25519VerificationKey2020",
        publicKeyMultibase: "z6MkrzXCdarP1kaZQXEX6CDRdcLYTk6bTEgGDgV5XQEyP4WB",
        privateKeyMultibase:
          "z3u2en7t8mxcz3s9wKaDTNWK1RA619VAXqLLGEY4ZD1vpCgPbR7yMkwk4Qj7TuuGJUTzpgvA",
        controller: controller,
        keyInfo: JSON.stringify({
          id: `${controller}#key-1`,
          type: "Ed25519VerificationKey2020",
          controller: controller,
          publicKeyMultibase:
            "z6MkrzXCdarP1kaZQXEX6CDRdcLYTk6bTEgGDgV5XQEyP4WB",
        }),
        revoked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const keyTypes = {
        keyId: "uuid",
        issuerId: "uuid",
        keyInfo: "jsonb",
        revoked: "boolean",
        createdAt: "timestamp",
        updatedAt: "timestamp",
      };

      const key = await testInsert("signing_keys", keyData, keyTypes);
      results.key = key;

      // Use for later creations
      results.keyId = keyId;
    }

    // Create a test badge
    if (options.createBadge && results.issuerId) {
      const badgeId = crypto.randomUUID();

      const badgeData = {
        badgeId,
        issuerId: results.issuerId,
        name: "Test Badge",
        description: "A test badge",
        imageUrl: "https://test-badge.example.com/image.png",
        criteria: "Test criteria",
        badgeJson: JSON.stringify({
          "@context": "https://w3id.org/openbadges/v2",
          type: "BadgeClass",
          id: `https://test-badge.example.com/badges/${badgeId}`,
          name: "Test Badge",
          description: "A test badge for testing purposes",
          image: "https://test-badge.example.com/image.png",
          criteria: {
            narrative: "Criteria for earning this badge",
          },
          issuer: `https://test-issuer.example.com/issuers/${results.issuerId}`,
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const badgeTypes = {
        badgeId: "uuid",
        issuerId: "uuid",
        badgeJson: "jsonb",
        createdAt: "timestamp",
        updatedAt: "timestamp",
      };

      const badge = await testInsert("badge_classes", badgeData, badgeTypes);
      results.badge = badge;

      // Use for later creations
      results.badgeId = badgeId;
    }

    // Create a test assertion
    if (options.createAssertion && results.badgeId && results.issuerId) {
      const assertionId = crypto.randomUUID();

      const assertionData = {
        assertionId,
        badgeId: results.badgeId,
        issuerId: results.issuerId,
        recipientType: "email",
        recipientIdentity: "test-recipient@example.com",
        recipientHashed: false,
        issuedOn: new Date(),
        assertionJson: JSON.stringify({
          "@context": "https://w3id.org/openbadges/v2",
          type: "Assertion",
          id: `https://test-badge.example.com/assertions/${assertionId}`,
          recipient: {
            type: "email",
            identity: "test-recipient@example.com",
            hashed: false,
          },
          issuedOn: new Date().toISOString(),
          badge: `https://test-badge.example.com/badges/${results.badgeId}`,
          verification: {
            type: "HostedBadge",
          },
        }),
        revoked: false,
        revocationReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const assertionTypes = {
        assertionId: "uuid",
        badgeId: "uuid",
        issuerId: "uuid",
        recipientHashed: "boolean",
        issuedOn: "timestamp",
        assertionJson: "jsonb",
        revoked: "boolean",
        createdAt: "timestamp",
        updatedAt: "timestamp",
      };

      const assertion = await testInsert(
        "badge_assertions",
        assertionData,
        assertionTypes,
      );
      results.assertion = assertion;

      // Use for later creations
      results.assertionId = assertionId;
    }

    console.log("✅ Test data created successfully");
    return results;
  } catch (error) {
    console.error("Error creating test data:", error);
    throw error;
  }
}
