import {
  describe,
  expect,
  test,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
} from "bun:test";
import { db } from "@/db/config";
import { badgeAssertions } from "@/db/schema";
import { VerificationController } from "@/controllers/verification.controller";
import crypto from "crypto";
import {
  CredentialService,
  SignableCredential,
} from "@/services/credential.service";
import {
  createMockContext,
  getOB2AssertionJson,
  getOB3CredentialJson,
  updateOB2AssertionJson,
  updateOB3CredentialJson,
} from "../../helpers/test-utils";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";

interface ApiResponse<T> {
  status: string;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

interface VerificationResponse {
  valid: boolean;
  checks: {
    signature?: boolean;
    revocation?: boolean;
    structure?: boolean;
  };
  errors: string[];
}

describe("VerificationController Integration Tests", () => {
  let controller: VerificationController;
  let testData: any;
  const testRunId = crypto.randomUUID().substring(0, 8);

  beforeAll(async () => {
    controller = new VerificationController();
  });

  beforeEach(async () => {
    testData = await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  afterAll(async () => {});

  test("should verify an OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const assertionJson = getOB2AssertionJson(assertionId);

    // Save the assertion to the database
    await db.insert(badgeAssertions).values({
      assertionId,
      badgeId: testData.badge.badgeId,
      issuerId: testData.issuer.issuerId,
      recipientType: "email",
      recipientIdentity: `recipient-ob2-${testRunId}@example.com`,
      recipientHashed: false,
      issuedOn: new Date(),
      revoked: false,
      assertionJson,
    });

    const ctx = createMockContext({
      params: { assertionId },
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(true);
    expect(data.data.checks.signature).toBe(true);
    expect(data.data.checks.revocation).toBe(true);
    expect(data.data.checks.structure).toBe(true);
  });

  test("should verify an OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    // 1. Get base credential structure (without proof)
    const unsignedCredentialJson = getOB3CredentialJson(assertionId);
    // Remove the placeholder proof if it exists
    delete unsignedCredentialJson.proof;

    // 2. Instantiate CredentialService
    const credentialService = new CredentialService();

    // 3. Sign the credential using the test issuer's key
    const signedCredentialJson = await credentialService.signCredential(
      testData.issuer.issuerId,
      // Use type assertion to satisfy SignableCredential expectation
      unsignedCredentialJson as unknown as SignableCredential,
    );

    // 4. Save the *signed* credential to the database
    await db.insert(badgeAssertions).values({
      assertionId,
      badgeId: testData.badge.badgeId,
      issuerId: testData.issuer.issuerId,
      recipientType: "email",
      recipientIdentity: `recipient-ob3-${testRunId}@example.com`,
      recipientHashed: false,
      issuedOn: new Date(),
      revoked: false,
      assertionJson: signedCredentialJson, // Save the signed version
    });

    // 5. Run verification
    const ctx = createMockContext({
      params: { assertionId },
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;

    // 6. Assert validity is true
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(true); // Should now be true
    expect(data.data.checks.signature).toBe(true);
    expect(data.data.checks.revocation).toBe(true);
    expect(data.data.checks.structure).toBe(true);
  });

  test("should detect invalid OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const invalidAssertion = updateOB2AssertionJson(assertionId, {
      type: "InvalidType",
    });

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidAssertion),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(false);
    expect(data.data.checks.structure).toBe(false);
  });

  test("should detect invalid OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const invalidCredential = updateOB3CredentialJson(assertionId, {
      type: ["InvalidType"],
    });

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidCredential),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(false);
    expect(data.data.checks.structure).toBe(false);
  });
});
