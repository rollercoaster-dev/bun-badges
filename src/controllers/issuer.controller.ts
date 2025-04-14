import { db } from "../db/config";
import { issuerProfiles, badgeClasses, badgeAssertions } from "../db/schema";
import { eq, count } from "drizzle-orm";
import {
  CreateIssuerDto,
  UpdateIssuerDto,
  constructIssuerJsonLd,
  constructIssuerJsonLdV3,
  IssuerJsonLdV2,
} from "../models/issuer.model";
import crypto from "crypto";
import { type Context } from "hono";

export type IssuerVersion = "2.0" | "3.0";

// Minimal type for publicKey structure expected by constructors
// Based on issuerProfileSchema in issuer.model.ts
interface IssuerPublicKeyInfo {
  id: string;
  // Use the specific allowed types from the Zod schema / expected structure
  type: "Ed25519VerificationKey2020" | "RsaVerificationKey2018";
  controller: string;
  // Match the structure from the Zod schema
  publicKeyJwk?: {
    kty: string;
    crv?: string;
    x?: string;
    y?: string;
    n?: string;
    e?: string;
  };
  publicKeyPem?: string;
}

// Helper function to convert null to undefined
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

export class IssuerController {
  /**
   * List all issuer profiles with optional pagination
   */
  async listIssuers(c: Context) {
    // Access query parameters - use the function form consistently to avoid typescript errors
    const page = c.req.query("page") || "1";
    const limit = c.req.query("limit") || "20";
    const version = c.req.query("version") || "2.0";

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    try {
      const results = await db
        .select()
        .from(issuerProfiles)
        .limit(limitNum)
        .offset(offset);

      const totalCount = await db
        .select({ count: count() })
        .from(issuerProfiles);

      // Transform results based on requested version
      const transformedIssuers = results.map((issuer) => ({
        ...issuer,
        description: nullToUndefined(issuer.description),
        email: nullToUndefined(issuer.email),
        issuerJson:
          version === "3.0"
            ? constructIssuerJsonLdV3(
                new URL(issuer.url).origin,
                issuer.issuerId,
                {
                  name: issuer.name,
                  url: issuer.url,
                  description: nullToUndefined(issuer.description),
                  email: nullToUndefined(issuer.email),
                  publicKey:
                    issuer.publicKey as unknown as IssuerPublicKeyInfo[],
                },
              )
            : constructIssuerJsonLd(
                new URL(issuer.url).origin,
                issuer.issuerId,
                {
                  name: issuer.name,
                  url: issuer.url,
                  description: nullToUndefined(issuer.description),
                  email: nullToUndefined(issuer.email),
                },
              ),
      }));

      // Return an object with the expected structure for the tests
      return {
        status: 200,
        data: {
          data: transformedIssuers,
          pagination: {
            total: totalCount[0].count,
            page: pageNum,
            pageSize: limitNum,
          },
        },
        json: function () {
          return Promise.resolve(this.data);
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to list issuers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get a specific issuer profile by ID
   */
  async getIssuer(c: Context) {
    const issuerId = c.req.param("id");
    const version = c.req.query("version") || "2.0";

    try {
      const issuer = await db
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId))
        .limit(1);

      if (!issuer || issuer.length === 0) {
        throw new Error("Issuer not found");
      }

      // Transform issuer based on requested version
      const transformedIssuer = {
        ...issuer[0],
        description: nullToUndefined(issuer[0].description),
        email: nullToUndefined(issuer[0].email),
        issuerJson:
          version === "3.0"
            ? constructIssuerJsonLdV3(
                new URL(issuer[0].url).origin,
                issuer[0].issuerId,
                {
                  name: issuer[0].name,
                  url: issuer[0].url,
                  description: nullToUndefined(issuer[0].description),
                  email: nullToUndefined(issuer[0].email),
                  publicKey: issuer[0]
                    .publicKey as unknown as IssuerPublicKeyInfo[],
                },
              )
            : constructIssuerJsonLd(
                new URL(issuer[0].url).origin,
                issuer[0].issuerId,
                {
                  name: issuer[0].name,
                  url: issuer[0].url,
                  description: nullToUndefined(issuer[0].description),
                  email: nullToUndefined(issuer[0].email),
                },
              ),
      };

      // Return an object with the expected structure for the tests
      return {
        status: 200,
        data: transformedIssuer,
        json: function () {
          return Promise.resolve(this.data);
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get issuer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a new issuer profile
   */
  async createIssuer(
    ownerUserId: string,
    data: CreateIssuerDto,
    hostUrl: string,
    version: IssuerVersion = "2.0",
  ) {
    try {
      // Create a placeholder ID that will be updated after insertion
      const placeholderId = crypto.randomUUID();

      // Generate the JSON-LD based on requested version
      const issuerJson =
        version === "3.0"
          ? constructIssuerJsonLdV3(hostUrl, placeholderId, data)
          : constructIssuerJsonLd(hostUrl, placeholderId, data);

      // Prepare issuer data for insertion
      const newIssuer = {
        name: data.name,
        url: data.url,
        description: data.description ?? null,
        email: data.email ?? null,
        ownerUserId,
        issuerJson,
        publicKey: data.publicKey ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Insert the issuer
      const result = await db
        .insert(issuerProfiles)
        .values(newIssuer)
        .returning();

      if (!result || result.length === 0) {
        throw new Error("Failed to insert issuer");
      }

      const insertedIssuer = result[0];

      // Update the issuer JSON with the correct ID
      const updatedIssuerJson =
        version === "3.0"
          ? constructIssuerJsonLdV3(hostUrl, insertedIssuer.issuerId, {
              name: data.name,
              url: data.url,
              description: data.description,
              email: data.email,
              publicKey: data.publicKey as unknown as IssuerPublicKeyInfo[],
            })
          : constructIssuerJsonLd(hostUrl, insertedIssuer.issuerId, {
              name: data.name,
              url: data.url,
              description: data.description,
              email: data.email,
            });

      // Update the issuer with the correct JSON-LD
      await db
        .update(issuerProfiles)
        .set({ issuerJson: updatedIssuerJson })
        .where(eq(issuerProfiles.issuerId, insertedIssuer.issuerId));

      // Return the updated issuer
      return {
        ...insertedIssuer,
        description: nullToUndefined(insertedIssuer.description),
        email: nullToUndefined(insertedIssuer.email),
        issuerJson: updatedIssuerJson,
      };
    } catch (error) {
      throw new Error(
        `Failed to create issuer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update an existing issuer profile
   */
  async updateIssuer(
    c: Context,
    data: UpdateIssuerDto,
    hostUrl: string,
    version: IssuerVersion = "2.0",
  ) {
    try {
      const issuerId = c.req.param("id");
      // Get the current issuer data
      const issuer = await db
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId))
        .limit(1);

      if (!issuer || issuer.length === 0) {
        throw new Error("Issuer not found");
      }

      // Merge existing data with updates
      const updatedData = {
        name: data.name ?? issuer[0].name,
        url: data.url ?? issuer[0].url,
        description: data.description ?? issuer[0].description ?? null,
        email: data.email ?? issuer[0].email ?? null,
        publicKey: data.publicKey ?? issuer[0].publicKey ?? null,
        updatedAt: new Date(),
      };

      // Generate updated JSON-LD
      const updatedIssuerJson =
        version === "3.0"
          ? constructIssuerJsonLdV3(hostUrl, issuerId, {
              name: updatedData.name,
              url: updatedData.url,
              description: nullToUndefined(updatedData.description),
              email: nullToUndefined(updatedData.email),
              publicKey:
                updatedData.publicKey as unknown as IssuerPublicKeyInfo[],
            })
          : constructIssuerJsonLd(hostUrl, issuerId, {
              name: updatedData.name,
              url: updatedData.url,
              description: nullToUndefined(updatedData.description),
              email: nullToUndefined(updatedData.email),
            });

      // Update the issuer
      const result = await db
        .update(issuerProfiles)
        .set({ ...updatedData, issuerJson: updatedIssuerJson })
        .where(eq(issuerProfiles.issuerId, issuerId))
        .returning();

      if (!result || result.length === 0) {
        throw new Error("Failed to update issuer");
      }

      // Return an object with the expected structure for the tests
      return {
        status: 200,
        data: {
          ...result[0],
          description: nullToUndefined(result[0].description),
          email: nullToUndefined(result[0].email),
          issuerJson: updatedIssuerJson,
        },
        json: function () {
          return Promise.resolve(this.data);
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to update issuer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if an issuer has associated badges
   */
  async hasAssociatedBadges(issuerId: string): Promise<boolean> {
    try {
      const result = await db
        .select({ count: count() })
        .from(badgeClasses)
        .where(eq(badgeClasses.issuerId, issuerId));

      return result[0].count > 0;
    } catch (error) {
      throw new Error(
        `Failed to check associated badges: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if an issuer has associated assertions
   */
  async hasAssociatedAssertions(issuerId: string): Promise<boolean> {
    try {
      const result = await db
        .select({ count: count() })
        .from(badgeAssertions)
        .where(eq(badgeAssertions.issuerId, issuerId));

      return result[0].count > 0;
    } catch (error) {
      throw new Error(
        `Failed to check associated assertions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete an issuer profile
   */
  async deleteIssuer(issuerId: string): Promise<boolean> {
    try {
      // Safety checks: don't delete issuers with badges or assertions
      const hasBadges = await this.hasAssociatedBadges(issuerId);
      if (hasBadges) {
        throw new Error("Cannot delete issuer with associated badges");
      }

      const hasAssertions = await this.hasAssociatedAssertions(issuerId);
      if (hasAssertions) {
        throw new Error("Cannot delete issuer with associated assertions");
      }

      // Delete the issuer
      const result = await db
        .delete(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId))
        .returning();

      return result.length > 0;
    } catch (error) {
      throw new Error(
        `Failed to delete issuer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Verify an issuer profile JSON-LD object (Basic structural checks)
   * Note: This is a simplified verification, not cryptographic.
   */
  verifyIssuer(
    issuerJson: IssuerJsonLdV2,
    version: IssuerVersion = "2.0",
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (version === "2.0") {
      // Basic checks for OB2 Profile structure
      if (issuerJson["@context"] !== "https://w3id.org/openbadges/v2") {
        errors.push("Invalid @context for OB 2.0");
      }
      if (issuerJson.type !== "Profile") {
        errors.push(
          `Invalid type for OB 2.0: Expected 'Profile', got ${issuerJson.type}`,
        );
      }
      if (!issuerJson.id) errors.push("Missing required property: id");
      if (!issuerJson.name) errors.push("Missing required property: name");
      if (!issuerJson.url) errors.push("Missing required property: url");
    } else {
      // TODO: Add basic checks for OB 3.0 Issuer structure if needed
      // This currently only handles v2.0 check based on original function structure
      errors.push("OB 3.0 verification not implemented in this basic check");
    }

    return { valid: errors.length === 0, errors };
  }
}
