import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { IssuerController } from "@/controllers/issuer.controller";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { IssuerJsonLdV2 } from "@/models/issuer.model";

describe("IssuerController - Verify Issuer", () => {
  beforeEach(async () => {
    await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("verifyIssuer", () => {
    test("should verify a valid issuer JSON for OB2", () => {
      const controller = new IssuerController();

      const issuerJson: IssuerJsonLdV2 = {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Profile",
        id: "https://example.com/issuers/test",
        name: "Test Issuer",
        url: "https://example.com/issuer",
      };

      const result = controller.verifyIssuer(issuerJson, "2.0");
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test("should verify a valid issuer JSON for OB3", () => {
      const controller = new IssuerController();

      // Here we're using a type assertion since we know this is a valid OB3 issuer
      // but the exact type might not be fully captured in the IssuerJsonLdV2 type
      const issuerJson = {
        "@context": "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        type: "https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile",
        id: "https://example.com/issuers/test",
        name: "Test Issuer",
        url: "https://example.com/issuer",
        publicKey: [
          {
            id: "did:web:example.com#key-1",
            type: "Ed25519VerificationKey2020" as const,
            controller: "did:web:example.com",
            publicKeyJwk: {
              kty: "OKP",
              crv: "Ed25519",
              x: "test",
            },
          },
        ],
      } as any;

      const result = controller.verifyIssuer(issuerJson, "3.0");
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test("should return errors for invalid issuer JSON", () => {
      const controller = new IssuerController();

      // Use any type for intentionally invalid data
      const issuerJson = {
        "@context": "https://w3id.org/openbadges/v2",
        type: "InvalidType",
        // missing id
        name: "Test Issuer",
        // missing url
      } as any;

      const result = controller.verifyIssuer(issuerJson, "2.0");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Check for specific errors
      const hasIdError = result.errors.some((error) =>
        error.includes("Missing id"),
      );
      const hasUrlError = result.errors.some((error) =>
        error.includes("Missing url"),
      );
      const hasTypeError = result.errors.some((error) =>
        error.includes("Invalid type"),
      );

      expect(hasIdError).toBe(true);
      expect(hasUrlError).toBe(true);
      expect(hasTypeError).toBe(true);
    });
  });
});
