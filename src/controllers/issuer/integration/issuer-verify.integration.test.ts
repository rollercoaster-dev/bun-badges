import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { IssuerController } from "@/controllers/issuer.controller";

const issuerController = new IssuerController();

describe("verifyIssuer", () => {
  beforeEach(async () => {
    // Ensure clean state before each test
    await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  test("should verify a valid issuer JSON-LD", () => {
    const issuerJson = {
      "@context": "https://w3id.org/openbadges/v2",
      id: "https://example.org/issuers/1",
      type: "Issuer",
      name: "Test Issuer",
      url: "https://example.org",
    };

    const result = issuerController.verifyIssuer(issuerJson, "2.0");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("should reject an invalid issuer JSON-LD", () => {
    const issuerJson = {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Issuer",
      name: "Test Issuer",
      url: "https://example.org",
    };

    const result = issuerController.verifyIssuer(issuerJson as any, "2.0");
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});
