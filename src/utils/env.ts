import { config } from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
config();

// Define environment variable schema
const envSchema = z.object({
  // Server configuration
  PORT: z.string().default("3000"),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database configuration
  DATABASE_URL: z.string().optional(),

  // Logging configuration
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  // JWT configuration
  JWT_SECRET: z.string().default("secret"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
  JWT_PRIVATE_KEY_PATH: z.string().optional(),
  JWT_PUBLIC_KEY_PATH: z.string().optional(),

  // OAuth configuration
  OAUTH_SERVER_URL: z.string().optional(),
  CLIENT_URI: z.string().optional(),
  REDIRECT_URI: z.string().optional(),
  LOGO_URI: z.string().optional(),
  ACCESS_TOKEN_EXPIRES_IN: z.string().optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().optional(),

  // Key management configuration
  KEYS_DIR: z.string().optional(),
});

// Parse environment variables
export const env = envSchema.parse(process.env);
