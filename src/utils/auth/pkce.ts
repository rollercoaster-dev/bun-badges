import { createHash } from "crypto";

/**
 * Verify a code verifier against the previously stored code challenge
 * @param codeVerifier The plain code verifier sent by the client
 * @param codeChallenge The code challenge previously stored
 * @param codeChallengeMethod The method used to create the challenge (S256 or plain)
 * @returns Boolean indicating if the verification passed
 */
export function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string,
  codeChallengeMethod: string,
): boolean {
  if (!codeVerifier || !codeChallenge) {
    return false;
  }

  // For plain method, directly compare
  if (!codeChallengeMethod || codeChallengeMethod === "plain") {
    return codeVerifier === codeChallenge;
  }

  // For S256 method, hash the verifier and compare
  if (codeChallengeMethod === "S256") {
    const hash = createHash("sha256")
      .update(codeVerifier)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    return hash === codeChallenge;
  }

  // Unsupported method
  return false;
}

/**
 * Generates a code challenge from a code verifier using the specified method
 * @param codeVerifier The plain code verifier
 * @param method The challenge method ('S256' or 'plain')
 * @returns The generated code challenge
 */
export function generateCodeChallenge(
  codeVerifier: string,
  method: string = "S256",
): string {
  if (!codeVerifier) {
    throw new Error("Code verifier is required");
  }

  if (method === "plain") {
    return codeVerifier;
  }

  if (method === "S256") {
    return createHash("sha256")
      .update(codeVerifier)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  throw new Error(`Unsupported code challenge method: ${method}`);
}
