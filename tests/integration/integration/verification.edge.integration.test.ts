import {
  describe,
  expect,
  test,
  beforeAll,
  beforeEach,
  afterEach,
} from "bun:test";
import { VerificationController } from "@/controllers/verification.controller";
import crypto from "crypto";
import {
  createMockContext,
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

describe("VerificationController Edge Cases", () => {
  let controller: VerificationController;

  beforeAll(async () => {
    controller = new VerificationController();
  });

  beforeEach(async () => {
    await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  test("should handle missing context in OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const invalidAssertion = updateOB2AssertionJson(assertionId, {
      "@context": undefined,
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

  test("should handle missing type in OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const invalidAssertion = updateOB2AssertionJson(assertionId, {
      type: undefined,
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

  test("should handle missing recipient in OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const invalidAssertion = updateOB2AssertionJson(assertionId, {
      recipient: undefined,
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

  test("should handle missing badge in OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const invalidAssertion = updateOB2AssertionJson(assertionId, {
      badge: undefined,
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

  test("should handle missing context in OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const invalidCredential = updateOB3CredentialJson(assertionId, {
      "@context": undefined,
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

  test("should handle missing type in OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const invalidCredential = updateOB3CredentialJson(assertionId, {
      type: undefined,
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

  test("should handle missing credentialSubject in OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const invalidCredential = updateOB3CredentialJson(assertionId, {
      credentialSubject: undefined,
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

  test("should handle missing issuer in OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const invalidCredential = updateOB3CredentialJson(assertionId, {
      issuer: undefined,
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
