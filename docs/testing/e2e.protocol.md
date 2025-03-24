End-to-End Test Suite Development Plan for OB3 Compliance (Bun + Hono)

Overview and Goals

This plan outlines the development of a fully automated end-to-end (E2E) test suite for a Bun-powered backend using the Hono framework. The goal is to ensure Open Badges 3.0 (OB3) compliance across all API functionality, including badge issuance, verification, status/revocation, recipient handling, OAuth authentication, and cryptographic signing. We will use Bun’s built-in test runner (for speed and native integration), Supertest for simulating HTTP requests to our APIs, and Bun’s module mocking utilities for isolating external dependencies. All tests will run headlessly (no browser/UI), focusing on backend endpoints and data flows.

By the end of this implementation, we should have:
	•	Full coverage of the OB3 badge lifecycle: issue → verify → revoke, including structural validation, proof generation/verification, status list updates, and recipient ID formats.
	•	A reliable test architecture integrated with our development workflow and CI (GitHub Actions), including automated DB setup/teardown via Docker and Drizzle, and test coverage reporting.
	•	Documentation and examples to guide contributors in writing new tests and understanding OB3 compliance requirements.

E2E Testing Architecture

Testing Tools and Frameworks

Bun Test Runner: We will use Bun’s high-performance, Jest-like test runner to execute our test suites ￼. Bun’s runner supports TypeScript, has a familiar describe/test/expect API, and runs tests in a single process by default ￼ (with potential parallelization at the file level for speed). This gives us fast execution and direct access to Bun-specific APIs (like Bun’s web crypto and fetch) during tests. It also provides built-in code coverage support and CI integration (e.g. automatic GitHub Actions annotations) ￼.

Supertest (HTTP API Testing): For simulating HTTP requests to our Hono app’s routes, we’ll use Supertest. Supertest allows us to craft requests and assert on responses easily (e.g. request(app).post('/issue').send({...}).expect(201)). Since Hono apps use the Fetch API interface (rather than Node’s req,res), we may use the supertest-fetch adapter or Hono’s own testing helpers. We can wrap our Hono app.fetch handler in a way that Supertest can call it. For example, we can start our app with Bun.serve({ fetch: app.fetch }) on a random port during tests and point Supertest to http://localhost:<port> (or use Supertest’s ability to accept a request handler). Alternatively, Hono provides a built-in way to simulate requests: await app.request(url, options), which returns a Response ￼. In practice, we might prefer Hono’s app.request for simplicity and speed (no real network calls). However, using Supertest aligns with common Node testing practices, so we’ll support it (with adaptations if needed).

Bun’s Mocking Utilities: Bun’s test runner includes module mocking and spy functions out of the box ￼. We will use these to stub out external calls or heavy dependencies in our E2E tests. For example, if our verification logic needs to fetch an official JSON-LD context or call an OAuth provider, we can intercept those requests. Using mock.module('node-fetch', () => ({ default: fakeFetch })) allows us to supply a custom fetch implementation during tests (or we can monkey-patch globalThis.fetch). We can also use Bun’s mock to create spy functions for email/SMS dispatch, etc., if those are invoked during badge issuance. The goal is to ensure tests run in isolation, focusing on our service’s logic and not failing due to network calls or external systems.

Supporting Libraries: We’ll incorporate a JSON Schema validator (like Ajv) to validate badge JSON structures against OB3 schemas, and possibly a JSON-LD library for verifying context usage. For cryptography, we will rely on Node/Bun’s built-in crypto (Web Crypto API or Node’s crypto module) for generating and verifying Ed25519 signatures, along with any library (like tweetnacl) if needed for key pair generation. No browser automation tools are needed, as this is entirely headless API testing.

Test Execution Flow

Each E2E test will spin up the application (or use the in-memory app instance) and exercise the real HTTP routes through Supertest or app.request. The typical flow for a test case:
	1.	Setup: Prepare the environment – ensure the test database is reset and migrated, initialize any required config (like loading a test Ed25519 keypair into the app’s config or environment variables), and start the Hono app. We might do this once per test suite (using beforeAll) to avoid repetitive setup cost.
	2.	Perform requests: Use Supertest (or app.request) to simulate client requests to the API endpoints. E.g., call the badge issuance endpoint with sample data, or call the verification endpoint with a given badge ID. Because the app likely requires authentication (OAuth), our test will also handle obtaining or faking an OAuth token – e.g., by hitting the OAuth login route or by injecting a valid token directly if we can stub the verification of it.
	3.	Assertions: Check the HTTP response status and body for correctness. This includes verifying JSON responses, headers, etc. We will also perform deeper OB3 compliance checks on the response data (details in the OB3 test coverage section below). For example, after an /issue call, we not only expect a 201 Created, but also that the returned badge JSON conforms to the OB3 specification (has the correct context, schema reference, proof, etc.). We’ll leverage our schema validator and custom logic for those assertions.
	4.	Teardown/Cleanup: After tests, ensure any persistent side effects are cleaned (e.g. revoke any issued test badges, or simply wipe the DB if we are isolating each run). If we started a Bun HTTP server for Supertest, we’ll stop it (though using app.request avoids needing a live server). The database will be rolled back or cleared between tests to maintain isolation.

We will organize tests such that state is isolated per test whenever possible. Since Bun runs all tests in one process (with potential concurrency across files), we must be careful about shared state. Each test will use unique identifiers (e.g., a unique badge ID or recipient) to avoid collisions. For database isolation, see the Setup section for how we reset state between test files. If needed, we can run certain tests sequentially (Bun doesn’t yet have a test.concurrent feature ￼, but we can control concurrency by test organization).

Structuring Test Suites and Files

We will keep the test code in a dedicated top-level tests/ directory for clarity. The structure will mirror the application features for easy navigation. Proposed structure:

tests/
 ├── e2e/
 │    ├── badges/ 
 │    │     ├── issueBadge.e2e.test.ts
 │    │     ├── verifyBadge.e2e.test.ts
 │    │     ├── revokeBadge.e2e.test.ts
 │    │     └── recipientFormats.e2e.test.ts
 │    ├── auth/
 │    │     └── oauthFlows.e2e.test.ts
 │    ├── utils/
 │    │     └── ob3Schemas.ts    (helpers to load schemas, contexts)
 │    └── ... (other categories as needed)
 └── unit/  (if we write lower-level unit tests separately)
       └── ... 

	•	Naming Conventions: Each test file will use the .test.ts suffix (or .spec.ts) so that Bun picks it up automatically ￼. We append .e2e.test.ts for clarity that these are end-to-end tests (especially if we also have unit tests). For example, issueBadge.e2e.test.ts will test the end-to-end issuance flow. We group tests by domain: badges, auth, etc., and possibly further by feature (sub-folders if needed). Within a test file, we use describe blocks to group related scenarios (e.g., describe("Badge issuance")) and test("should issue a badge with valid OB3 payload", ...) for individual cases. This grouping helps structure the results and makes it clear which OB3 aspect is being tested.
	•	Test Case Organization: We will write test cases to cover:
	•	Happy path flows: e.g. successfully issuing a badge and verifying it.
	•	Edge cases and failure modes: e.g. attempting to verify a non-existent or tampered badge (expect failure), issuing a badge with missing fields (expect validation error).
	•	OB3 compliance checks: e.g. ensuring the recipient is hashed if required, or that an invalid signature is caught.
Each test case should ideally cover one primary verification point (single responsibility) and use concise assertions. We’ll use helper functions (in tests/utils) to reduce boilerplate (for example, a utility to create a test badge issuance payload, or to compute a recipient hash for comparison).
	•	Fixture Data: We may maintain a tests/fixtures/ directory for static files needed in tests. For example, JSON-LD context files (official OB3 context JSON), sample JSON schemas, or example badge JSON objects (to use as expected values or to test the validator). This keeps our test code cleaner and avoids network dependence (e.g., we will store context-3.0.3.json locally rather than fetch it live).

By following a clear folder structure and naming convention, developers can easily find relevant tests or add new ones. The structure also allows running subsets of tests if needed (e.g., bun test badges could run all badge-related tests, since Bun supports filtering by file path ￼).

Test Environment Setup

Dockerized PostgreSQL for Testing

We will use a dedicated PostgreSQL instance (via Docker) for running the tests, to mirror production behavior without risking production data. The simplest approach is a Docker Compose service or a one-off Docker container that we start for the test run:
	•	Local Setup: Define a docker-compose.yml (or simply instruct using Docker CLI) that starts a Postgres container on a known port (e.g. 5433) with a known user/password for testing. For example:

services:
  db_test:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: badgetester
      POSTGRES_PASSWORD: badgetester
      POSTGRES_DB: badges_test
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U badgetester -d badges_test"]
      interval: 5s
      retries: 5

This can be started before running bun test. We’ll ensure the application’s test config points to localhost:5433/badges_test. Alternatively, we can manually run docker run -d -p 5433:5432 --name badges_test -e POSTGRES_PASSWORD=badgetester postgres:15 to spin up a test DB ￼.

	•	Test DB Configuration: The application will be configured (via env vars or a config file) to use a separate database in test mode (e.g. DATABASE_URL=postgres://badgetester:badgetester@localhost:5433/badges_test). This ensures we never mix test data with development or production. In Bun, we might use an environment like BUN_ENV=test or NODE_ENV=test to load a test config.
	•	Running Migrations: Before tests begin, we need to apply the database schema. With Drizzle ORM, we likely have migration files or use Drizzle’s db.push to sync schema. In a global test setup (a beforeAll in our top-level E2E setup or a script invoked via bun test --preload), we will run the migrations against the test DB. We can call Drizzle’s migration function or shell out to drizzle-kit if available (e.g., bunx drizzle-kit push --config=drizzle.config.ts). This will ensure our test DB schema is up-to-date with the models.
	•	Database Cleanup: We want tests to start with a fresh state. The simplest strategy is to recreate the schema or truncate tables between tests:
	•	We can have a global teardown that drops all tables or the entire test database after all tests. However, since we run migrations at the start of each test run, a full teardown might be unnecessary if the container is ephemeral.
	•	For isolation between individual test cases (especially if tests run concurrently), we can wrap each test scenario in a transaction that rolls back. But simulating HTTP requests won’t easily allow wrapping the whole flow in one transaction. Instead, we might do truncate in between. For example, in a afterEach hook, execute TRUNCATE TABLE badge, issuer, ... CASCADE; to clear data. Drizzle allows executing raw SQL or we can use its ORM deletion methods to wipe tables.
	•	Another approach is to use separate schemas or databases per test file (not per test, which would be heavy). For instance, test file A could use badges_test_a and file B uses badges_test_b. However, this complicates config. Instead, we can serialize tests that modify global state heavily, or simply avoid parallelizing tests that hit the same tables. Given our test count, truncating between tests is likely sufficient.

In summary, our test setup script will:
	1.	Launch (or ensure running) the Postgres test container.
	2.	Wait for it to be ready (the healthcheck or a simple retry loop).
	3.	Run Drizzle migrations to prepare schema.
	4.	Then start executing tests.

Drizzle ORM and Data Reset

We will leverage Drizzle ORM for database operations in tests just as in the application. For example, if we need to seed some data (like a known issuer or badge class) for a test, we can use Drizzle to insert that in a beforeEach. Drizzle’s strong typing will ensure our seed data matches the schema.

For resetting data:
	•	Drizzle doesn’t have a built-in “reset database” function, so we’ll either use raw SQL or write a small helper that uses Drizzle metadata to drop data. A straightforward way is raw SQL: e.g., await db.execute(sql\TRUNCATE TABLE “Badge”, “Assertion”, “Issuer” RESTART IDENTITY CASCADE;`);` to clear all badge-related tables.
	•	We can place this in an afterEach for tests that alter data, or more conservatively in a beforeEach so every test starts with a clean slate. (If tests are grouped such that each file can handle its own setup/teardown, we might do it per file to reduce overhead.)
	•	Another option is to use NODE_ENV=test configurations that point to an in-memory Postgres if available. While Postgres itself isn’t in-memory, there are projects or test harnesses (like pg-mem) that simulate Postgres in memory for tests. However, using a real Postgres via Docker is more faithful. If test speed becomes an issue due to DB I/O, we can revisit such options.

During test development, we’ll also ensure Drizzle’s connections are properly closed at the end (especially if Bun’s process remains open). Typically, one might not need to close a pool if the process exits, but since Bun runs tests in-process, we might manually call db.end() or similar if using node-postgres to avoid warnings.

Example: Basic test setup (simplified):

// tests/e2e/setup.ts (if using bun:test lifecycle hook)
import { beforeAll, afterAll } from 'bun:test';
import { migrate } from 'drizzle-orm';  // hypothetical migrate function
import { db } from '../src/db';         // Drizzle DB instance

beforeAll(async () => {
  // Ensure DB is up (perhaps attempt connection until success)
  await migrate(db);  // apply migrations to test DB
});

afterAll(async () => {
  // Optionally, drop all data or close DB connection
  await db.execute(/* SQL to truncate tables if needed */);
  await db.end?.(); 
});

Bun’s test runner supports global hooks or using a preload script ￼. We might configure bunfig.toml to run a setup file before tests, which could handle DB initialization.

Open Badges 3.0 Compliance Test Coverage

Open Badges 3.0 is based on the W3C Verifiable Credentials (VC) model ￼, meaning our badges are a type of Verifiable Credential with a specific JSON-LD context and a Linked Data proof for authenticity. The E2E test suite will thoroughly exercise and validate all aspects of OB3 compliance:

1. Structural Validation of Badge Objects

Each issued badge (credential) will be validated against the OB3 structure:
	•	JSON-LD Context: The badge JSON must include the official OB3 context URL in the @context (e.g. https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json) ￼. We will test that the context array in our badge includes the OB3 context (and any other required contexts, such as W3C VC context). The test suite will load the official context JSON file (stored in tests/fixtures/context-3.0.3.json) and ensure our badge fields align with the terms defined.
	•	JSON Schema Compliance: OB3 spec provides a JSON Schema for achievement credentials ￼. We will integrate this schema (downloaded from the OB3 spec site) and use a validator (like Ajv) in tests. After a badge issuance, we’ll run the returned credential JSON through the schema validation. The test passes this step only if the credential satisfies all required fields/types as per OB3. This catches missing fields (e.g., missing id or type), incorrect formats, etc. We will include negative tests too: e.g., if we intentionally omit a required field in an issuance request, the API should reject it (and our tests will confirm it).
	•	Badge Components: OB3 credentials still logically contain an Issuer, an Assertion (the credential itself), and possibly an Achievement/BadgeClass reference (OB3 might embed or reference an achievement definition). Our tests will verify that:
	•	The issuer profile is properly embedded or referenced (depending on our design). If our API returns the issuer as part of the credential (with an issuer field containing name, URL, public key etc.), we check those.
	•	The badge has the correct type hierarchy. Likely type: ["VerifiableCredential", "OpenBadgeCredential"] ￼. We ensure both are present.
	•	Fields like name, description, criteria (if part of OB3 achievement) appear and match what was input at issuance.
	•	The credentialSchema property is present, pointing to the OB3 JSON schema URL (per spec, credentials should include a reference to the schema used ￼). We confirm our badges include the OB3 schema URL in credentialSchema.id.

By automating these checks, we ensure our implementation’s outputs are structurally compliant with OB3 from the get-go, preventing surprises with official validators. (OB3’s own validator would likely perform similar checks.)

2. Cryptographic Proof Generation and Verification

OB3 credentials must be verifiable via a cryptographic proof (in line with W3C Data Integrity proofs or JWTs). Our application uses Ed25519 keys to sign badges, so we likely employ a Linked Data Proof (e.g., DataIntegrityProof with EdDSA/Ed25519) ￼. The test suite will rigorously test this:
	•	Proof Presence and Format: When a badge is issued, the JSON should contain a proof object. We’ll verify that it includes expected fields: type (e.g., DataIntegrityProof or specifically Ed25519Signature2020), created (timestamp), verificationMethod (the public key identifier), proofPurpose (likely assertionMethod), and the proofValue or jws signature. We compare these against OB3 expectations. For instance, OB3 aligns with VC Data Integrity v1.0, which suggests using the data-integrity context and proofValue for Ed25519. Our test will confirm the proof.type matches what we intend to use (Ed25519Signature spec).
	•	Signature Verification: The E2E tests will cryptographically verify the proof. Using the issuer’s public key (which our app should expose or have in the credential), the test will attempt to verify the signature on the credential. We can do this by reconstructing the signing input. If using Linked Data Proofs, this involves canonicalizing the JSON-LD and verifying the signature (which may be non-trivial to do manually). As a pragmatic approach, since our app itself likely has a verification routine (and maybe an API endpoint /verify), we will use that for E2E testing. For example, after issuing a badge, call our GET /verify?credentialId=<id> endpoint. This should trigger the app’s verification logic (which checks the signature and returns a result). Our test asserts that the verify response indicates success (e.g., {"valid": true} or HTTP 200 with verification details).
Additionally, we perform an independent verification in the test using a crypto library: e.g., use Node’s crypto.verify for Ed25519. If our proof is a simple detached signature over the normalized credential, we’ll attempt to verify it. This double-checks our app’s verification and ensures the signature is truly valid (and not just assumed valid by the app).
	•	Invalid Signature Test: To ensure the system catches tampering, we include a test where we modify the credential (or signature) and verify it. For instance, take a valid badge, flip one byte in the proofValue, and call the verify endpoint or function. It should detect the invalid signature and respond accordingly (e.g., {"valid": false} or HTTP 400). Similarly, if any data in the badge is altered (e.g., change the badge name after it was signed), verification should fail. These tests give us confidence in the robustness of the proof mechanism.
	•	Multiple Proofs / Key Rotation: If our system supports multiple proof formats or key rotations (perhaps out of scope initially), we would test that as well. OB3 allows either Linked Data Proofs or JWT-based proofs ￼. If we ever support JWT, we’d test that issuance and verification via JWT also works. But focusing on Ed25519 Data Integrity proofs is sufficient for now.

The cryptographic tests ensure our implementation meets the OB3 security requirement that badges are verifiably authentic using Ed25519 keys (as OB3 expects issuers to sign credentials with a proof method ￼).

3. Status List and Revocation Logic

Open Badges 3.0 introduces a standardized way to handle revocations by using credential status mechanisms (like status lists) ￼ ￼. Our app likely implements the 1EdTech Revocation List method or a similar approach to mark badges as revoked. The test suite will cover:
	•	Issuance with Status Field: When a badge is first issued, if our implementation uses status lists, the credential should include a credentialStatus property. For example, credentialStatus: { id: "<statusListURL>#<index>", type: "RevocationList2020Status", statusListIndex: <n>, statusListCredential: "<statusListURL>" }. The tests will check that this property exists and is correctly formed on issuance. The statusListIndex (or equivalent) should be unique per credential, and statusListCredential should point to a list maintained by the issuer. We’ll also verify that the status is set to “active” initially (some implementations might not include an explicit field if the absence means good standing).
	•	Revocation Flow: We will simulate revoking a badge via the appropriate API route (e.g., POST /badges/{id}/revoke or maybe an OAuth-protected admin route). After invoking revocation, the test will:
	•	Confirm the API response (e.g., 200 OK and maybe a response body indicating success or the updated status).
	•	Fetch or retrieve the updated credential (maybe via a GET assertion endpoint or from DB) and verify that its credentialStatus now indicates it is revoked. If using the Revocation List, this might mean the bit at the badge’s index in the list is set to 1 (revoked). The app might not directly expose the list, but if it does (some APIs might allow querying the status list), we can retrieve it and check the entry.
	•	Use the verification endpoint on the revoked credential. The verification should fail or indicate revocation. For example, GET /verify on a revoked badge might return {"valid": false, "reason": "revoked"} or some error. Our test asserts that a revoked badge is no longer considered valid by the system.
	•	Status List Content: If the status list is accessible (e.g., at a URL our app serves), we will fetch it in tests. OB3’s Revocation List is typically a VC itself with an encoded bitstring of revocation statuses ￼. We can parse the list (it might be JSON with a bitstring or array) to ensure the index for our test badge is marked. This directly tests that our issuance incremented the list size if necessary and that revocation updated it. If our app doesn’t expose the raw list, we rely on the verify endpoint behavior as a proxy.
	•	Multiple Revocations and Edge Cases: We will test revoking a badge that is already revoked (should be idempotent or return a clear message), and revoking an unknown badge (should return 404 or similar). Also, test that issuing a new badge after some revocations assigns a new index without conflict.

These tests ensure the revocation mechanism works end-to-end: the badge status is tracked and can be checked by verifiers, fulfilling OB3’s requirement for revocation capability ￼.

4. Recipient Identification Handling (Hashed vs Unhashed)

Open Badges historically allowed hashing recipient identifiers for privacy. OB3 (being a VC) typically uses an identifier (like an email or DID) in the credential subject. Our implementation likely supports both plaintext identifiers and hashed identifiers:
	•	Unhashed Recipient Test: Issue a badge to a recipient with a clear identifier (say an email or user ID). The resulting credential’s credentialSubject (or recipient) field should include that identifier in plaintext (e.g., "id": "mailto:recipient@example.com"). The test will confirm that the value is correct and that if an expected format is needed (like mailto: prefix or a DID), it matches.
	•	Hashed Recipient Test: Issue a badge with a hashed recipient identity (for privacy mode). Typically, OB v2 used recipient.salt and recipient.hashed true, with recipient.identity being a hash. In OB3/VC, we might represent this by simply storing a DID that encodes a hash or using a property to indicate hashing. Our test will simulate providing an email and a salt to the issuance API (if that’s how it works) or an option like ?hashed=true. After issuance:
	•	Verify that the credentialSubject contains a hash value instead of the plaintext (e.g., a SHA-256 hex string, often prefixed by sha256$ in OB2).
	•	If a salt was used, ensure the salt is either embedded or the output hash corresponds to email+salt. Possibly the salt might be stored in the badge (OB2 did, but OB3 might not allow arbitrary fields). If our system stores salt in DB but not in credential, that’s fine; we’ll just compute expected hash in test to compare.
	•	Confirm that recipientProfile or other data isn’t inadvertently exposing the plaintext.
	•	Verification of Hashed Recipient: We should test how verification works for hashed recipients. In OB2, to verify ownership, one would re-hash the user’s email and compare to the badge. In OB3, since verification is via signature, the focus is not on recipient email matching but on cryptographic proof. However, if our app provides a way to check a given recipient matches a badge (like the user enters email to “claim” a badge), we should test that. For now, we ensure that using hashed or unhashed recipients does not break the verification of the badge’s signature (it shouldn’t, as it’s just data in the payload).
	•	Consistency: Also test that if hashed=true was requested, the system indeed hashes; and if hashed=false, it stores plaintext. This might involve unit testing the hashing function (which we can do in isolation), but as an E2E test, we treat the API as a black box: give input and check output format.

These tests protect against accidentally revealing user info or failing to properly hash when intended. They ensure compliance with OB3’s recommendation for privacy (OB3 likely allows using DID or pseudonymous identifiers; hashing an email is one approach).

5. Full Protocol Flow Scenarios

In addition to isolated tests for each piece, we will have integration scenarios that simulate real-world flows:
	•	Issue → Verify → Revoke cycle: A test case will go through the entire lifecycle in one sequence:
	1.	Issue a badge via the API (authorized as an issuer). Assert 201 Created and get the badge ID or data.
	2.	Verify the issued badge (possibly by calling a verify endpoint or by checking the signature as described). Expect it to be valid.
	3.	Revoke the badge via the API. Assert success response.
	4.	Verify again after revocation, expecting a failure/invalid status now.
This scenario tests that all components work together: the badge that was just issued is immediately verifiable (ensuring no asynchronous signing issues), and revocation takes effect immediately for subsequent verification.
	•	OAuth Authentication Flow: OB3 APIs might require OAuth2 for certain operations (the prompt mentions OAuth authentication). We will simulate an OAuth dance in testing or shortcut it:
	•	For routes like badge issuance, the issuer might need to provide a Bearer token. Our tests will obtain a token by calling the OAuth endpoint if our app has one (for example, simulate a client credentials grant or resource owner password grant with test client credentials). Alternatively, if using an external IdP, we can mock the token introspection/verification. For simplicity, we might configure the app in test mode to accept a static token or disable external verification. One approach is to stub the OAuth provider responses: e.g., if the app calls GET https://oauth.example/introspect, we use Bun’s mock to intercept that and return a canned response that marks the token valid and associated with an issuer account.
	•	Once authenticated, proceed with the flow (issue badge, etc.) as normal. We ensure that protected endpoints reject unauthorized requests in tests. For example, call the issuance API without a token -> expect 401 Unauthorized. With an invalid token -> 401. With a valid token -> 201 success. This ensures our OAuth middleware is correctly integrated.
	•	Edge cases in flows: e.g., issuing two badges with the same data to see if any conflicts (should not, each gets unique ID), or issuing a badge then trying to issue another with the same evidence (should be fine, just testing idempotency if relevant).

By combining steps, these flows simulate realistic usage and verify that our system can handle sequences of operations correctly (especially state changes like revocation).

6. Use of Official OB3 Contexts and Schemas

To truly ensure compliance, our tests will use official OB3 contexts and schemas for validation:
	•	We will include the official OB3 JSON-LD context file in our tests (likely the one from IMS at version 3.0.3 ￼). This allows us to run a JSON-LD expansion or framing if needed to verify that all terms in our badge are defined by the context. For instance, OB3 context would define OpenBadgeCredential, recipient, RevocationList2021Status, etc. We can use a JSON-LD library to attempt an expand on our credential JSON (with a documentLoader that pulls from the local context file) and ensure no term is undefined (if a term were not in context, expansion would show it as a raw URL or blank).
	•	The official JSON Schema for OB3 AchievementCredential ￼ will be used, as mentioned. We will also store the schema file (perhaps ob_v3p0_achievementcredential_schema.json) in our test fixtures. Using Ajv, we compile this schema at test startup. When validating a credential, we will dereference the $schema in the credential (which should match OB3’s URL) and ensure it’s the one we expect. The schema check ensures conformance to required fields, data types, etc., beyond our manual assertions.
	•	If IMS provides an official validator or test vectors, we might incorporate them. The OB3 Implementation Guide includes test vectors for Linked Data Proofs (with known keys and signature outputs) ￼. We could use the provided test vector (a known key pair and a known credential) to verify that our verification code can validate that known credential. Conversely, we can take our system’s output and compare it to expected patterns from the spec (though each badge differs, the structure of the proof should match spec expectations like normalizing with the security context ￼).
	•	We will ensure our implementation uses the OB3 contexts exactly. For example, OB3 context 3.0.3 already includes the needed security context for data integrity proofs ￼ (so our badge might not need to list the security context separately if we use 3.0.3). Our tests will catch if an expected context is missing.

All these validation steps using official references give confidence that our badges will pass 1EdTech conformance testing and interoperate.

Bun-Specific Testing Considerations

While Bun provides a nearly seamless Node-like environment, there are a few caveats and solutions to address them in our test suite:

Node.js Compatibility and Polyfills

Bun aims for Node API compatibility, but certain Node modules or polyfilled globals might behave differently. For instance, if Supertest internally relies on Node’s http module, Bun does support node:http (as of Bun v1.x) but some low-level aspects might differ. In a known case, using supertest-fetch in Bun had issues with URL handling ￼. Potential quirks:
	•	URL Handling: Bun’s WHATWG URL implementation might be stricter. We saw errors like “Invalid URL” for paths like "/graphql" in some tests under Bun ￼. Solution: Always provide absolute URLs or use app.request which uses Request objects (which accept relative paths on a dummy base).
	•	HTTP Server: Bun’s Bun.serve returns a custom server object, not a Node Server. If Supertest expects a Node server, we can create one with Node’s http: e.g., import { createServer } from 'node:http'; const server = createServer(Bun.extend(app.fetch)); – where Bun.extend(app.fetch) might adapt a Web Fetch handler to Node’s API. We might instead avoid this by using app.request directly. In practice, we’ll likely use app.request for direct testing, and only use Supertest for high-level semantics (it gives nice syntax for expectations). We can use supertest against a running Bun.serve on localhost as a workaround, although that introduces actual HTTP calls. Another approach is using Supertest’s fetch-based version (supertest-fetch) which works with fetch handlers. If we encounter bugs, a workaround is to make assertions on Response objects directly (Hono’s app.request returns a Response which has status, headers, body).
	•	Global APIs: Ensure that Node globals used in tests are available. E.g., Buffer is globally available in Bun, as is process. But some Node-specific things like stream might differ. If we use any library that depends on Node streams or other polyfills, we may need to import node:stream explicitly. Bun does have many Node APIs (fs, path, crypto, etc.) – we will test early to catch any missing pieces. If something is missing, possible solutions: use a polyfill library or adjust the testing approach. For instance, if a library tries to use process.stdout.columns (maybe not implemented), we can monkey-patch it in tests.

Bun Test Runner Quirks

Bun’s test runner is new, so a few differences from Jest:
	•	No explicit done callback needed: We’ll rely on promises (async/await) in tests, which Bun handles. We must be careful to await all asynchronous operations (like app.request or DB queries) or return the Promise, to avoid tests finishing early.
	•	Concurrent test execution: Bun can execute test files in parallel threads for speed (though as of now, it runs tests in one process but can interleave async tasks). This is generally fine for us, but with a shared database, we need to avoid race conditions. We will run tests in a mostly sequential manner by design. If needed, we can set the environment variable BUN_TEST_WORKERS=1 or similar (if supported) to force single-thread, but we prefer to design tests to not conflict. Using unique data per test as mentioned mitigates this. We will also avoid using test.only or test.skip inadvertently in committed code, as Bun supports those (similar to Jest).
	•	Mocking: Bun’s mock API is slightly different than Jest’s. For example, mock.module('fs', ...) will replace import fs from 'fs' in the code under test. We have to ensure we call mock.module before the module is imported in our tests. Typically, that means doing mocks at the top of the test file (or using Bun’s --preload to set up mocks before all tests, if needed). We should document this in tests to avoid order issues.
	•	Time/Timers: If our code uses setTimeout or date functions (maybe for expiration logic), Bun test runner has some special handling for timers and date seeding ￼. We might not heavily use those, but Bun allows freezing Date or using fake timers. We will note that in case we need to simulate time (e.g., test an expired assertion), we could use Bun’s MockDate or similar ￼.

Any discovered Bun-specific issue during development will be documented with a workaround:
For example, if Supertest simply cannot hook into Hono easily under Bun, we will pivot to using app.request + custom assertions, and document that “Instead of Supertest, we use Hono’s testing utilities due to compatibility issues with Bun (as observed in issue #6736) ￼.” The plan is flexible to ensure we don’t get stuck; Bun’s environment is modern enough that most testing needs can be met with its built-ins or minor adjustments.

Module Resolution and Imports

Our application is built with Bun, so it likely uses ESM imports. Bun handles import { expect } from "bun:test" for test APIs, but we should ensure all our test files use the correct import (unlike Jest’s global expect, which Bun doesn’t auto-provide until you import it). We will include import { describe, it, expect, beforeAll, afterAll } from "bun:test"; at the top of each test file for clarity.

If we have any custom loaders or non-JS files to import (like importing JSON), Bun can import JSON natively or we handle it (we might JSON.parse the file content read via fs). Bun supports top-level await, but in tests it might be better to use explicit async functions.

Continuous Integration (CI) Integration

We will integrate the test suite into our CI pipeline (GitHub Actions) so that OB3 compliance is continuously checked on every commit.

Setting up Bun in CI

We will use the official oven-sh/setup-bun GitHub Action to install Bun in the CI runner ￼. In our workflow YAML (.github/workflows/ci.yml), we’ll include a job step:

- uses: oven-sh/setup-bun@v2
  with:
    bun-version: 'latest'   # or specify a version, e.g., '1.0.2'

This will install Bun and add it to the PATH, allowing us to run bun. Then:

- run: bun install    # install dependencies (if any, Bun uses its package manager)
- run: bun test --coverage --coverage-reporter=lcov

We also need the Postgres service for tests in CI. GitHub Actions supports service containers. We can add:

services:
  db_test:
    image: postgres:15-alpine
    env:
      POSTGRES_USER: badgetester
      POSTGRES_PASSWORD: badgetester
      POSTGRES_DB: badges_test
    ports:
      - 5433:5432
    options: >-
      --health-cmd "pg_isready -U badgetester -d badges_test" 
      --health-interval 5s --health-retries 5

This will start a Postgres that our tests can connect to (on host localhost:5433 in the runner). We ensure the app’s test config uses these same credentials.

Because Bun’s test runner will be controlling the process, we don’t explicitly need to run the app server in CI; the tests themselves instantiate and use the app. The workflow will simply run bun test. Bun will automatically produce nicely formatted results and even annotate failed lines in pull requests ￼.

Test Coverage and Reporting

We will leverage Bun’s built-in coverage tool to generate coverage data. Running bun test --coverage produces a summary in the console with percentages of lines/functions covered ￼ ￼. We want to also get an HTML or machine-readable report:
	•	LCOV Report: We will configure Bun to output LCOV coverage data. Bun supports --coverage-reporter=lcov which generates an lcov.info file ￼. In our bunfig.toml, we can set:

[test]
coverage = true
coverageReporter = ["text", "lcov"]
coverageDir = "coverage"

This ensures that when coverage is on, it saves the report in coverage/lcov.info. After the tests in CI, we’ll use actions to archive this or process it. For example, use the actions/upload-artifact to upload the whole coverage/ folder as an artifact, or use Codecov’s action to upload the lcov file to Codecov for nice visualization.

	•	HTML Report: If we want a quick HTML report for local viewing, we can add a step in our npm scripts or CI to use a tool like genhtml on the lcov file to produce HTML coverage. Alternatively, use a Node tool like istanbul-reports to convert lcov to html. This is more of a nice-to-have for devs to open in browser. We can include instructions in README on how to generate the HTML locally (e.g., “run bun test --coverage && npx lcov-to-html coverage/lcov.info outdir”).
	•	Coverage Thresholds: In bunfig.toml we could also set coverage thresholds (e.g., 90%) to make CI fail if coverage drops ￼. Initially we might not enforce this until tests are comprehensive.

Conformance Reporting: Beyond code coverage, we want to ensure we cover all OB3 requirements. We will maintain a mapping of OB3 spec requirements to our test cases (perhaps in documentation). For CI, we might output a simple summary: e.g., after tests, run a script that lists all test names related to OB3 features and mark which passed. However, since all tests must pass for CI anyway, a separate conformance report might be just the coverage report and a note that all OB3 tests succeeded. We could tag our OB3-specific tests (by naming or comments) and collect them if needed.

GitHub Actions will display failing tests in the job log with Bun’s output, which is straightforward. Bun’s automatic annotations mean if a test fails, you can see it directly in the PR diff.

Finally, we will schedule these tests to run on main branch regularly (perhaps via a nightly run as well) to catch any regressions, and ensure any contributor’s PR triggers the suite.

Realistic Cryptographic Testing (Key Management)

For credibility, our tests will use real cryptographic operations rather than mocks:
	•	We will generate or provision real Ed25519 key pairs for the issuer. In test configuration, we might have a fixed test issuer key (public/private). This can be stored securely in the repo (since it’s just for testing, not a security issue if leaked) or generated on the fly. A fixed key has the advantage that expected signatures could be known; however, given the complexity of Linked Data Proof normalization, it’s easier to dynamically verify than to compare to a precomputed value.
	•	The application likely reads an issuer private key from config or DB. In tests, we’ll ensure it uses the test key. For example, set env var ISSUER_PRIVATE_KEY to a base58 or PEM of a test Ed25519 key when running tests. The app then will sign with that key. We also have the public key (or did:key) corresponding to it for verification. This setup makes our test badges verifiable outside as well, if needed, because they use a real key.
	•	We explicitly avoid mocking the signing function because we want to test the real signature. However, in some unit tests, one might mock crypto to isolate logic, but not in E2E.
	•	If multiple issuer keys are supported, we can have tests for each (like if we rotate keys, ensure both old and new work).
	•	Security: We treat the test private key carefully (not used in non-test contexts). It’s fine if it’s in the code since it’s only for test badges which carry no real user data.

By using real keys, we also ensure that if there are any integration issues between our code and the underlying crypto library, we catch them. For instance, testing signing with our Ed25519 implementation and verifying via Web Crypto Ed25519 verify acts as a sanity check.

Headless (API-Only) Testing Scope

All tests will be headless, meaning they operate purely via HTTP requests and backend responses. There is no browser or UI involved. We are effectively performing black-box testing of the REST API using code. This keeps tests fast and focused. The plan explicitly excludes front-end or visual verification.

To avoid any ambiguity:
	•	We do not use Puppeteer or Selenium, etc.
	•	We assume the Hono app’s endpoints are fully testable without a UI (which they are, being an API).
	•	OAuth flows are tested by simulating redirect exchanges programmatically (e.g., hitting the callback URL with a code, etc., if we choose to test that fully, or by faking tokens as noted).

This also means our tests can run in any environment (CI, local) without needing a display or user interaction.

Example Test Cases and Implementation Tips

Below are a few example test scenarios with code snippets to illustrate how we will write the tests and utilize the utilities:

Example 1: Badge Issuance Happy Path

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { app } from "../../src/app";  // assume app is exported from our main server module

let authToken: string;
beforeAll(async () => {
  // Obtain an OAuth token for issuer (simulate OAuth or use a stubbed token).
  // For simplicity, suppose our app accepts a static token in test:
  authToken = "TEST_ISSUER_TOKEN";
});

afterAll(async () => {
  // cleanup if needed (e.g., delete issued badge from DB, or truncate via DB helper).
});

describe("Badge Issuance", () => {
  it("should issue a badge with valid OB3 structure and proof", async () => {
    const badgeRequest = {
      recipient: "recipient1@example.com",
      // additional badge metadata like achievementId, evidence, etc.
    };
    // Make the API call to issue a badge
    const res = await request(app.fetch.bind(app))  // using app.fetch with supertest via bind
      .post("/api/badges/issue")
      .set("Authorization", `Bearer ${authToken}`)
      .send(badgeRequest)
      .expect(201);
    
    const issuedBadge = res.body;
    expect(issuedBadge).toBeTruthy();
    // Basic structural checks
    expect(issuedBadge["@context"]).toContain("context-3.0.3.json");
    expect(issuedBadge.type).toEqual(expect.arrayContaining(["VerifiableCredential", "OpenBadgeCredential"]));
    expect(issuedBadge.issuer).toBeDefined();
    expect(issuedBadge.credentialSubject.id).toBe(`mailto:${badgeRequest.recipient}`);
    expect(issuedBadge.proof).toBeDefined();
    expect(issuedBadge.proof.proofPurpose).toBe("assertionMethod");
    // Validate against JSON Schema
    const valid = validateObSchema(issuedBadge);  // custom function using Ajv compiled schema
    expect(valid).toBe(true);
    // Verify signature via app's verify endpoint
    const verifyRes = await request(app.fetch.bind(app))
      .post("/api/badges/verify")
      .send({ credential: issuedBadge })
      .expect(200);
    expect(verifyRes.body.valid).toBe(true);
  });
});

Explanation: We post to /api/badges/issue with a recipient. We expect a 201 and get the badge JSON. We then perform a series of assertions:
	•	Check @context includes OB3 context URL.
	•	Check type array contains the required types.
	•	Check issuer field exists (could further validate its fields).
	•	Check credentialSubject.id is mailto:recipient.
	•	Check proof exists and has assertionMethod purpose (meaning the issuer signed it).
	•	Run a JSON schema validation (the function validateObSchema will use the OB3 schema loaded earlier; any errors would cause the test to fail).
	•	Use the verify API to confirm the badge is indeed valid. We might also directly verify signature with crypto here for additional assurance.

Using app.fetch.bind(app) as the target for Supertest is a trick to adapt the fetch handler to a function Supertest can call. If that doesn’t work, we’ll adjust as needed (perhaps by actually running Bun.serve on a port and using request('http://localhost:3000').post('/api/badges/issue')).

Example 2: Badge Verification Failure (Tampered Badge)

it("should detect a tampered badge as invalid", async () => {
  // First, issue a badge legitimately
  const res = await request(app.fetch.bind(app))
    .post("/api/badges/issue")
    .set("Authorization", `Bearer ${authToken}`)
    .send({ recipient: "recipient2@example.com" });
  const badge = res.body;
  // Tamper with the badge - e.g., change the recipient name
  badge.credentialSubject.name = "Eve Mallory";
  // Call verify API
  const verifyRes = await request(app.fetch.bind(app))
    .post("/api/badges/verify")
    .send({ credential: badge })
    .expect(200);
  expect(verifyRes.body.valid).toBe(false);
  expect(verifyRes.body.error).toMatch(/signature|proof/i);
});

Here we alter the issued badge’s content. The verification should fail because the proof no longer matches. We assert that valid is false and the error mentions something about signature/proof (depending on implementation).

Example 3: Revocation Flow

it("should revoke an issued badge and prevent further validation", async () => {
  // Issue a badge
  const issueRes = await request(app.fetch.bind(app))
    .post("/api/badges/issue")
    .set("Authorization", `Bearer ${authToken}`)
    .send({ recipient: "revokee@example.com" });
  const badgeId = issueRes.body.id;
  // Verify it's valid initially
  await request(app.fetch.bind(app))
    .get(`/api/badges/${badgeId}/status`)
    .expect(200)
    .expect(res => {
      expect(res.body.revoked).toBe(false);
    });
  // Revoke the badge
  await request(app.fetch.bind(app))
    .post(`/api/badges/${badgeId}/revoke`)
    .set("Authorization", `Bearer ${authToken}`)
    .send({ reason: "Testing revocation" })
    .expect(200);
  // Verify status now indicates revoked
  const statusRes = await request(app.fetch.bind(app))
    .get(`/api/badges/${badgeId}/status`)
    .expect(200);
  expect(statusRes.body.revoked).toBe(true);
  // Verify that verification fails
  const verifyRes = await request(app.fetch.bind(app))
    .post("/api/badges/verify")
    .send({ credentialId: badgeId })
    .expect(200);
  expect(verifyRes.body.valid).toBe(false);
  expect(verifyRes.body.reason).toMatch(/revoked/i);
});

Explanation: We simulate checking a badge’s status, which is initially not revoked, then call the revoke endpoint, then check status again and attempt a verify (which should now indicate invalid/revoked). This assumes our API has a /status or the verify endpoint itself gives the reason. We adjust assertions to our actual API design. If our verify endpoint directly returns valid: false, reason: 'revoked', we check that. If instead it returns a 410 Gone or something, we adapt accordingly.

Example 4: Hashed Recipient

it("should issue a badge with a hashed recipient identity", async () => {
  const email = "privacy@example.com";
  const salt = "randomSalt123";
  const issueRes = await request(app.fetch.bind(app))
    .post("/api/badges/issue")
    .set("Authorization", `Bearer ${authToken}`)
    .send({ recipient: email, hashed: true, salt });
  const badge = issueRes.body;
  expect(badge.credentialSubject.id).not.toContain(email);
  // The id might be a hash:
  expect(badge.credentialSubject.id).toMatch(/^sha256\$/);
  // Verify that the hash matches email+salt
  const expectedHash = hashEmail(email, salt); // our test util for SHA-256
  expect(badge.credentialSubject.id).toBe(`sha256$${expectedHash}`);
  // Badge should still verify
  const verifyRes = await request(app.fetch.bind(app))
    .post("/api/badges/verify")
    .send({ credential: badge })
    .expect(200);
  expect(verifyRes.body.valid).toBe(true);
});

This checks that when hashed is requested, the email does not appear in the credential, only the hash, and that the hash is correct. It also ensures that having a hashed recipient doesn’t break the proof (i.e., it’s still valid).

Example 5: OAuth-protected endpoint

it("should reject badge issuance without valid OAuth token", async () => {
  // No token
  await request(app.fetch.bind(app))
    .post("/api/badges/issue")
    .send({ recipient: "unauth@example.com" })
    .expect(401);
  // Invalid token
  await request(app.fetch.bind(app))
    .post("/api/badges/issue")
    .set("Authorization", "Bearer INVALID_TOKEN")
    .send({ recipient: "unauth@example.com" })
    .expect(401);
});

This ensures our auth middleware is enforced.

Utilities

We will implement small utilities in tests/utils:
	•	validateObSchema(obj) as shown, wrapping Ajv validation (we’ll preload the schema in this module so Ajv doesn’t compile it repeatedly).
	•	hashEmail(email, salt) – uses Node’s crypto (e.g., crypto.createHash('sha256').update(email+salt).digest('hex')) to reproduce how the app should hash recipients.
	•	Possibly a getTestKeyPair() that returns the test Ed25519 key pair, in case we need to use it directly (e.g., to sign something manually in a test vector).
	•	A helper to easily call app routes using fetch: e.g., callApi(method, url, data, token) that internally does await app.request(url, { method, headers, body }) and returns parsed JSON. This can sometimes replace Supertest usage for brevity.

By following these examples and guidelines, developers can extend the test suite as new features or OB3 aspects are added (for instance, endorsements or extensions in OB3 would follow a similar pattern of schema validation and flow testing).

Conclusion

This development plan ensures that from database to crypto signature, every part of the Open Badges 3.0 implementation is verified. By leveraging Bun’s speed and modern APIs, our test suite will run efficiently even as it simulates complex credential workflows. We use official standards artifacts (contexts, schemas) to validate compliance, and integrate everything into CI for continuous feedback. The result will be a robust set of tests that not only check functionality but also serve as up-to-date documentation of our system’s OB3 compliance (each test name and description can map to a requirement in the spec). Maintaining this suite will guarantee that as the code evolves, we remain aligned with the Open Badges 3.0 standard ￼ and provide confidence to stakeholders that our badge issuance and verification service is reliable and interoperable.

Sources:
	•	Bun Official Documentation (Testing & Coverage) ￼ ￼ ￼
	•	Hono Framework Documentation (Testing) ￼
	•	IMS Open Badges 3.0 Specification and Implementation Guide ￼ ￼
	•	Certopus Blog on Open Badges 3.0 (overview of OB3/VC alignment) ￼