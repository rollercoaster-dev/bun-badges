/**
 * E2E Tests Entry Point
 *
 * This file exists to make imports resolve properly for the E2E tests.
 * It sets up any global configuration needed for E2E tests.
 */

// Import all test files to ensure they're included in the test run
import "./flows/core/smoke.test";
import "./flows/core/database.test";
import "./flows/core/app.test";
import "./flows/badges/badge-flow.test";
import "./flows/ob3-compliance.spec";

// Export test utilities for convenience
export * from "./helpers/test-utils";

// Set up global E2E test environment
process.env.NODE_ENV = "test";
process.env.E2E_TEST = "true";

// Create a simple mock app for tests that need it
import { Hono } from "hono";
export const honoApp = new Hono();

// Add basic health check
honoApp.get("/health", (c) => c.json({ status: "ok" }));

// Console log to confirm tests are being loaded
console.log("E2E test environment loaded");
