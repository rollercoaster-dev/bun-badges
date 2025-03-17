import { Hono } from "hono";
import { IssuerController } from "../controllers/issuer.controller";
import { ISSUER_ROUTES } from "./aliases";
import { createIssuerSchema, updateIssuerSchema } from "../models/issuer.model";
import { ZodError } from "zod";

const issuers = new Hono();
const controller = new IssuerController();

// List all issuer profiles
issuers.get(ISSUER_ROUTES.LIST, async (c) => {
  try {
    // Extract pagination parameters
    const page = parseInt(c.req.query("page") || "1", 10);
    const limit = parseInt(c.req.query("limit") || "20", 10);

    // Get issuers with pagination
    const result = await controller.listIssuers(page, limit);

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
});

// Get a specific issuer by ID
issuers.get(ISSUER_ROUTES.GET, async (c) => {
  try {
    const issuerId = c.req.param("id");

    // Get the issuer
    const issuer = await controller.getIssuer(issuerId);

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
});

// Create a new issuer profile
issuers.post(ISSUER_ROUTES.CREATE, async (c) => {
  try {
    const body = await c.req.json();

    // Validate the request body
    try {
      const validatedData = createIssuerSchema.parse(body);

      // TODO: Get the authenticated user ID from the request
      // For now, using a placeholder - in a real implementation,
      // this would come from an authentication middleware
      const ownerUserId = "00000000-0000-0000-0000-000000000000";

      // Get the host URL for constructing absolute URLs
      const hostUrl = new URL(c.req.url).origin;

      // Create the issuer
      const issuer = await controller.createIssuer(
        ownerUserId,
        validatedData,
        hostUrl,
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
});

// Update an existing issuer profile
issuers.put(ISSUER_ROUTES.UPDATE, async (c) => {
  try {
    const issuerId = c.req.param("id");
    const body = await c.req.json();

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
});

// Delete an issuer profile
issuers.delete(ISSUER_ROUTES.DELETE, async (c) => {
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
});

// Verify an issuer profile
issuers.get(ISSUER_ROUTES.VERIFY, async (c) => {
  try {
    const issuerId = c.req.param("id");

    // Get the issuer
    const issuer = await controller.getIssuer(issuerId);

    // Verify the issuer
    const verificationResult = controller.verifyIssuer(issuer.issuerJson);

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
