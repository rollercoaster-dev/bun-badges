import { Hono } from "hono";
import { type Context } from "hono";
import {
  IssuerController,
  IssuerVersion,
} from "../controllers/issuer.controller";
import { ISSUER_ROUTES } from "./aliases";
import {
  type CreateIssuerDto,
  type UpdateIssuerDto,
} from "../models/issuer.model";
import { ZodError } from "zod";
import {
  Role,
  requireAuth,
  requireRole,
  requireOwnership,
  combineMiddleware,
  AuthUser,
} from "../middleware/auth";

// Extend Hono's context type to include our user
declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

const controller = new IssuerController();
const issuers = new Hono();

// Helper function to determine OB version from Accept header
function determineVersion(accept: string | null): IssuerVersion {
  if (!accept) return "2.0";

  // Check for OB 3.0 specific media types
  if (
    accept.includes("application/ld+json") ||
    accept.includes("application/credential+ld+json") ||
    accept.includes("application/ob+3")
  ) {
    return "3.0";
  }

  return "2.0";
}

/**
 * Get the owner user ID for an issuer
 */
async function getIssuerOwner(c: Context): Promise<string> {
  const id = c.req.param("id");
  if (!id) throw new Error("Issuer ID is required");
  const issuer = await controller.getIssuer(c);
  return (issuer as any).ownerUserId;
}

// List all issuer profiles - requires ISSUER_VIEWER role
issuers.get("/", requireRole(Role.ISSUER_VIEWER), async (c) => {
  try {
    return await controller.listIssuers(c);
  } catch (error) {
    throw new Error(
      `Failed to list issuers: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

// Get a specific issuer by ID - requires ISSUER_VIEWER role
issuers.get("/:id", requireRole(Role.ISSUER_VIEWER), async (c) => {
  try {
    return await controller.getIssuer(c);
  } catch (error) {
    throw new Error(
      `Failed to get issuer: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

// Create a new issuer profile - requires ISSUER_ADMIN role
issuers.post("/", requireAuth, requireRole(Role.ISSUER_ADMIN), async (c) => {
  try {
    const data = await c.req.json<CreateIssuerDto>();
    const userId = (c.get("user") as any).id;
    const hostUrl = new URL(c.req.url).origin;

    const result = await controller.createIssuer(userId, data, hostUrl);
    return c.json(result);
  } catch (error) {
    throw new Error(
      `Failed to create issuer: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

// Update an existing issuer profile - requires ISSUER_ADMIN role or ownership
issuers.put(
  "/:id",
  combineMiddleware(
    requireAuth,
    requireRole([Role.ISSUER_ADMIN, Role.ISSUER_OWNER]),
    requireOwnership(getIssuerOwner),
  ),
  async (c) => {
    try {
      const data = await c.req.json<UpdateIssuerDto>();
      const hostUrl = new URL(c.req.url).origin;
      return await controller.updateIssuer(c, data, hostUrl);
    } catch (error) {
      throw new Error(
        `Failed to update issuer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
);

// Delete an issuer profile - requires ISSUER_ADMIN role or ownership
issuers.delete(
  "/:id",
  combineMiddleware(
    requireAuth,
    requireRole([Role.ISSUER_ADMIN, Role.ISSUER_OWNER]),
    requireOwnership(getIssuerOwner),
  ),
  async (c) => {
    try {
      const id = c.req.param("id");
      if (!id) throw new Error("Issuer ID is required");
      const result = await controller.deleteIssuer(id);
      return c.json({ success: result });
    } catch (error) {
      throw new Error(
        `Failed to delete issuer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
);

// Verify an issuer profile - public access
issuers.get("/:id/verify", async (c) => {
  try {
    const issuer = await controller.getIssuer(c);
    return c.json((issuer as any).issuerJson);
  } catch (error) {
    throw new Error(
      `Failed to verify issuer: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

export default issuers;
