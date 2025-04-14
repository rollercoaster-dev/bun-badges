/**
 * JWT utilities
 *
 * This module provides utilities for working with JWTs.
 */

/**
 * Encode an object as a base64url string
 * @param obj The object to encode
 * @returns The base64url encoded string
 */
export function encodeBase64Url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

/**
 * Decode a base64url string to an object
 * @param str The base64url encoded string
 * @returns The decoded object
 */
export function decodeBase64Url<T = unknown>(str: string): T {
  return JSON.parse(Buffer.from(str, "base64url").toString("utf8"));
}

/**
 * Split a JWT into its parts
 * @param jwt The JWT to split
 * @returns The header, payload, and signature
 */
export function splitJwt(jwt: string): [string, string, string] {
  const parts = jwt.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  return [parts[0], parts[1], parts[2]];
}

/**
 * Create a JWT from a header, payload, and signature
 * @param header The base64url encoded header
 * @param payload The base64url encoded payload
 * @param signature The base64url encoded signature
 * @returns The JWT
 */
export function createJwt(
  header: string,
  payload: string,
  signature: string,
): string {
  return `${header}.${payload}.${signature}`;
}

/**
 * Get the current timestamp in seconds
 * @returns The current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
