import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import type { Context } from "hono";

// Environment variables for server URL construction
const hostEnv = process.env.HOST || "localhost"; // Use HOST env var or default to localhost for Swagger URL
const portEnv = process.env.PORT;
if (!portEnv) {
  throw new Error(
    "PORT environment variable is not set (required for Swagger URL).",
  );
}
const port = parseInt(portEnv, 10);
const protocol = process.env.USE_HTTPS === "true" ? "https" : "http";
const serverUrl = `${protocol}://${hostEnv}:${port}`;

export const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Bun Badges API",
    version: "0.0.1",
    description: "Open Badges server implementation using Bun and Hono",
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: serverUrl,
      description: process.env.NODE_ENV || "development",
    },
  ],
  tags: [
    {
      name: "auth",
      description: "Authentication operations",
    },
    {
      name: "badges",
      description: "Badge operations",
    },
    {
      name: "assertions",
      description: "Badge assertion (issuance) operations",
    },
    {
      name: "oauth",
      description: "OAuth operations",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Badge: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          image: { type: "string" },
          criteria: { type: "object" },
          issuer: { type: "object" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      Assertion: {
        type: "object",
        properties: {
          id: { type: "string" },
          badge_id: { type: "string" },
          recipient: { type: "object" },
          verification: { type: "object" },
          issuedOn: { type: "string", format: "date-time" },
          image: { type: "string" },
          evidence: { type: "object" },
          revoked: { type: "boolean" },
          revocation_reason: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Login to get access token",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successful login",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
          },
        },
      },
    },
    "/badges": {
      get: {
        tags: ["badges"],
        summary: "Get all badges",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of badges",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Badge" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["badges"],
        summary: "Create a new badge",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Badge" },
            },
          },
        },
        responses: {
          "201": {
            description: "Badge created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Badge" },
              },
            },
          },
        },
      },
    },
    "/badges/{id}": {
      get: {
        tags: ["badges"],
        summary: "Get badge by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Badge details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Badge" },
              },
            },
          },
          "404": {
            description: "Badge not found",
          },
        },
      },
    },
    "/assertions": {
      get: {
        tags: ["assertions"],
        summary: "Get all assertions",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of assertions",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Assertion" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["assertions"],
        summary: "Issue a badge (create assertion)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Assertion" },
            },
          },
        },
        responses: {
          "201": {
            description: "Assertion created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Assertion" },
              },
            },
          },
        },
      },
    },
  },
};

export const createSwaggerUI = () => {
  const app = new Hono();

  app.get("/openapi.json", (c) => c.json(swaggerDefinition));
  app.get("/", (c: Context) => c.redirect(`${serverUrl}/ui`));
  app.use("/ui", swaggerUI({ url: `${serverUrl}/openapi.json` }));

  return app;
};
