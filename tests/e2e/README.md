# Bun Badges E2E Test Suite

This directory contains the End-to-End (E2E) test suite for the Bun Badges project. The tests are designed to validate the entire application from the API endpoints down to the database, with a focus on Open Badges 3.0 (OB3) compliance.

## Directory Structure

```
tests/e2e/
├── fixtures/                  # Test fixtures and constants
│   ├── constants.ts           # Shared constants
│   ├── contexts/              # JSON-LD contexts
│   ├── schemas/               # JSON schemas
│   ├── keys/                  # Test cryptographic keys
│   └── payloads/              # Sample request/response payloads
├── flows/                     # Test flows organized by domain
│   ├── auth/                  # Authentication tests
│   ├── badge-lifecycle/       # Full badge lifecycle flows
│   ├── core/                  # Core functionality tests
│   ├── cryptographic/         # Proof generation and verification
│   ├── recipient/             # Recipient handling tests
│   ├── status/                # Status list and revocation tests
│   └── structural/            # Badge structure validation tests
├── helpers/                   # Test helper functions
│   ├── test-logger.ts         # Logging utilities
│   └── test-utils.ts          # Core test utilities
├── setup/                     # Test environment setup
│   ├── environment.ts         # Environment configuration
│   └── server-setup.ts        # Test server setup
├── utils/                     # Test utilities
│   ├── db-utils.ts            # Database utilities
│   ├── request.ts             # Enhanced request utilities
│   ├── schema-validator.ts    # Schema validation utilities
│   └── validation.ts          # OB3 validation utilities
├── index.ts                   # Main entry point
└── README.md                  # Documentation (this file)
```

## Running the Tests

### Running All E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with coverage
npm run test:e2e:coverage
```

### Running Specific Test Categories

```bash
# Run badge lifecycle tests
npm run test:e2e:lifecycle

# Run authentication tests
npm run test:e2e:auth

# Run cryptographic tests
npm run test:e2e:crypto

# Run recipient handling tests
npm run test:e2e:recipient

# Run status list tests
npm run test:e2e:status

# Run structure validation tests
npm run test:e2e:structural
```

### Running in Docker

```bash
# Run E2E tests in Docker
npm run test:e2e:docker

# Run all tests (unit, integration, and E2E) in Docker
npm run test:all:docker
```

## Test Categories

### Badge Lifecycle Tests

Tests the complete lifecycle of a badge from creation to revocation, including:
- Badge creation
- Credential issuance
- Verification
- Revocation
- Re-verification after revocation

### Authentication Tests

Tests the OAuth authentication flow, including:
- User registration
- User login
- Token verification
- Protected endpoint access

### Cryptographic Tests

Tests for badge cryptographic proofs, including:
- Proof generation
- Signature verification
- Tampered credential detection

### Recipient Tests

Tests for recipient identification, including:
- Email recipients
- URL recipients
- DID recipients 
- Hashed vs. unhashed recipients

### Status List Tests

Tests for credential status management, including:
- Status list entry format
- Revocation
- Status list credential access

### Structural Tests

Tests for OB3 structure compliance, including:
- JSON-LD context validation
- Schema validation
- Required fields and types

## Utilities

### Test Request Utilities

The `request.ts` module provides functions for making common API requests:

```typescript
// Issue a test badge
const badgeData = await issueTestBadge(request, {
  name: "Test Badge",
  description: "A test badge",
  recipient: "test@example.com",
  token: userToken
});

// Verify a credential
const verificationResult = await verifyTestBadge(request, {
  id: badgeData.credentialId
});

// Revoke a credential
const revokeResult = await revokeTestBadge(
  request,
  badgeData.credentialId,
  userToken
);
```

### OB3 Validation Utilities

The `validation.ts` module provides functions for validating OB3 credentials:

```typescript
// Validate the full credential
const validationResult = validateOB3Credential(credential);

// Validate specific aspects
const contextResult = validateContexts(credential);
const structureResult = validateOB3Structure(credential);
const proofResult = validateProof(credential);
const statusResult = validateStatusList(credential);
const recipientResult = validateRecipient(credential);
```

### Schema Validation

The `schema-validator.ts` module provides schema validation utilities:

```typescript
// Validate against OB3 schema
const result = await validateAgainstSchema(credential);

// Validate against credential's own schema
const result = await validateAgainstCredentialSchema(credential);

// Check schema reference
const referenceCheck = validateSchemaReference(credential);
```

## Writing New Tests

When adding new tests, follow these guidelines:

1. **Place tests in the appropriate category**: Add your test file to the correct subdirectory in the `flows/` directory.

2. **Follow the naming convention**: Name your test file descriptively with the `.test.ts` extension.

3. **Use the provided utilities**: Leverage the existing test utilities for common operations.

4. **Setup and teardown**: Use the provided `setupTestEnvironment` and `teardownTestEnvironment` functions.

5. **Test isolation**: Ensure your tests are isolated and do not depend on the state of other tests.

Example:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "@/app";
import { 
  createTestServer 
} from "../../setup/server-setup";
import { 
  setupTestEnvironment, 
  teardownTestEnvironment 
} from "../../setup/environment";
import { resetDatabase } from "../../utils/db-utils";
import { issueTestBadge } from "../../utils/request";
import { validateOB3Credential } from "../../utils/validation";
import { registerAndLoginUser } from "../../helpers/test-utils";

describe("My New Test Suite", () => {
  // Test environment state
  let server: any;
  let request: any;
  let user: any;
  
  // Set up test environment
  beforeAll(async () => {
    await setupTestEnvironment();
    const testServer = createTestServer(app);
    server = testServer.server;
    request = testServer.request;
    await resetDatabase();
    user = await registerAndLoginUser(request);
  });
  
  // Clean up after tests
  afterAll(async () => {
    if (server) {
      server.close();
    }
    await teardownTestEnvironment();
  });

  it("should do something", async () => {
    // Your test code here
  });
});
```

## OB3 Compliance Coverage

This test suite has been designed to comprehensively validate compliance with the Open Badges 3.0 specification:

### 1. Structural Validation (`structural/`)
Tests ensure that badges adhere to the required OB3 structure:
- **Context Validation**: Verifies that credentials include all required JSON-LD contexts
  - Core VC context (`https://www.w3.org/2018/credentials/v1`)
  - OB3 context (`https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json`)
  - Optional contexts for specific features
- **Schema Validation**: Ensures credentials conform to the OB3 schema
  - Correct `credentialSchema` reference
  - Required credential types (`VerifiableCredential`, `OpenBadgeCredential`)
  - Properly structured `credentialSubject` with `achievement`
  - Proper issuer format
  - Correctly formatted dates

### 2. Cryptographic Proof (`cryptographic/`)
Tests validate the cryptographic integrity proofs:
- **Proof Structure**: Verifies proper `DataIntegrityProof` format with `eddsa-rdfc-2022` cryptosuite
- **Signature Verification**: Tests that signatures are successfully verified
- **Tamper Detection**: Tests that modified credentials are detected as invalid
- **Verification Method**: Ensures proper references to issuer's verification method

### 3. Recipient Handling (`recipient/`)
Tests cover different recipient identification formats:
- **Email Format**: Tests proper handling of email recipients with `mailto:` prefix
- **URL Format**: Tests URL-based recipient identifiers
- **DID Format**: Tests DID-based recipient identifiers  
- **Hashed Recipients**: Verifies privacy-preserving recipient hashing
  - Includes salt for security
  - Prevents exposure of plaintext identifiers

### 4. Status List and Revocation (`status/`)
Tests verify OB3 status list implementation:
- **Status List Structure**: Verifies `StatusList2021Entry` format
- **Revocation Process**: Tests complete revocation flow
- **Status Verification**: Ensures revoked credentials are properly detected
- **Status List Credential**: Tests access to the status list credential
- **Multiple Revocations**: Tests idempotent revocation
- **Sequential Issuance**: Ensures no conflicts in status lists with multiple credentials

### 5. Badge Lifecycle (`badge-lifecycle/`)
Tests the complete badge lifecycle:
- **Issue**: Tests badge creation and issuance
- **Verify**: Tests verification of valid badges
- **Revoke**: Tests badge revocation
- **Verify After Revocation**: Tests post-revocation verification

### 6. Authentication (`auth/`)
Tests authentication and authorization:
- **User Registration**: Tests user account creation
- **Authentication**: Tests obtaining and using authentication tokens
- **Protected Endpoints**: Tests access control to restricted operations
- **Invalid Credentials**: Tests rejection of invalid authentication attempts
