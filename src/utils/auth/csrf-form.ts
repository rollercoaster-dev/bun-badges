import { Context } from "hono";
import { setCSRFToken } from "./csrf";
import { securityConfig } from "@/config/security.config";

/**
 * Generates HTML for a CSRF token input field
 *
 * This function generates a hidden input field containing a CSRF token
 * that can be included in HTML forms for CSRF protection.
 *
 * @param c Hono context
 * @returns HTML string with hidden input field
 */
export function csrfTokenField(c: Context): string {
  const token = setCSRFToken(c, {
    cookieName: securityConfig.csrf.cookieName,
    cookieOptions: securityConfig.csrf.cookieOptions,
  });

  return `<input type="hidden" name="${securityConfig.csrf.formFieldName}" value="${token}">`;
}

/**
 * Generates a CSRF token and returns it as JSON
 *
 * This function is useful for SPA applications that need to include
 * CSRF tokens in AJAX requests.
 *
 * @param c Hono context
 * @returns JSON response with CSRF token
 */
export async function csrfTokenJSON(c: Context) {
  const token = setCSRFToken(c, {
    cookieName: securityConfig.csrf.cookieName,
    cookieOptions: securityConfig.csrf.cookieOptions,
  });

  return c.json({
    csrfToken: token,
    csrfHeaderName: securityConfig.csrf.headerName,
    csrfFieldName: securityConfig.csrf.formFieldName,
  });
}

/**
 * Creates a route handler for CSRF token generation
 *
 * This function returns a route handler that generates a new CSRF token
 * and returns it as JSON. This is useful for SPA applications.
 *
 * @returns Route handler function
 */
export function createCSRFTokenHandler() {
  return async (c: Context) => {
    return csrfTokenJSON(c);
  };
}
