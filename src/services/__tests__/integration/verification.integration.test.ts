import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { VerificationService } from "@/services/verification.service";
import { seedTestData, clearTestData, TestData } from "@/utils/test/db-helpers";
import { testDb } from "@/utils/test/integration-setup";
import { badgeAssertions } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("VerificationService Integration Tests", () => {
  let service: VerificationService;
  let testData: TestData;

  beforeEach(async () => {
    testData = await seedTestData();
    service = new VerificationService();
  });

  afterEach(async () => {
    await clearTestData();
  });

  it("should verify OB2 assertion", async () => {
    // Get the assertion ID from the test data
    const assertionId = testData.assertion.assertionId;

    // For this test, make sure it's an OB2.0-style assertion
    // Update the assertion to remove any proof property
    const assertionJson = testData.assertion.assertionJson as any;
    if (assertionJson.proof) {
      delete assertionJson.proof;
    }

    await testDb
      .update(badgeAssertions)
      .set({
        assertionJson,
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    const result = await service.verifyOB2Assertion(assertionId);

    expect(result.valid).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.structure).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("should verify OB3 assertion", async () => {
    // Get the assertion ID from the test data
    const assertionId = testData.assertion.assertionId;

    // Update the assertion to add a proof property
    const assertionJson = testData.assertion.assertionJson as any;
    assertionJson.proof = {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `did:key:${testData.signingKey.controller}#key-1`,
      proofPurpose: "assertionMethod",
      proofValue: "TEST_BASE64_SIGNATURE", // This matches what our crypto mocks expect
    };

    await testDb
      .update(badgeAssertions)
      .set({
        assertionJson,
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    const result = await service.verifyOB3Assertion(assertionId);

    expect(result.valid).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.signature).toBe(true);
    expect(result.checks.structure).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("should fail verification for revoked badge", async () => {
    // Get the assertion ID from the test data
    const assertionId = testData.assertion.assertionId;

    // Mark the assertion as revoked
    await testDb
      .update(badgeAssertions)
      .set({
        revoked: true,
        revocationReason: "Test revocation reason",
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    const result = await service.verifyOB3Assertion(assertionId);

    expect(result.valid).toBe(false);
    expect(result.checks.revocation).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("revoked");
  });

  it("should fail verification for invalid signature", async () => {
    // Get the assertion ID from the test data
    const assertionId = testData.assertion.assertionId;

    // Update the assertion to add an invalid proof value
    const assertionJson = testData.assertion.assertionJson as any;
    assertionJson.proof = {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `did:key:${testData.signingKey.controller}#key-1`,
      proofPurpose: "assertionMethod",
      proofValue: "INVALID_SIGNATURE", // This will fail our verification
    };

    await testDb
      .update(badgeAssertions)
      .set({
        assertionJson,
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    const result = await service.verifyOB3Assertion(assertionId);

    expect(result.valid).toBe(false);
    expect(result.checks.signature).toBe(false);
  });

  it("should auto-detect and verify OB2 assertion", async () => {
    // Get the assertion ID from the test data
    const assertionId = testData.assertion.assertionId;

    // For this test, make sure it's an OB2.0-style assertion
    // Update the assertion to remove any proof property
    const assertionJson = testData.assertion.assertionJson as any;
    if (assertionJson.proof) {
      delete assertionJson.proof;
    }

    await testDb
      .update(badgeAssertions)
      .set({
        assertionJson,
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    const result = await service.verifyAssertion(assertionId);

    expect(result.valid).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.structure).toBe(true);
    expect(result.checks.signature).toBeUndefined();
  });

  it("should auto-detect and verify OB3 assertion", async () => {
    // Get the assertion ID from the test data
    const assertionId = testData.assertion.assertionId;

    // Update the assertion to add a proof property
    const assertionJson = testData.assertion.assertionJson as any;
    assertionJson.proof = {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `did:key:${testData.signingKey.controller}#key-1`,
      proofPurpose: "assertionMethod",
      proofValue: "TEST_BASE64_SIGNATURE", // This matches what our crypto mocks expect
    };

    await testDb
      .update(badgeAssertions)
      .set({
        assertionJson,
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    const result = await service.verifyAssertion(assertionId);

    expect(result.valid).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.signature).toBe(true);
    expect(result.checks.structure).toBe(true);
  });
});
