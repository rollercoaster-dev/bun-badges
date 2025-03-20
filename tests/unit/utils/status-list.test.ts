import { describe, it, expect } from "bun:test";
import {
  createEncodedBitString,
  encodeBitString,
  decodeBitString,
  updateCredentialStatus,
  isCredentialRevoked,
  getIndexFromUuid,
  createStatusListCredential,
} from "../../../src/utils/signing/status-list";
import FastBitSet from "fast-bitset";

describe("Status List Utilities", () => {
  describe("Bitstring functions", () => {
    it("should create a valid encoded bitstring", () => {
      const bitstring = createEncodedBitString(128);
      expect(bitstring).toBeDefined();
      expect(typeof bitstring).toBe("string");

      // Decode it to verify it has the correct size
      const decoded = decodeBitString(bitstring);
      expect(decoded).toBeInstanceOf(FastBitSet);

      // Use getCardinality to check the number of bits set to 1
      // For a new bitstring, this should be 0 (all bits are 0)
      expect(decoded.getCardinality()).toBe(0);

      // Check if we can access the expected bit indices
      expect(() => decoded.get(127)).not.toThrow();
    });

    it("should encode and decode a bitstring correctly", () => {
      const bitset = new FastBitSet(128);
      bitset.set(10);
      bitset.set(42);
      bitset.set(100);

      const encoded = encodeBitString(bitset);
      expect(encoded).toBeDefined();

      const decoded = decodeBitString(encoded);
      expect(decoded.get(10)).toBe(true);
      expect(decoded.get(42)).toBe(true);
      expect(decoded.get(100)).toBe(true);
      expect(decoded.get(11)).toBe(false);
      expect(decoded.get(43)).toBe(false);
    });

    it("should update credential status correctly", () => {
      const original = createEncodedBitString(128);

      // Set credential at index 15 to revoked
      const updated1 = updateCredentialStatus(original, 15, true);
      expect(isCredentialRevoked(updated1, 15)).toBe(true);
      expect(isCredentialRevoked(updated1, 16)).toBe(false);

      // Set credential at index 15 back to not revoked
      const updated2 = updateCredentialStatus(updated1, 15, false);
      expect(isCredentialRevoked(updated2, 15)).toBe(false);
    });
  });

  describe("UUID to index mapping", () => {
    it("should generate consistent indices from UUIDs", () => {
      const uuid1 = "550e8400-e29b-41d4-a716-446655440000";
      const index1 = getIndexFromUuid(uuid1);

      // Same UUID should produce same index
      expect(getIndexFromUuid(uuid1)).toBe(index1);

      // Different UUIDs should produce different indices
      const uuid2 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
      const index2 = getIndexFromUuid(uuid2);
      expect(index1).not.toBe(index2);

      // Index should be within bounds
      expect(index1).toBeGreaterThanOrEqual(0);
      expect(index1).toBeLessThan(16384);
      expect(index2).toBeGreaterThanOrEqual(0);
      expect(index2).toBeLessThan(16384);
    });
  });

  describe("Status List Credential", () => {
    it("should create a valid status list credential", () => {
      const issuerId = "https://example.com/issuers/1";
      const credentialId = "https://example.com/status/1";

      const credential = createStatusListCredential(issuerId, credentialId);

      expect(credential).toHaveProperty("@context");
      expect(credential).toHaveProperty("id", credentialId);
      expect(credential).toHaveProperty("type");
      expect(credential.type).toContain("StatusList2021Credential");
      expect(credential).toHaveProperty("issuer", issuerId);
      expect(credential).toHaveProperty("credentialSubject");
      expect(credential.credentialSubject).toHaveProperty("id");
      expect(credential.credentialSubject).toHaveProperty(
        "type",
        "StatusList2021",
      );
      expect(credential.credentialSubject).toHaveProperty(
        "statusPurpose",
        "revocation",
      );
      expect(credential.credentialSubject).toHaveProperty("encodedList");

      // Test with suspension purpose
      const suspensionCredential = createStatusListCredential(
        issuerId,
        credentialId,
        "suspension",
      );
      expect(suspensionCredential.credentialSubject.statusPurpose).toBe(
        "suspension",
      );
    });
  });
});
