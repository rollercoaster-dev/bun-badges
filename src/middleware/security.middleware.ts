import { Context, Next } from "hono";
import { nanoid } from "nanoid";
import logger from "@/utils/logger";
import { createCSRFMiddleware } from "@/utils/auth/csrf";

/**
 * Security configuration options
 */
export interface SecurityOptions {
  /** Enable Content Security Policy */
  enableCSP?: boolean;
  /** Enable XSS Protection */
  enableXSSProtection?: boolean;
  /** Enable CSRF Protection */
  enableCSRF?: boolean;
  /** CSP Report Only mode (doesn't block, only reports violations) */
  cspReportOnly?: boolean;
  /** CSP Report URI for violation reports */
  cspReportUri?: string;
}

/**
 * Default security options
 */
const defaultOptions: SecurityOptions = {
  enableCSP: true,
  enableXSSProtection: true,
  enableCSRF: true,
  cspReportOnly: process.env.NODE_ENV === "development",
  cspReportUri: "/api/csp-report",
};

/**
 * Creates a comprehensive security middleware
 *
 * This middleware adds various security headers and protections:
 * - Content Security Policy (CSP)
 * - XSS Protection
 * - CSRF Protection
 * - Additional security headers
 *
 * @param options Security configuration options
 * @returns Middleware function
 */
export function createSecurityMiddleware(options: SecurityOptions = {}) {
  // Merge provided options with defaults
  const config = { ...defaultOptions, ...options };

  // Create CSRF middleware if enabled
  const csrfMiddleware = config.enableCSRF
    ? createCSRFMiddleware({
        secret: process.env.CSRF_SECRET || "csrf-secret-change-in-production",
      })
    : null;

  // Return the middleware function
  return async (c: Context, next: Next) => {
    try {
      // Apply CSRF protection to state-changing methods if enabled
      if (
        config.enableCSRF &&
        csrfMiddleware &&
        isStateChangingMethod(c.req.method)
      ) {
        await csrfMiddleware(c, next);
        // If we reach here, CSRF check passed, continue with the request
      }

      // Add Content Security Policy if enabled
      if (config.enableCSP) {
        const cspHeader = config.cspReportOnly
          ? "Content-Security-Policy-Report-Only"
          : "Content-Security-Policy";
        const cspValue = generateCSP(config.cspReportUri);
        c.res.headers.set(cspHeader, cspValue);
      }

      // Add XSS Protection headers if enabled
      if (config.enableXSSProtection) {
        // Modern approach - use CSP to prevent XSS
        // Legacy header for older browsers
        c.res.headers.set("X-XSS-Protection", "1; mode=block");
      }

      // Add additional security headers (these complement Hono's secureHeaders)
      c.res.headers.set("X-Content-Type-Options", "nosniff");
      c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      c.res.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
      );

      // Continue to the next middleware
      await next();
    } catch (error) {
      logger.error("Security middleware error", { error });
      throw error;
    }
  };
}

/**
 * Checks if the HTTP method is one that changes state
 * @param method HTTP method
 * @returns True if the method changes state
 */
function isStateChangingMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

/**
 * Generates a Content Security Policy string
 * @param reportUri URI to report CSP violations
 * @returns CSP string
 */
function generateCSP(reportUri?: string): string {
  const directives = [
    // Default policy for everything
    "default-src 'self'",

    // Script sources
    "script-src 'self'",

    // Style sources
    "style-src 'self' 'unsafe-inline'",

    // Image sources
    "img-src 'self' data: https:",

    // Font sources
    "font-src 'self'",

    // Connect sources (for API, WebSockets)
    "connect-src 'self'",

    // Object sources (PDFs, Flash)
    "object-src 'none'",

    // Media sources (audio, video)
    "media-src 'self'",

    // Frame sources
    "frame-src 'self'",

    // Form action destinations
    "form-action 'self'",

    // Base URI restriction
    "base-uri 'self'",

    // Frame ancestors (prevents clickjacking)
    "frame-ancestors 'self'",

    // Upgrade insecure requests
    "upgrade-insecure-requests",
  ];

  // Add report-uri directive if provided
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }

  return directives.join("; ");
}

/**
 * Generates a CSRF token
 * @returns CSRF token
 */
export function generateCSRFToken(): string {
  return nanoid(32);
}

/**
 * Creates a middleware to handle CSP violation reports
 * @returns Middleware function
 */
export function createCSPReportMiddleware() {
  return async (c: Context) => {
    try {
      const report = await c.req.json();
      logger.warn("CSP Violation", { report });
      // Use c.body() for 204 responses instead of c.json()
      c.status(204);
      return c.body(null);
    } catch (error) {
      logger.error("Error processing CSP report", { error });
      return c.json({ error: "Invalid CSP report" }, 400);
    }
  };
}
