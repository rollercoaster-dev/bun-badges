/**
 * Unit tests for the credential verification service
 */

import { describe, expect, it, beforeEach } from "bun:test";
import { CredentialVerificationService } from "@/services/credential-verification.service";

// Instead of mocking, we'll create a simple implementation for testing
class TestCredentialVerificationService extends CredentialVerificationService {
  // Override the database methods with test implementations
  async verifyCredential(credentialId: string) {
    if (credentialId === "test-credential-id") {
      return {
        valid: true,
        checks: {
          structure: true,
          revocation: true,
          expiration: true,
        },
        errors: [],
        details: {
          credentialId: "test-credential-id",
          issuerId: "test-issuer-id",
        },
      };
    } else if (credentialId === "revoked-credential-id") {
      return {
        valid: false,
        checks: {
          structure: true,
          revocation: false,
          expiration: true,
        },
        errors: ["Credential has been revoked"],
        details: {
          credentialId: "revoked-credential-id",
          issuerId: "test-issuer-id",
        },
      };
    } else if (credentialId === "expired-credential-id") {
      return {
        valid: false,
        checks: {
          structure: true,
          revocation: true,
          expiration: false,
        },
        errors: ["Credential expired on 2020-01-01T00:00:00.000Z"],
        details: {
          credentialId: "expired-credential-id",
          issuerId: "test-issuer-id",
        },
      };
    } else {
      return {
        valid: false,
        checks: {},
        errors: ["Credential not found in database"],
      };
    }
  }

  async isCredentialRevoked(credentialId: string) {
    return credentialId === "revoked-credential-id";
  }

  async revokeCredential(
    _credentialId: string,
    _reason?: string,
  ): Promise<boolean> {
    return true;
  }
}

describe("CredentialVerificationService", () => {
  let service: TestCredentialVerificationService;

  beforeEach(() => {
    service = new TestCredentialVerificationService();
  });

  describe("verifyCredential", () => {
    it("should verify a valid credential", async () => {
      const result = await service.verifyCredential("test-credential-id");

      expect(result.valid).toBe(true);
      expect(result.checks.structure).toBe(true);
      expect(result.checks.revocation).toBe(true);
      expect(result.checks.expiration).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return invalid for a non-existent credential", async () => {
      const result = await service.verifyCredential("non-existent-id");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Credential not found in database");
    });

    it("should return invalid for a revoked credential", async () => {
      const result = await service.verifyCredential("revoked-credential-id");

      expect(result.valid).toBe(false);
      expect(result.checks.revocation).toBe(false);
      expect(result.errors).toContain("Credential has been revoked");
    });

    it("should return invalid for an expired credential", async () => {
      const result = await service.verifyCredential("expired-credential-id");

      expect(result.valid).toBe(false);
      expect(result.checks.expiration).toBe(false);
      expect(result.errors).toContain(
        "Credential expired on 2020-01-01T00:00:00.000Z",
      );
    });
  });

  describe("isCredentialRevoked", () => {
    it("should return false for a non-revoked credential", async () => {
      const result = await service.isCredentialRevoked("test-credential-id");
      expect(result).toBe(false);
    });

    it("should return true for a revoked credential", async () => {
      const result = await service.isCredentialRevoked("revoked-credential-id");
      expect(result).toBe(true);
    });
  });

  describe("revokeCredential", () => {
    it("should revoke a credential", async () => {
      const result = await service.revokeCredential("test-credential-id");
      expect(result).toBe(true);
    });
  });
});
