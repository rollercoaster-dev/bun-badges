import { mock } from "bun:test";
import { OpenBadgeCredential } from "@/models/credential.model";
import { VerificationResult } from "@/services/verification.service";

// Store assertions that are created and keep track of operations
const testAssertions = new Map<string, any>();
const revokedAssertions = new Set<string>();

/**
 * Creates mock assertion data for testing
 */
export function createMockAssertionData() {
  const assertionId = "test-assertion-id";
  const testAssertion = {
    assertionId,
    badgeId: "test-badge-id",
    issuerId: "test-issuer-id",
    recipientType: "email",
    recipientIdentity: "test@example.com",
    recipientHashed: false,
    issuedOn: new Date(),
    evidenceUrl: "https://example.org/evidence",
    revoked: false,
    revocationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    assertionJson: {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Assertion",
      id: `https://example.org/assertions/${assertionId}`,
      recipient: {
        type: "email",
        identity: "test@example.com",
        hashed: false,
      },
      badge: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "BadgeClass",
        id: "https://example.org/badges/test-badge-id",
        name: "Test Badge",
        description: "A test badge",
        image: "https://example.org/badge.png",
        criteria: {
          narrative: "Test criteria",
        },
        issuer: "https://example.org/issuers/test-issuer-id",
      },
      issuedOn: new Date().toISOString(),
      verification: {
        type: "HostedBadge",
      },
    },
  };

  // Store the assertion in our testing map
  testAssertions.set(assertionId, testAssertion);

  return {
    assertionId,
    assertion: testAssertion,
  };
}

/**
 * Mocks the assertion controller and related services for testing
 */
export function mockAssertionController() {
  // Reset the state for testing
  testAssertions.clear();
  revokedAssertions.clear();

  // Create a test assertion
  const { assertionId, assertion } = createMockAssertionData();
  testAssertions.set(assertionId, assertion);

  // Mocked badge assertions table
  const badgeAssertionsTable = {
    assertionId: { name: "assertion_id" },
    badgeId: { name: "badge_id" },
    issuerId: { name: "issuer_id" },
  };

  // Mock the drizzle-orm
  mock.module("drizzle-orm", () => {
    // Return a replacement for the eq function
    return {
      eq: (field: any, value: any) => {
        return {
          field,
          value,
          operator: "eq",
          args: [field, value],
        };
      },
    };
  });

  // Mock the database schema
  mock.module("@/db/schema/badges", () => {
    return {
      badgeAssertions: badgeAssertionsTable,
      badgeClasses: {
        badgeId: { name: "badge_id" },
      },
    };
  });

  // Mock the database module
  mock.module("@/db/config", () => {
    return {
      db: {
        select: () => ({
          from: (table: any) => ({
            where: (condition: any) => ({
              limit: (limit: number) => {
                // Extract the assertionId from the condition
                if (condition && condition.operator === "eq") {
                  // Check which field we're querying by
                  if (
                    condition.field &&
                    condition.field.name === "assertion_id"
                  ) {
                    const id = condition.value;
                    if (testAssertions.has(id)) {
                      return [testAssertions.get(id)];
                    }
                  }
                }
                return [];
              },
            }),
          }),
        }),
        update: (table: any) => ({
          set: (updates: any) => ({
            where: (condition: any) => {
              // Extract the assertionId from the condition
              if (
                condition &&
                condition.operator === "eq" &&
                condition.field &&
                condition.field.name === "assertion_id"
              ) {
                const id = condition.value;
                if (testAssertions.has(id)) {
                  const assertion = testAssertions.get(id);
                  const updatedAssertion = { ...assertion, ...updates };

                  // If revoking, also track in our set
                  if (updates.revoked === true) {
                    revokedAssertions.add(id);
                  } else if (updates.revoked === false) {
                    revokedAssertions.delete(id);
                  }

                  testAssertions.set(id, updatedAssertion);
                  return {
                    returning: () => [updatedAssertion],
                  };
                }
              }
              return {
                returning: () => [],
              };
            },
          }),
        }),
        insert: (table: any) => ({
          values: (data: any) => {
            testAssertions.set(data.assertionId, data);
            return {
              returning: () => [data],
            };
          },
        }),
      },
      // Mock pool for direct queries
      dbPool: {
        connect: () => {
          return Promise.resolve({
            query: (sql: string, params: any[]) => {
              // Handle common query patterns
              if (sql.includes("SELECT") && sql.includes("badge_assertions")) {
                const id = params[0];
                if (testAssertions.has(id)) {
                  return {
                    rows: [testAssertions.get(id)],
                  };
                }
                return { rows: [] };
              }
              return { rows: [] };
            },
            release: () => {},
          });
        },
      },
    };
  });

  // Mock the verification service
  mock.module("@/services/verification.service", () => {
    const VerificationService = function () {
      return {
        verifyAssertion: async (
          assertionId: string,
        ): Promise<VerificationResult> => {
          // Check if this assertion exists in our map
          if (!testAssertions.has(assertionId)) {
            return {
              valid: false,
              checks: {},
              errors: ["Assertion not found"],
            };
          }

          // Check if it's been revoked
          const isRevoked = revokedAssertions.has(assertionId);

          // Return verification result
          if (isRevoked) {
            return {
              valid: false,
              checks: {
                structure: true,
                revocation: false,
              },
              errors: ["Credential has been revoked"],
            };
          }

          return {
            valid: true,
            checks: {
              structure: true,
              revocation: true,
              signature: true,
              expiration: true,
            },
            errors: [],
          };
        },
        verifyBadgeJson: async (
          badgeJson: any,
        ): Promise<VerificationResult> => {
          // Simplified badge JSON verification
          if (!badgeJson) {
            return {
              valid: false,
              checks: {},
              errors: ["Badge JSON is empty"],
            };
          }

          return {
            valid: true,
            checks: {
              structure: true,
              revocation: true,
              signature: true,
              expiration: true,
            },
            errors: [],
          };
        },
      };
    };

    return {
      VerificationService,
      isOB2BadgeAssertion: (obj: any) => {
        return (
          obj &&
          obj["@context"] === "https://w3id.org/openbadges/v2" &&
          obj.type === "Assertion"
        );
      },
    };
  });

  // Mock the credential service
  mock.module("@/services/credential.service", () => {
    const CredentialService = function () {
      return {
        createCredential: async (
          hostUrl: string,
          assertionId: string,
        ): Promise<OpenBadgeCredential> => {
          const assertion = testAssertions.get(assertionId);
          if (!assertion) {
            throw new Error("Assertion not found");
          }

          // Create a simple OB3 credential
          return {
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
            ],
            id: `${hostUrl}/assertions/${assertionId}`,
            type: ["VerifiableCredential", "OpenBadgeCredential"],
            issuer: `${hostUrl}/issuers/${assertion.issuerId}`,
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
              id: assertion.recipientIdentity,
              type: "AchievementSubject",
              achievement: {
                id: `${hostUrl}/badges/${assertion.badgeId}`,
                type: ["Achievement"],
                name: "Test Achievement",
                description: "Test achievement description",
                criteria: {
                  narrative: "Test criteria",
                },
                image: {
                  id: "https://example.org/badge.png",
                  type: "Image",
                },
              },
            },
            proof: {
              type: "Ed25519Signature2020",
              created: new Date().toISOString(),
              verificationMethod: `${hostUrl}/issuers/${assertion.issuerId}#key-1`,
              proofPurpose: "assertionMethod",
              proofValue:
                "z4oey5q2M3XKaxup3tmzN4DRFTLVqpLMweBrSxMY2xnrHmKYhBrTuxmTcBNwDiond5bnVKXdK7xRMCa2Z2GuRQcKS",
            },
          };
        },
        ensureIssuerKeyExists: async (issuerId: string) => {
          return {
            id: `key-${issuerId}`,
            key: "test-key",
          };
        },
      };
    };

    return { CredentialService };
  });

  // Also mock the validation utility
  mock.module("@/utils/validation", () => {
    return {
      isValidUuid: (id: string) => {
        // Return true for our test IDs and valid-looking UUIDs
        if (
          id === "test-assertion-id" ||
          (id.includes("-") && id.length > 30)
        ) {
          return true;
        }
        return false;
      },
    };
  });

  // Mock the VerificationController
  mock.module("@/controllers/verification.controller", () => {
    const VerificationController = function () {
      return {
        verifyAssertion: async (c: any) => {
          const assertionId = c.req.param("assertionId");

          // Check if the assertion exists
          if (!testAssertions.has(assertionId)) {
            return c.json(
              {
                status: "error",
                error: {
                  code: "NOT_FOUND",
                  message: "Assertion not found",
                },
              },
              404,
            );
          }

          // Check if it's revoked
          const isRevoked = revokedAssertions.has(assertionId);

          if (isRevoked) {
            return c.json({
              status: "success",
              data: {
                valid: false,
                checks: {
                  structure: true,
                  revocation: false,
                },
                errors: ["Credential has been revoked"],
              },
            });
          }

          return c.json({
            status: "success",
            data: {
              valid: true,
              checks: {
                structure: true,
                revocation: true,
                signature: true,
                expiration: true,
              },
              errors: [],
            },
          });
        },
      };
    };

    return { VerificationController };
  });

  return {
    assertionId,
    getTestAssertions: () => testAssertions,
    getRevokedAssertions: () => revokedAssertions,
    addTestAssertion: (id: string, data: any) => {
      testAssertions.set(id, data);
    },
    clearTestData: () => {
      testAssertions.clear();
      revokedAssertions.clear();
    },
  };
}
