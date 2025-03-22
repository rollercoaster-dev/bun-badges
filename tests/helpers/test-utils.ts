/**
 * Test Utilities
 *
 * This module provides helper functions and utilities for testing,
 * making it easier to create standardized tests.
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import supertest from "supertest";
import { dbPool } from "@/db/config";
import { Context } from "hono";
import { mock } from "bun:test";
import { OB2BadgeAssertion } from "@/services/verification.service";
import { OpenBadgeCredential } from "@/models/credential.model";

/**
 * Create a test server with the provided Hono app
 */
export function createTestServer(app: Hono) {
  // Start the server on a random port
  const server = serve({ fetch: app.fetch, port: 0 });
  const port = (server.address() as { port: number }).port;

  // Create supertest client
  const request = supertest(`http://localhost:${port}`);

  console.log(`Test server started on port ${port}`);

  return { server, request, port };
}

/**
 * Test data helper class
 */
export class TestData {
  private data: Record<string, any>;

  constructor() {
    this.data = {};
  }

  set(key: string, value: any) {
    this.data[key] = value;
  }

  get(key: string) {
    return this.data[key];
  }
}

/**
 * Get OB2 assertion JSON for testing
 */
export function getOB2AssertionJson(assertionId: string): OB2BadgeAssertion {
  return {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Assertion",
    id: `https://example.com/assertions/${assertionId}`,
    recipient: {
      type: "email",
      identity: "test@example.com",
      hashed: false,
    },
    badge: {
      type: "BadgeClass",
      id: "https://example.com/badges/123",
      name: "Test Badge",
      description: "A test badge",
      image: "https://example.com/badges/123/image",
      criteria: {
        narrative: "The criteria for earning this badge",
      },
      issuer: {
        type: "Issuer",
        id: "https://example.com/issuers/789",
        name: "Test Issuer",
      },
    },
    verification: {
      type: "HostedBadge",
    },
    issuedOn: "2023-01-01T00:00:00Z",
  };
}

/**
 * Get OB3 credential JSON for testing
 */
export function getOB3CredentialJson(assertionId: string): OpenBadgeCredential {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: `https://example.com/assertions/${assertionId}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: "https://example.com/issuers/789",
      type: "Profile",
      name: "Test Issuer",
    },
    issuanceDate: "2023-01-01T00:00:00Z",
    credentialSubject: {
      id: "test@example.com",
      type: "email",
      achievement: {
        id: "https://example.com/badges/123",
        type: ["Achievement"],
        name: "Test Badge",
        description: "A test badge",
        image: {
          id: "https://example.com/badges/123/image",
          type: "Image",
        },
        criteria: {
          narrative: "The criteria for earning this badge",
        },
      },
    },
  };
}

/**
 * Update OB2 assertion JSON for testing
 */
export function updateOB2AssertionJson(
  assertionId: string,
  updates: Partial<OB2BadgeAssertion>,
): OB2BadgeAssertion {
  const base = getOB2AssertionJson(assertionId);
  return { ...base, ...updates };
}

/**
 * Update OB3 credential JSON for testing
 */
export function updateOB3CredentialJson(
  assertionId: string,
  updates: Partial<OpenBadgeCredential>,
): OpenBadgeCredential {
  const base = getOB3CredentialJson(assertionId);
  return { ...base, ...updates };
}

/**
 * Create a mock context for testing
 */
export function createMockContext(
  options: {
    headers?: Record<string, string>;
    params?: Record<string, string>;
    query?: Record<string, string>;
    user?: any;
    body?: any;
  } = {},
): Context {
  const c = {
    req: {
      header: (name: string) => {
        if (name === "Authorization") return options.headers?.Authorization;
        return options.headers?.[name] ?? null;
      },
      param: (name: string) => options.params?.[name] ?? null,
      query: (name: string) => options.query?.[name] ?? null,
      json: () => Promise.resolve(options.body || {}),
    },
    set: (key: string, value: any) => {
      (c as any)[key] = value;
    },
    get: (key: string) => (c as any)[key],
    status: (code: number) => {
      (c as any).statusCode = code;
      return c;
    },
    json: (data: any, status?: number) => {
      (c as any).body = data;
      if (status) (c as any).statusCode = status;
      (c as any).finalized = true;
      return c;
    },
    text: (data: string, status?: number) => {
      (c as any).body = data;
      if (status) (c as any).statusCode = status;
      (c as any).finalized = true;
      return c;
    },
    finalized: false,
    statusCode: 200,
  } as unknown as Context;

  return c;
}

/**
 * Reset the test database
 */
export async function resetDatabase(tables?: string[]) {
  const allTables = [
    "badge_assertions",
    "badge_classes",
    "issuer_profiles",
    "users",
    "oauth_clients",
    "oauth_authorization_codes",
    "oauth_access_tokens",
    "oauth_refresh_tokens",
  ];

  const tablesToReset = tables || allTables;

  for (const table of tablesToReset) {
    await dbPool.query(`TRUNCATE TABLE ${table} CASCADE`);
  }
}

/**
 * Create a mock response object
 */
export interface MockResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  json: () => Promise<any>;
}

/**
 * Create a mock response
 */
export function createMockResponse(
  status: number = 200,
  body: any = {},
  headers: Record<string, string> = {},
): MockResponse {
  return {
    status,
    headers,
    body,
    json: () => Promise.resolve(body),
  };
}

/**
 * Create a next function for middleware testing
 */
export function createNextFunction() {
  return mock(() => Promise.resolve());
}

/**
 * Run a chain of middleware functions
 */
export async function runMiddlewareChain(
  middlewares: Array<(c: Context, next: () => Promise<void>) => Promise<void>>,
  c: Context,
) {
  let currentIndex = -1;

  const runNext = async () => {
    currentIndex++;
    if (currentIndex < middlewares.length) {
      await middlewares[currentIndex](c, runNext);
    }
  };

  await runNext();
}
