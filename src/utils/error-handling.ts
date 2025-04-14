/**
 * Error handling utilities
 *
 * This module provides utilities for standardized error handling across the application.
 */

import logger from "./logger";

/**
 * Utility type for async operations that can fail
 */
export type AsyncResult<T> = Promise<
  { success: true; data: T } | { success: false; error: Error }
>;

/**
 * Execute an async operation with standardized error handling
 * @param operation The async operation to execute
 * @param errorMessage The error message to use if the operation fails
 * @param logContext Additional context to include in the log message
 * @returns The result of the operation
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  logContext: Record<string, unknown> = {},
): AsyncResult<T> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    logger.error(errorMessage, { error, ...logContext });
    return {
      success: false,
      error: new Error(
        `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
      ),
    };
  }
}

/**
 * Unwrap the result of an async operation
 * @param result The result of an async operation
 * @throws The error if the operation failed
 * @returns The data if the operation succeeded
 */
export function unwrapResult<T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}
