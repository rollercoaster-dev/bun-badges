/**
 * E2E Tests Entry Point
 *
 * This file is the entry point for all E2E tests.
 * It sets up the test environment and imports all test files.
 */

// Set up environment variables for testing
process.env.NODE_ENV = "test";
process.env.E2E_TEST = "true";

// Import setup utilities
import { beforeAll, afterAll } from "bun:test";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
} from "./setup/environment";

// Global setup and teardown for all tests
beforeAll(async () => {
  console.log("Setting up E2E test environment...");
  await setupTestEnvironment();
});

afterAll(async () => {
  console.log("Tearing down E2E test environment...");
  await teardownTestEnvironment();
});

// Import all test files to ensure they're included in the test run

// Basic test to verify test infrastructure
import "./flows/badge-lifecycle/basic-flow.test";

// Badge lifecycle tests
import "./flows/badge-lifecycle/lifecycle-flow.test";

// Structural validation tests
import "./flows/structural/context-validation.test";
import "./flows/structural/schema-validation.test";

// Authentication tests
import "./flows/auth/oauth-flow.test";

// Cryptographic tests
import "./flows/cryptographic/proof-validation.test";

// Recipient tests
import "./flows/recipient/hashed-recipient.test";

// Status list tests
import "./flows/status/revocation-list.test";

// Note: Other test files will be added later after fixing import issues
// Core tests
// import "./flows/core/smoke.test";
// import "./flows/core/database.test";
// import "./flows/core/app.test";

// Authentication tests
// import "./flows/auth/oauth-flow.test";

// Cryptographic tests
// import "./flows/cryptographic/proof-validation.test";

// Recipient tests
// import "./flows/recipient/hashed-recipient.test";

// Status list tests
// import "./flows/status/revocation-list.test";

// Original OB3 compliance tests (will be deprecated once all tests are migrated)
// import "./flows/ob3-compliance.spec";

// Export test utilities for convenience
export * from "./helpers/test-utils";
export * from "./utils/request";
export * from "./utils/validation";
export * from "./utils/schema-validator";

// Export specific functions from db-utils to avoid ambiguity
import {
  resetDatabase as resetDbUtils,
  createTestTransaction,
} from "./utils/db-utils";
export { resetDbUtils, createTestTransaction };

// Export specific functions from environment
import {
  setupTestEnvironment as setupEnv,
  teardownTestEnvironment as teardownEnv,
} from "./setup/environment";
export { setupEnv, teardownEnv };

// Export specific functions from server-setup
import {
  createTestServer as createServer,
  createTestApp as createApp,
} from "./setup/server-setup";
export { createServer, createApp };

// Export fixtures for convenience
export * from "./fixtures/constants";
export * from "./fixtures/payloads/sample-credential";

// Create a simple mock app for tests that need it
import { createTestApp } from "./setup/server-setup";
export const testApp = createTestApp();

// Log that the E2E tests have been loaded
console.log("E2E test environment loaded");
