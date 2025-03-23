# E2E Test Refactoring Tasks

## Phase 1: Foundation (1-2 days)

- [ ] Create new directory structure
  - [ ] Set up `tests/e2e/flows` with domain-specific subdirectories:
    - [ ] `badge-lifecycle/` - Full badge lifecycle flows
    - [ ] `auth/` - Authentication tests
    - [ ] `cryptographic/` - Proof generation and verification
    - [ ] `recipient/` - Recipient handling (hashed vs. unhashed)
    - [ ] `status/` - Status list and revocation
    - [ ] `structural/` - Badge structure validation
  - [ ] Organize `tests/e2e/helpers/` for test helper functions
    - [ ] `test-utils.ts` - Core test utilities
    - [ ] `crypto-utils.ts` - Cryptographic testing utilities
    - [ ] `schema-utils.ts` - Schema validation utilities
    - [ ] `flow-utils.ts` - Common test flow patterns
  - [ ] Create `tests/e2e/fixtures/` directory for test data
    - [ ] `schemas/` - JSON schemas
    - [ ] `contexts/` - JSON-LD contexts
    - [ ] `keys/` - Test cryptographic keys
    - [ ] `payloads/` - Sample request/response payloads

- [ ] Set up improved test environment configuration
  - [ ] Create `tests/e2e/setup/environment.ts` for centralized environment setup
  - [ ] Implement consistent environment variable handling
  - [ ] Add test-specific configuration loading
  - [ ] Create `tests/e2e/setup/server-setup.ts` for test server configuration

- [ ] Refactor database handling
  - [ ] Create pool per test run instead of globally
  - [ ] Implement proper cleanup mechanisms
  - [ ] Add transaction support for test isolation
  - [ ] Update `docker-compose.test.yml` with enhanced configuration

## Phase 2: Core Utilities (2-3 days)

- [ ] Develop enhanced test utilities
  - [ ] Create `tests/e2e/utils/request.ts` with improved request handling
    - [ ] Implement `issueTestBadge()` utility
    - [ ] Implement `verifyTestBadge()` utility
    - [ ] Implement `revokeTestBadge()` utility
  - [ ] Enhance authentication utilities
    - [ ] Improve `registerAndLoginUser()` with better error handling
    - [ ] Add support for different authentication strategies

- [ ] Create schema validation framework
  - [ ] Implement `tests/e2e/utils/schema-validator.ts`
  - [ ] Add `validateAgainstSchema()` function
  - [ ] Integrate OB3 JSON schemas

- [ ] Implement OB3 validation utilities
  - [ ] Create `tests/e2e/utils/validation.ts`
  - [ ] Implement `validateOB3Structure()` function
  - [ ] Implement `validateProof()` function
  - [ ] Implement `validateStatusList()` function
  - [ ] Implement `validateRecipient()` function
  - [ ] Add JSON-LD context validation

## Phase 3: Test Migration (3-4 days)

- [ ] Create compliance test factories
  - [ ] Implement `tests/e2e/helpers/compliance-tests.ts`
  - [ ] Add factory functions for structural tests
  - [ ] Add factory functions for cryptographic tests
  - [ ] Add factory functions for status tests
  - [ ] Add factory functions for recipient tests

- [ ] Migrate and enhance existing tests
  - [ ] Refactor OB3 compliance tests
  - [ ] Update badge lifecycle tests
  - [ ] Enhance authentication tests
  - [ ] Improve database integration tests

- [ ] Implement specific OB3 compliance test files
  - [ ] Create `tests/e2e/flows/structural/context-validation.test.ts`
  - [ ] Create `tests/e2e/flows/structural/schema-validation.test.ts`
  - [ ] Create `tests/e2e/flows/cryptographic/proof-generation.test.ts`
  - [ ] Create `tests/e2e/flows/cryptographic/signature-verification.test.ts`
  - [ ] Create `tests/e2e/flows/status/revocation-list.test.ts`
  - [ ] Create `tests/e2e/flows/recipient/hashed-recipient.test.ts`

- [ ] Create full lifecycle test flows
  - [ ] Implement issue → verify → revoke cycle tests
  - [ ] Add OAuth authentication flow tests
  - [ ] Create edge case tests (tampering, invalid signatures)

## Phase 4: Reporting and CI Integration (1-2 days)

- [ ] Implement compliance tracking
  - [ ] Create `tests/e2e/utils/compliance-tracker.ts`
  - [ ] Add `trackTest()` function for requirement tracking
  - [ ] Implement `generateComplianceReport()` function
  - [ ] Add mapping between tests and OB3 requirements

- [ ] Update scripts in package.json
  - [ ] Add granular test scripts for different test categories
  - [ ] Create combined test script with reporting
  - [ ] Configure test output formats

- [ ] Update CI configuration
  - [ ] Configure GitHub Actions for test categorization
  - [ ] Add test artifacts preservation
  - [ ] Set up test summaries in PR comments

- [ ] Create comprehensive test documentation
  - [ ] Update `tests/e2e/README.md` with detailed instructions
  - [ ] Document test utilities and their usage
  - [ ] Add examples for creating new tests
  - [ ] Create OB3 requirements-to-tests mapping document

## Example Implementations

### Structural Validation Test Example

```typescript
// tests/e2e/flows/structural/context-validation.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { 
  createTestServer, 
  cleanupTestResources,
  registerAndLoginUser 
} from "../../helpers/test-utils";
import { issueTestBadge } from "../../utils/request";
import { validateContexts } from "../../utils/validation";
import { OB3_CONTEXT_URL } from "../../fixtures/constants";
import { app } from "@/app";  // The real application

describe("OB3 Context Validation", () => {
  const { server, request } = createTestServer(app);
  let user;

  beforeAll(async () => {
    user = await registerAndLoginUser(request);
  });

  afterAll(async () => {
    await cleanupTestResources(server);
  });

  it("should include the official OB3 context URL", async () => {
    // Issue a standard badge
    const badge = await issueTestBadge(request, {
      name: "Context Test Badge",
      description: "Testing OB3 context validation",
      recipient: "recipient@example.com",
      token: user.token
    });

    // Validate contexts
    const result = validateContexts(badge);
    expect(result.valid).toBe(true);
    expect(badge["@context"]).toContain(OB3_CONTEXT_URL);
  });

  it("should handle context expansion correctly", async () => {
    // Issue a badge
    const badge = await issueTestBadge(request, {
      name: "Context Expansion Test",
      description: "Testing JSON-LD context expansion",
      recipient: "recipient@example.com",
      token: user.token
    });

    // Test context expansion using JSON-LD library
    const expanded = await expandJsonLd(badge);
    expect(expanded).toBeDefined();
    // Check expanded terms are using proper URLs
    expect(expanded.some(node => 
      node["https://purl.imsglobal.org/spec/ob/v3p0/schema/achievementCredential"]
    )).toBe(true);
  });
});
```

### Request Utility Example

```typescript
// tests/e2e/utils/request.ts
import { SuperTest } from "supertest";

export interface BadgeOptions {
  name: string;
  description: string;
  recipient: string;
  token: string;
  hashed?: boolean;
  salt?: string;
  // Other optional parameters
}

/**
 * Issues a test badge with the given options
 */
export async function issueTestBadge(
  request: SuperTest, 
  options: BadgeOptions
) {
  const response = await request
    .post("/api/badges")
    .set("Authorization", `Bearer ${options.token}`)
    .send({
      name: options.name,
      description: options.description,
      recipient: {
        identity: options.recipient,
        type: options.recipient.includes("@") ? "email" : "url",
        hashed: options.hashed || false,
        salt: options.salt
      },
      // Other badge properties
    });

  if (response.status !== 201) {
    throw new Error(`Failed to issue badge: ${JSON.stringify(response.body)}`);
  }

  return response.body;
}

/**
 * Verifies a test badge by ID
 */
export async function verifyTestBadge(
  request: SuperTest, 
  id: string
) {
  const response = await request
    .get(`/api/verify/${id}`);

  return {
    status: response.status,
    body: response.body,
    isValid: response.status === 200 && response.body.valid === true
  };
}

/**
 * Revokes a test badge by ID
 */
export async function revokeTestBadge(
  request: SuperTest, 
  id: string, 
  token: string,
  reason?: string
) {
  const response = await request
    .post(`/api/badges/${id}/revoke`)
    .set("Authorization", `Bearer ${token}`)
    .send({ reason: reason || "Testing revocation" });

  if (response.status !== 200) {
    throw new Error(`Failed to revoke badge: ${JSON.stringify(response.body)}`);
  }

  return response.body;
}
```

## Reference Structure

```
tests/
├── e2e/
│   ├── flows/                   # Test flows by domain
│   │   ├── badge-lifecycle/     # Full badge lifecycle flows
│   │   ├── auth/                # Authentication tests
│   │   ├── cryptographic/       # Proof generation and verification
│   │   ├── recipient/           # Recipient handling (hashed vs. unhashed)
│   │   ├── status/              # Status list and revocation
│   │   └── structural/          # Badge structure validation
│   ├── helpers/                 # Test helper functions
│   │   ├── test-utils.ts        # Core test utilities
│   │   ├── crypto-utils.ts      # Cryptographic testing utilities
│   │   ├── schema-utils.ts      # Schema validation utilities
│   │   └── flow-utils.ts        # Common test flow patterns
│   ├── fixtures/                # Test data
│   │   ├── schemas/             # JSON schemas
│   │   ├── contexts/            # JSON-LD contexts
│   │   ├── keys/                # Test cryptographic keys
│   │   └── payloads/            # Sample request/response payloads
│   ├── setup/                   # Test environment setup
│   │   ├── db-setup.ts          # Database setup/teardown
│   │   ├── server-setup.ts      # Test server setup
│   │   └── mocks.ts             # Common test mocks
│   ├── utils/                   # Low-level testing utilities
│   │   ├── db-utils.ts          # Database utilities
│   │   ├── validation.ts        # OB3 validation utilities 
│   │   └── request.ts           # Enhanced request utilities
│   ├── index.ts                 # Main entry point
│   └── README.md                # Documentation
``` 