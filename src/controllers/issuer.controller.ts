import { db } from "../db/config";
import { issuerProfiles, badgeClasses, badgeAssertions } from "../db/schema";
import { eq, count } from "drizzle-orm";
import {
  CreateIssuerDto,
  UpdateIssuerDto,
  constructIssuerJsonLd,
} from "../models/issuer.model";
import crypto from "crypto";

export class IssuerController {
  /**
   * List all issuer profiles with optional pagination
   */
  async listIssuers(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    try {
      const results = await db
        .select()
        .from(issuerProfiles)
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: count() })
        .from(issuerProfiles);

      return {
        issuers: results,
        pagination: {
          total: totalCount[0].count,
          page,
          limit,
          pages: Math.ceil(totalCount[0].count / limit),
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
  async getIssuer(issuerId: string) {
    try {
      const issuer = await db
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId))
        .limit(1);

      if (!issuer || issuer.length === 0) {
        throw new Error("Issuer not found");
      }

      return issuer[0];
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
  ) {
    try {
      // Create a placeholder ID that will be updated after insertion
      const placeholderId = crypto.randomUUID();

      // Generate the Open Badges 2.0 compliant JSON-LD
      const issuerJson = constructIssuerJsonLd(hostUrl, placeholderId, data);

      // Prepare issuer data for insertion
      const newIssuer = {
        name: data.name,
        url: data.url,
        description: data.description,
        email: data.email,
        ownerUserId,
        issuerJson,
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
      const updatedIssuerJson = constructIssuerJsonLd(
        hostUrl,
        insertedIssuer.issuerId,
        data,
      );

      // Update the issuer with the correct JSON-LD
      await db
        .update(issuerProfiles)
        .set({ issuerJson: updatedIssuerJson })
        .where(eq(issuerProfiles.issuerId, insertedIssuer.issuerId));

      // Return the updated issuer
      return {
        ...insertedIssuer,
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
  async updateIssuer(issuerId: string, data: UpdateIssuerDto, hostUrl: string) {
    try {
      // Verify the issuer exists and get current data
      const existingIssuer = await this.getIssuer(issuerId);

      // Merge existing data with updates, converting null to undefined
      const updatedData = {
        name: data.name ?? existingIssuer.name,
        url: data.url ?? existingIssuer.url,
        description:
          data.description ?? existingIssuer.description ?? undefined,
        email: data.email ?? existingIssuer.email ?? undefined,
        updatedAt: new Date(),
      };

      // Generate updated JSON-LD
      const updatedIssuerJson = constructIssuerJsonLd(hostUrl, issuerId, {
        name: updatedData.name,
        url: updatedData.url,
        description: updatedData.description,
        email: updatedData.email,
      });

      // Update the issuer
      const result = await db
        .update(issuerProfiles)
        .set({
          ...updatedData,
          issuerJson: updatedIssuerJson,
        })
        .where(eq(issuerProfiles.issuerId, issuerId))
        .returning();

      if (!result || result.length === 0) {
        throw new Error("Failed to update issuer");
      }

      return result[0];
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
   * Verify an issuer profile against Open Badges standards
   */
  verifyIssuer(issuerJson: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic verification checks
    if (!issuerJson["@context"]) {
      errors.push("Missing @context property");
    }

    if (issuerJson.type !== "Issuer") {
      errors.push("Invalid type - must be 'Issuer'");
    }

    if (!issuerJson.id) {
      errors.push("Missing id property");
    }

    if (!issuerJson.name) {
      errors.push("Missing name property");
    }

    if (!issuerJson.url) {
      errors.push("Missing url property");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
