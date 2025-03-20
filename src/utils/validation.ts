/**
 * Validation utilities for Bun Badges
 */

/**
 * UUID validation regex
 * This regex validates a string to ensure it's in proper UUID format (8-4-4-4-12)
 * with each segment containing valid hexadecimal characters.
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is in valid UUID format
 *
 * @param id The string to validate
 * @returns true if valid UUID format, false otherwise
 */
export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Validate if a string is in valid URI format
 *
 * @param uri The string to validate
 * @returns true if valid URI format, false otherwise
 */
export function isValidUri(uri: string): boolean {
  try {
    new URL(uri);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate if a string is a valid email
 *
 * @param email The string to validate
 * @returns true if valid email format, false otherwise
 */
export function isValidEmail(email: string): boolean {
  // Using a simple regex for basic email validation
  // For production systems, consider more comprehensive validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
