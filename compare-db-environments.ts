#!/usr/bin/env bun

/**
 * PostgreSQL Environment Comparison Script
 *
 * This script analyzes and compares the PostgreSQL environments between
 * the test and development databases to identify potential differences
 * that could be causing SQL syntax errors in the tests.
 *
 * Usage:
 *   bun compare-db-environments.ts
 */

import pg from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();
dotenv.config({ path: "test.env", override: false }); // Load test env if it exists

// Log current environment
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL?.replace(/:[^:]*@/, ":****@"),
); // Mask password

// Connection details
const dbConnections = {
  development: process.env.DATABASE_URL,
  test:
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL?.replace(/\/([^/]*)$/, "/bun_badges_test"),
};

// Types
interface PgSetting {
  name: string;
  setting: string;
  category: string;
}

interface PgExtension {
  extname: string;
  extversion: string;
}

interface TableColumn {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  is_nullable: string;
  column_default: string | null;
}

interface TableIndex {
  indexname: string;
  indexdef: string;
}

interface TableStructure {
  name: string;
  columns: TableColumn[];
  indexes: TableIndex[];
}

interface SchemaInfo {
  tables: TableStructure[];
}

interface ServerInfo {
  version: string;
  settings: PgSetting[];
  extensions: PgExtension[];
}

// Logger helper
const log = {
  info: (...args: any[]) => console.log("ℹ️", ...args),
  error: (...args: any[]) => console.error("❌", ...args),
  section: (title: string) => console.log("\n==", title, "=="),
  compare: (key: string, dev: any, test: any) => {
    console.log(`${key}:`);
    console.log(`  Development: ${dev}`);
    console.log(`  Test:        ${test}`);
    console.log(`  Same:        ${dev === test ? "✅ Yes" : "❌ No"}`);
  },
};

/**
 * Get PostgreSQL version and server info
 */
async function getServerInfo(client: pg.Client): Promise<ServerInfo> {
  const versionQuery = await client.query("SELECT version()");
  const settingsQuery = await client.query(
    "SELECT name, setting, category FROM pg_settings WHERE name IN ('standard_conforming_strings', 'server_version', 'server_encoding', 'client_encoding', 'DateStyle', 'TimeZone', 'integer_datetimes', 'IntervalStyle', 'max_identifier_length')",
  );

  const extensionsQuery = await client.query(
    "SELECT extname, extversion FROM pg_extension",
  );

  return {
    version: versionQuery.rows[0].version,
    settings: settingsQuery.rows,
    extensions: extensionsQuery.rows,
  };
}

/**
 * Get schema information
 */
async function getSchemaInfo(
  client: pg.Client,
  schemaName = "public",
): Promise<SchemaInfo> {
  // Tables
  const tablesQuery = await client.query(
    "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
    [schemaName],
  );

  // Get table structure for a specific table
  const getTableStructure = async (
    tableName: string,
  ): Promise<TableStructure> => {
    const columnsQuery = await client.query(
      `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns 
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schemaName, tableName],
    );

    const indexesQuery = await client.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = $1 AND tablename = $2`,
      [schemaName, tableName],
    );

    return {
      name: tableName,
      columns: columnsQuery.rows,
      indexes: indexesQuery.rows,
    };
  };

  // Get structure for all tables
  const tables: TableStructure[] = [];
  for (const table of tablesQuery.rows) {
    if (table.table_type === "BASE TABLE") {
      tables.push(await getTableStructure(table.table_name));
    }
  }

  return { tables };
}

/**
 * Compare environments
 */
async function compareEnvironments(): Promise<void> {
  log.section("DATABASE ENVIRONMENT COMPARISON");

  // Connect to development database
  const devClient = new pg.Client(dbConnections.development);
  await devClient.connect();
  log.info("Connected to development database");

  // Connect to test database
  const testClient = new pg.Client(dbConnections.test);
  await testClient.connect();
  log.info("Connected to test database");

  try {
    // Compare server information
    log.section("SERVER INFORMATION");
    const devServerInfo = await getServerInfo(devClient);
    const testServerInfo = await getServerInfo(testClient);

    log.compare("Version", devServerInfo.version, testServerInfo.version);

    // Compare settings
    log.section("POSTGRESQL SETTINGS");
    const devSettings = devServerInfo.settings.reduce<Record<string, string>>(
      (acc, setting) => {
        acc[setting.name] = setting.setting;
        return acc;
      },
      {},
    );

    const testSettings = testServerInfo.settings.reduce<Record<string, string>>(
      (acc, setting) => {
        acc[setting.name] = setting.setting;
        return acc;
      },
      {},
    );

    for (const key of Object.keys(devSettings)) {
      log.compare(key, devSettings[key], testSettings[key]);
    }

    // Compare extensions
    log.section("INSTALLED EXTENSIONS");
    const devExtensions = devServerInfo.extensions
      .map((ext) => `${ext.extname} (${ext.extversion})`)
      .join(", ");
    const testExtensions = testServerInfo.extensions
      .map((ext) => `${ext.extname} (${ext.extversion})`)
      .join(", ");
    log.compare("Extensions", devExtensions, testExtensions);

    // Compare schema structure
    log.section("SCHEMA COMPARISON");
    const devSchema = await getSchemaInfo(devClient);
    const testSchema = await getSchemaInfo(testClient);

    // Compare table counts
    log.compare(
      "Table count",
      devSchema.tables.length,
      testSchema.tables.length,
    );

    // Find tables that exist in one but not the other
    const devTableNames = devSchema.tables.map((t) => t.name);
    const testTableNames = testSchema.tables.map((t) => t.name);

    const missingInTest = devTableNames.filter(
      (name) => !testTableNames.includes(name),
    );
    const missingInDev = testTableNames.filter(
      (name) => !devTableNames.includes(name),
    );

    if (missingInTest.length > 0) {
      log.info("Tables in dev but missing in test:", missingInTest.join(", "));
    }

    if (missingInDev.length > 0) {
      log.info("Tables in test but missing in dev:", missingInDev.join(", "));
    }

    // Detailed comparison of key tables
    const tablesToCompare = [
      "signing_keys",
      "badge_assertions",
      "badge_classes",
      "issuer_profiles",
      "status_lists",
    ];

    log.section("DETAILED TABLE COMPARISON");
    for (const tableName of tablesToCompare) {
      log.info(`Comparing table: ${tableName}`);

      const devTable = devSchema.tables.find((t) => t.name === tableName);
      const testTable = testSchema.tables.find((t) => t.name === tableName);

      if (!devTable) {
        log.error(`${tableName} doesn't exist in development database`);
        continue;
      }

      if (!testTable) {
        log.error(`${tableName} doesn't exist in test database`);
        continue;
      }

      // Compare columns
      const devColumns = devTable.columns.map(
        (c) =>
          `${c.column_name} ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ""} ${c.is_nullable === "YES" ? "NULL" : "NOT NULL"}`,
      );
      const testColumns = testTable.columns.map(
        (c) =>
          `${c.column_name} ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ""} ${c.is_nullable === "YES" ? "NULL" : "NOT NULL"}`,
      );

      const missingColsInTest = devColumns.filter(
        (col) => !testColumns.includes(col),
      );
      const missingColsInDev = testColumns.filter(
        (col) => !devColumns.includes(col),
      );

      if (missingColsInTest.length > 0) {
        log.error(
          `Columns in dev but missing/different in test for ${tableName}:`,
          missingColsInTest.join(", "),
        );
      }

      if (missingColsInDev.length > 0) {
        log.error(
          `Columns in test but missing/different in dev for ${tableName}:`,
          missingColsInDev.join(", "),
        );
      }

      if (missingColsInTest.length === 0 && missingColsInDev.length === 0) {
        log.info(`✅ Table ${tableName} has identical column structure`);
      }

      // Compare indexes
      const devIndexes = devTable.indexes.map((idx) => idx.indexdef);
      const testIndexes = testTable.indexes.map((idx) => idx.indexdef);

      const missingIdxInTest = devIndexes.filter(
        (idx) => !testIndexes.includes(idx),
      );
      const missingIdxInDev = testIndexes.filter(
        (idx) => !devIndexes.includes(idx),
      );

      if (missingIdxInTest.length > 0) {
        log.error(
          `Indexes in dev but missing in test for ${tableName}:`,
          missingIdxInTest.join("\n  "),
        );
      }

      if (missingIdxInDev.length > 0) {
        log.error(
          `Indexes in test but missing in dev for ${tableName}:`,
          missingIdxInDev.join("\n  "),
        );
      }

      if (missingIdxInTest.length === 0 && missingIdxInDev.length === 0) {
        log.info(`✅ Table ${tableName} has identical indexes`);
      }
    }

    // Test query execution of problematic queries
    log.section("QUERY EXECUTION TEST");

    // Get a sample issuer ID from each database
    const getIssuerId = async (client: pg.Client): Promise<string | null> => {
      const result = await client.query(
        "SELECT issuer_id FROM issuer_profiles LIMIT 1",
      );
      return result.rows.length > 0 ? result.rows[0].issuer_id : null;
    };

    const devIssuerId = await getIssuerId(devClient);
    const testIssuerId = await getIssuerId(testClient);

    if (devIssuerId) {
      log.info("Testing key retrieval query on development database");
      try {
        const keyQuery = await devClient.query(
          "SELECT * FROM signing_keys WHERE issuer_id = $1",
          [devIssuerId],
        );
        log.info(
          `✅ Key query successful in dev, returned ${keyQuery.rows.length} rows`,
        );
      } catch (error) {
        log.error("❌ Key query failed in dev:", (error as Error).message);
      }
    }

    if (testIssuerId) {
      log.info("Testing key retrieval query on test database");
      try {
        const keyQuery = await testClient.query(
          "SELECT * FROM signing_keys WHERE issuer_id = $1",
          [testIssuerId],
        );
        log.info(
          `✅ Key query successful in test, returned ${keyQuery.rows.length} rows`,
        );
      } catch (error) {
        log.error("❌ Key query failed in test:", (error as Error).message);
      }
    }

    // Summary
    log.section("COMPARISON SUMMARY");
    log.info("See above for detailed comparison results");
    log.info("Key differences to look for:");
    log.info("1. PostgreSQL version mismatches");
    log.info("2. Different encoding settings");
    log.info("3. Missing tables or schema differences");
    log.info("4. Index differences that could affect query planning");
  } finally {
    // Close connections
    await devClient.end();
    await testClient.end();
    log.info("Database connections closed");
  }
}

compareEnvironments().catch((error) => {
  log.error("Comparison failed:", error);
  process.exit(1);
});
