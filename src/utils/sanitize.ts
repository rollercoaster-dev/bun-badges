/**
 * Log Sanitization Utility
 *
 * Provides functions to recursively sanitize strings, objects, and arrays
 * to prevent logging sensitive information.
 */

// --- Configuration ---

// List of environment variable keys whose values should always be redacted
const SENSITIVE_ENV_KEYS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET", // Example, adjust as needed
  "API_KEY",
  "CLIENT_SECRET",
  // Add any other sensitive env var keys here
];

// Regex patterns to identify and redact sensitive data within strings
const SENSITIVE_PATTERNS = [
  // Generic password/secret patterns (adjust for robustness)
  {
    name: "password",
    regex: /(password|secret|passwd|pwd)=[^&\s]+/gi,
    replacement: "$1=[REDACTED]",
  },
  // Authorization Bearer token
  {
    name: "bearer_token",
    regex: /(Bearer\s+)[\w.-]+/gi,
    replacement: "$1[REDACTED]",
  },
  // Basic Auth
  {
    name: "basic_auth",
    regex: /(Authorization:\s+Basic\s+)[\w=]+/gi,
    replacement: "$1[REDACTED]",
  },
  // Common API Key patterns (examples, refine based on actual keys)
  {
    name: "api_key_sk",
    regex: /(sk_[a-zA-Z0-9_]+)/gi,
    replacement: "[REDACTED_API_KEY]",
  },
  {
    name: "api_key_pk",
    regex: /(pk_[a-zA-Z0-9_]+)/gi,
    replacement: "[REDACTED_API_KEY]",
  },
  // Credit card numbers (basic example)
  {
    name: "credit_card",
    regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    replacement: "[REDACTED_CC]",
  },
  // Email addresses (optional, depending on policy)
  // { name: "email", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: '[REDACTED_EMAIL]' },
];

// --- Sanitization Logic ---

/**
 * Sanitizes a string by applying sensitive patterns.
 * @param input The string to sanitize.
 * @returns The sanitized string.
 */
const sanitizeString = (input: string): string => {
  let sanitized = input;
  for (const { regex, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(regex, replacement);
  }
  return sanitized;
};

/**
 * Recursively sanitizes an object, array, or primitive value.
 * @param data The data to sanitize.
 * @param visited Set to track visited objects and prevent infinite loops.
 * @returns The sanitized data.
 */
export const sanitizeValue = (
  data: unknown,
  visited = new Set<unknown>(),
): unknown => {
  if (data === null || typeof data !== "object") {
    // Primitives (string, number, boolean, null, undefined, symbol, bigint)
    if (typeof data === "string") {
      return sanitizeString(data);
    }
    return data; // Return other primitives as is
  }

  // Prevent infinite loops with circular references
  if (visited.has(data)) {
    return "[Circular Reference]";
  }
  visited.add(data);

  if (Array.isArray(data)) {
    // Sanitize each element in the array
    const sanitizedArray = data.map((item) =>
      sanitizeValue(item, new Set(visited)),
    ); // Clone visited set for each branch
    visited.delete(data); // Remove after processing this level
    return sanitizedArray;
  }

  // Handle general objects
  const sanitizedObject: Record<string, unknown> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = (data as Record<string, unknown>)[key];

      // Redact values of known sensitive environment variable keys
      if (SENSITIVE_ENV_KEYS.includes(key.toUpperCase())) {
        sanitizedObject[key] = "[REDACTED_ENV]";
      } else {
        // Sanitize the key itself (in case key contains sensitive info)
        const sanitizedKey = sanitizeString(key);
        // Recursively sanitize the value
        sanitizedObject[sanitizedKey] = sanitizeValue(value, new Set(visited)); // Clone visited set
      }
    }
  }

  visited.delete(data); // Remove after processing this level
  return sanitizedObject;
};

/**
 * Sanitizes a log message string and any additional arguments.
 * @param message The main log message string.
 * @param args Additional arguments passed to the logger.
 * @returns An object containing the sanitized message and arguments.
 */
export const sanitizeLogArguments = (
  message: unknown, // Accept unknown type
  args: unknown[],
): { sanitizedMessage: unknown; sanitizedArgs: unknown[] } => {
  // Only sanitize the message if it's actually a string
  const sanitizedMessage =
    typeof message === "string" ? sanitizeString(message) : message;
  const sanitizedArgs = args.map((arg) => sanitizeValue(arg));
  return { sanitizedMessage, sanitizedArgs };
};
