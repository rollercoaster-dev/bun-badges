/**
 * Compatibility module for handling differences between Node.js and Bun
 *
 * This module provides compatibility functions for packages that
 * may have issues between Node.js and Bun runtimes, such as:
 *
 * 1. canvas - Native module that requires Node.js
 */

/**
 * Canvas compatibility wrapper
 *
 * When running in Bun, this function will throw a helpful error.
 * When running in Node.js, it will load the actual canvas module.
 */
export const getCanvasModule = () => {
  // Check if we're running in Bun
  if (typeof process.versions.bun !== "undefined") {
    throw new Error(
      "Canvas module is not compatible with Bun. " +
        "Use Node.js for canvas operations or implement a Bun-compatible alternative.",
    );
  }

  // In Node.js, dynamically import canvas
  try {
    // Using require for Node.js compatibility
    // @ts-ignore - Dynamic require
    return require("canvas");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load canvas module: ${errorMessage}`);
  }
};
