/**
 * Server configuration module
 *
 * This module exports the server configuration without starting the server.
 * This allows the main module to import the configuration and start the server,
 * while avoiding duplicate server starts during hot module reloading.
 */

import { Hono } from "hono";
import logger from "@utils/logger";

/**
 * Create a server configuration object for Bun.serve
 * @param app The Hono app instance
 * @param port The port to listen on
 * @param hostname The hostname to bind to
 * @param isDevelopment Whether the server is running in development mode
 * @returns A configuration object for Bun.serve
 */
export function createServerConfig(
  app: Hono,
  port: number,
  hostname: string | undefined,
  isDevelopment: boolean,
) {
  return {
    port,
    hostname,
    fetch: app.fetch,
    development: isDevelopment,
    error(error: Error) {
      logger.error(`Server error: ${error.message}`);
      return new Response(`Server Error: ${error.message}`, { status: 500 });
    },
  };
}
