import { Hono } from "hono";
import { Context } from "hono";
import {
  IssuerController,
  IssuerVersion,
} from "../controllers/issuer.controller";
import { ISSUER_ROUTES } from "./aliases";
import { createIssuerSchema, updateIssuerSchema } from "../models/issuer.model";
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

const issuers = new Hono();
const controller = new IssuerController();

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

// Helper to get issuer owner ID
async function getIssuerOwnerId(c: Context): Promise<string> {
  const issuerId = c.req.param("id");
  const issuer = await controller.getIssuer(issuerId);
  return issuer.ownerUserId;
}

// List all issuer profiles - requires ISSUER_VIEWER role
issuers.get(
  ISSUER_ROUTES.LIST,
  combineMiddleware(requireAuth, requireRole(Role.ISSUER_VIEWER)),
  async (c) => {
    try {
      // Extract pagination parameters
      const page = parseInt(c.req.query("page") || "1", 10);
      const limit = parseInt(c.req.query("limit") || "20", 10);

      // Determine version from Accept header
      const version = determineVersion(c.req.header("Accept") ?? null);

      // Get issuers with pagination
      const result = await controller.listIssuers(page, limit, version);

      return c.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      console.error("Failed to list issuers:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "SERVER_ERROR",
            message: "Failed to retrieve issuers",
          },
        },
        500,
      );
    }
  },
);

// Get a specific issuer by ID - requires ISSUER_VIEWER role
issuers.get(
  ISSUER_ROUTES.GET,
  combineMiddleware(requireAuth, requireRole(Role.ISSUER_VIEWER)),
  async (c) => {
    try {
      const issuerId = c.req.param("id");
      const version = determineVersion(c.req.header("Accept") ?? null);

      // Get the issuer
      const issuer = await controller.getIssuer(issuerId, version);

      return c.json({
        status: "success",
        data: {
          issuer,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Issuer not found") {
        return c.json(
          {
            status: "error",
            error: {
              code: "NOT_FOUND",
              message: "Issuer not found",
            },
          },
          404,
        );
      }

      console.error("Failed to get issuer:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "SERVER_ERROR",
            message: "Failed to retrieve issuer",
          },
        },
        500,
      );
    }
  },
);

// Create a new issuer profile - requires ISSUER_ADMIN role
issuers.post(
  ISSUER_ROUTES.CREATE,
  combineMiddleware(requireAuth, requireRole(Role.ISSUER_ADMIN)),
  async (c) => {
    try {
      const body = await c.req.json();
      const version = determineVersion(c.req.header("Accept") ?? null);

      // Validate the request body
      try {
        const validatedData = createIssuerSchema.parse(body);

        // Get the authenticated user ID from the context
        const user = c.get("user");
        const ownerUserId = user.id;

        // Get the host URL for constructing absolute URLs
        const hostUrl = new URL(c.req.url).origin;

        // Create the issuer
        const issuer = await controller.createIssuer(
          ownerUserId,
          validatedData,
          hostUrl,
          version,
        );

        return c.json(
          {
            status: "success",
            data: {
              issuer,
            },
          },
          201,
        );
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return c.json(
            {
              status: "error",
              error: {
                code: "VALIDATION",
                message: "Invalid request data",
                details: validationError.errors,
              },
            },
            400,
          );
        }
        throw validationError;
      }
    } catch (error) {
      console.error("Failed to create issuer:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "SERVER_ERROR",
            message: "Failed to create issuer",
          },
        },
        500,
      );
    }
  },
);

// Update an existing issuer profile - requires ISSUER_ADMIN role or ownership
issuers.put(
  ISSUER_ROUTES.UPDATE,
  combineMiddleware(
    requireAuth,
    requireRole([Role.ISSUER_ADMIN, Role.ISSUER_OWNER]),
    requireOwnership(getIssuerOwnerId),
  ),
  async (c) => {
    try {
      const issuerId = c.req.param("id");
      const body = await c.req.json();
      const version = determineVersion(c.req.header("Accept") ?? null);

      // Validate the request body
      try {
        const validatedData = updateIssuerSchema.parse(body);

        // Get the host URL for constructing absolute URLs
        const hostUrl = new URL(c.req.url).origin;

        // Update the issuer
        const issuer = await controller.updateIssuer(
          issuerId,
          validatedData,
          hostUrl,
          version,
        );

        return c.json({
          status: "success",
          data: {
            issuer,
          },
        });
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return c.json(
            {
              status: "error",
              error: {
                code: "VALIDATION",
                message: "Invalid request data",
                details: validationError.errors,
              },
            },
            400,
          );
        }
        throw validationError;
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Issuer not found") {
        return c.json(
          {
            status: "error",
            error: {
              code: "NOT_FOUND",
              message: "Issuer not found",
            },
          },
          404,
        );
      }

      console.error("Failed to update issuer:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "SERVER_ERROR",
            message: "Failed to update issuer",
          },
        },
        500,
      );
    }
  },
);

// Delete an issuer profile - requires ISSUER_ADMIN role or ownership
issuers.delete(
  ISSUER_ROUTES.DELETE,
  combineMiddleware(
    requireAuth,
    requireRole([Role.ISSUER_ADMIN, Role.ISSUER_OWNER]),
    requireOwnership(getIssuerOwnerId),
  ),
  async (c) => {
    try {
      const issuerId = c.req.param("id");

      // Delete the issuer
      await controller.deleteIssuer(issuerId);

      // Return 204 status with no content
      return new Response(null, { status: 204 });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Issuer not found") {
          return c.json(
            {
              status: "error",
              error: {
                code: "NOT_FOUND",
                message: "Issuer not found",
              },
            },
            404,
          );
        } else if (
          error.message === "Cannot delete issuer with associated badges" ||
          error.message === "Cannot delete issuer with associated assertions"
        ) {
          return c.json(
            {
              status: "error",
              error: {
                code: "CONFLICT",
                message: error.message,
              },
            },
            409,
          );
        }
      }

      console.error("Failed to delete issuer:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "SERVER_ERROR",
            message: "Failed to delete issuer",
          },
        },
        500,
      );
    }
  },
);

// Verify an issuer profile - public access
issuers.get(ISSUER_ROUTES.VERIFY, async (c) => {
  try {
    const issuerId = c.req.param("id");
    const version = determineVersion(c.req.header("Accept") ?? null);

    // Get the issuer
    const issuer = await controller.getIssuer(issuerId, version);

    // Verify the issuer
    const verificationResult = controller.verifyIssuer(
      issuer.issuerJson,
      version,
    );

    return c.json({
      status: "success",
      data: {
        valid: verificationResult.valid,
        errors: verificationResult.errors,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Issuer not found") {
      return c.json(
        {
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Issuer not found",
          },
        },
        404,
      );
    }

    console.error("Failed to verify issuer:", error);
    return c.json(
      {
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to verify issuer",
        },
      },
      500,
    );
  }
});

export default issuers;
