import { Hono } from "hono";
import { type Context } from "hono";
import { Role } from "../middleware/auth";
import {
  requireAuth,
  requireRole,
  requireOwnership,
  combineMiddleware,
  type AuthUser,
} from "../middleware/auth";
import { IssuerController } from "../controllers/issuer.controller";
import {
  type CreateIssuerDto,
  type UpdateIssuerDto,
} from "../models/issuer.model";

// Extend Hono's context type to include our user
declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

const controller = new IssuerController();
const issuers = new Hono();

// Interface for issuer response with ownerUserId
interface IssuerResponse {
  issuerId: string;
  ownerUserId: string;
  name: string;
  url: string;
  description?: string;
  email?: string;
  issuerJson: Record<string, unknown>;
  publicKey?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get the owner user ID for an issuer
 */
async function getIssuerOwner(c: Context): Promise<string> {
  const id = c.req.param("id");
  if (!id) throw new Error("Issuer ID is required");
  const response = await controller.getIssuer(c);
  const data = (await response.json()) as IssuerResponse;
  return data.ownerUserId;
}

// List issuers
issuers.get("/", requireRole(Role.ISSUER_VIEWER), async (c) => {
  try {
    return await controller.listIssuers(c);
  } catch (error) {
    throw new Error(
      `Failed to list issuers: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

// Get issuer by ID
issuers.get("/:id", requireRole(Role.ISSUER_VIEWER), async (c) => {
  try {
    return await controller.getIssuer(c);
  } catch (error) {
    throw new Error(
      `Failed to get issuer: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

// Create issuer
issuers.post("/", requireAuth, requireRole(Role.ISSUER_ADMIN), async (c) => {
  try {
    const data = await c.req.json<CreateIssuerDto>();
    const userId = (c.get("user") as AuthUser).id;
    const hostUrl = new URL(c.req.url).origin;

    const result = await controller.createIssuer(userId, data, hostUrl);
    return c.json(result);
  } catch (error) {
    throw new Error(
      `Failed to create issuer: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

// Update issuer
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

// Delete issuer
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

// Verify issuer
issuers.get("/:id/verify", async (c) => {
  try {
    const response = await controller.getIssuer(c);
    const data = (await response.json()) as IssuerResponse;
    return c.json(data.issuerJson);
  } catch (error) {
    throw new Error(
      `Failed to verify issuer: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

export default issuers;
