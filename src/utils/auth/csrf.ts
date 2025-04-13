import { nanoid } from "nanoid";
import { Context } from "hono";
import { setCookie, getCookie } from "hono/cookie";

/**
 * CSRF token configuration
 */
interface CSRFConfig {
  /** Cookie name for the CSRF token */
  cookieName: string;
  /** Header name for the CSRF token */
  headerName: string;
  /** Form field name for the CSRF token */
  formFieldName: string;
  /** Secret key for CSRF token generation */
  secret?: string;
  /** Cookie options */
  cookieOptions: {
    /** HTTP only flag */
    httpOnly: boolean;
    /** Secure flag */
    secure: boolean;
    /** Same site policy */
    sameSite: "strict" | "lax" | "none";
    /** Cookie path */
    path: string;
    /** Cookie max age in seconds */
    maxAge: number;
  };
}

/**
 * Default CSRF configuration
 */
const defaultConfig: CSRFConfig = {
  cookieName: "csrf-token",
  headerName: "X-CSRF-Token",
  formFieldName: "_csrf",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400, // 24 hours
  },
};

/**
 * Generates a new CSRF token
 * @returns A random CSRF token
 */
export function generateCSRFToken(): string {
  return nanoid(32);
}

/**
 * Sets a CSRF token in the response cookies
 * @param c Hono context
 * @param config CSRF configuration
 * @returns The generated token
 */
export function setCSRFToken(
  c: Context,
  config: Partial<CSRFConfig> = {},
): string {
  const mergedConfig = { ...defaultConfig, ...config };
  const token = generateCSRFToken();

  setCookie(c, mergedConfig.cookieName, token, mergedConfig.cookieOptions);

  return token;
}

/**
 * Gets the CSRF token from the request
 * @param c Hono context
 * @param config CSRF configuration
 * @returns The CSRF token or null if not found
 */
export function getCSRFToken(
  c: Context,
  config: Partial<CSRFConfig> = {},
): string | null {
  const mergedConfig = { ...defaultConfig, ...config };

  // Try to get token from header
  const headerToken = c.req.header(mergedConfig.headerName);
  if (headerToken) {
    return headerToken;
  }

  // Try to get token from form data
  const formData = c.get("formData") as FormData | undefined;
  if (formData && formData.has(mergedConfig.formFieldName)) {
    return formData.get(mergedConfig.formFieldName) as string;
  }

  // Try to get token from JSON body
  const body = c.get("jsonBody") as Record<string, unknown> | undefined;
  if (body && typeof body[mergedConfig.formFieldName] === "string") {
    return body[mergedConfig.formFieldName] as string;
  }

  return null;
}

/**
 * Validates a CSRF token against the cookie
 * @param c Hono context
 * @param config CSRF configuration
 * @returns True if the token is valid
 */
export function validateCSRFToken(
  c: Context,
  config: Partial<CSRFConfig> = {},
): boolean {
  const mergedConfig = { ...defaultConfig, ...config };

  // Get the cookie token
  const cookieToken = getCookie(c, mergedConfig.cookieName);
  if (!cookieToken) {
    return false;
  }

  // Get the request token
  const requestToken = getCSRFToken(c, mergedConfig);
  if (!requestToken) {
    return false;
  }

  // Compare tokens (constant-time comparison to prevent timing attacks)
  return timingSafeEqual(cookieToken, requestToken);
}

/**
 * Constant-time comparison of two strings to prevent timing attacks
 * @param a First string
 * @param b Second string
 * @returns True if the strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Creates a middleware for CSRF protection
 * @param config CSRF configuration
 * @returns Middleware function
 */
export function createCSRFMiddleware(config: Partial<CSRFConfig> = {}) {
  return async (c: Context, next: Function): Promise<void | Response> => {
    const mergedConfig = { ...defaultConfig, ...config };

    // Skip CSRF check for non-state-changing methods
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(c.req.method)) {
      // For GET requests, set a new CSRF token
      if (c.req.method === "GET") {
        setCSRFToken(c, mergedConfig);
      }
      await next();
      return;
    }

    // Validate CSRF token for state-changing methods
    if (!validateCSRFToken(c, mergedConfig)) {
      return c.json({ error: "Invalid CSRF token" }, 403);
    }

    // Set a new CSRF token after successful validation
    setCSRFToken(c, mergedConfig);

    await next();
  };
}
