import * as jose from "jose";
import { BadRequestError, UnauthorizedError } from "../errors";
import type { oauthClients } from "../../db/schema/oauth";

// Define expected claims for JAR
interface JarPayload extends jose.JWTPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  nbf?: number;
  jti?: string;
  // Include standard OAuth parameters
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  nonce?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

// Function to fetch JWKS from either jwks or jwks_uri
async function getClientJwks(
  client: typeof oauthClients.$inferSelect,
): Promise<jose.JSONWebKeySet | null> {
  if (client.jwks) {
    // Ensure client.jwks is treated as the correct type
    return client.jwks as unknown as jose.JSONWebKeySet;
  }
  if (client.jwksUri) {
    try {
      const response = await fetch(client.jwksUri);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch JWKS from ${client.jwksUri}: ${response.statusText}`,
        );
      }
      return (await response.json()) as jose.JSONWebKeySet;
    } catch (error) {
      console.error("Error fetching JWKS URI:", error);
      throw new BadRequestError("Could not retrieve client JWKS");
    }
  }
  return null;
}

// Helper to create JWKSet function for jose.jwtVerify
// Handles both direct JWKS and JWKS URI
function createKeySetFunction(
  client: typeof oauthClients.$inferSelect,
): jose.JWTVerifyGetKey {
  if (client.jwks) {
    // Use inline JWKS
    const localJWKSet = client.jwks as unknown as jose.JSONWebKeySet;
    return async (protectedHeader, token) => {
      // You might want basic header validation here if needed
      // Find the key in the local set
      const keys = localJWKSet.keys.filter(
        (key) =>
          (!key.kid || key.kid === protectedHeader.kid) &&
          (!key.alg || key.alg === protectedHeader.alg) &&
          (!key.use || key.use === "sig"),
      );
      if (keys.length === 0) {
        throw new Error("No matching key found in local JWKS");
      }
      // Assuming the first match is the one we want, or add more logic
      return jose.importJWK(keys[0]);
    };
  }
  if (client.jwksUri) {
    // Use remote JWKS URI
    return jose.createRemoteJWKSet(new URL(client.jwksUri));
  }

  // If neither is provided, throw an error (should be caught earlier by registration validation)
  throw new Error("Client has no JWKS or JWKS URI configured");
}

/**
 * Verifies a JWT Request Object (JAR).
 *
 * @param requestJwt The encoded JWT string from the 'request' parameter.
 * @param client The OAuth client database record.
 * @param expectedAudience The expected audience (usually the issuer URL of the auth server).
 * @returns The verified payload of the JWT.
 * @throws {BadRequestError | UnauthorizedError} If verification fails.
 */
export async function verifyJar(
  requestJwt: string,
  client: typeof oauthClients.$inferSelect,
  expectedAudience: string,
): Promise<JarPayload> {
  if (!client.requestObjectSigningAlg) {
    throw new BadRequestError(
      "Client is not configured for signed request objects",
    );
  }

  const getKeySet = createKeySetFunction(client);

  try {
    const { payload, protectedHeader } = await jose.jwtVerify(
      requestJwt,
      getKeySet,
      {
        issuer: client.clientId, // Expect issuer to be the client_id
        audience: expectedAudience, // Expect audience to be the authorization server
        algorithms: [client.requestObjectSigningAlg], // Use the algorithm configured for the client
        // Add clock tolerance if needed
        // clockTolerance: '5s',
      },
    );

    // Basic OAuth parameter checks within the JAR payload
    if (!payload.response_type || !payload.client_id || !payload.redirect_uri) {
      throw new BadRequestError(
        "Request object missing required parameters (response_type, client_id, redirect_uri)",
      );
    }

    if (payload.client_id !== client.clientId) {
      throw new BadRequestError(
        "Request object client_id does not match authenticated client_id",
      );
    }

    // Validate redirect_uri if present in payload
    if (
      payload.redirect_uri &&
      !client.redirectUris.includes(payload.redirect_uri as string)
    ) {
      throw new BadRequestError(
        "Request object redirect_uri is not registered for this client",
      );
    }

    // Add more claim validations as needed (e.g., nbf, jti, scope consistency)

    return payload as JarPayload;
  } catch (error: any) {
    console.error("JAR verification failed:", error);
    if (error instanceof jose.errors.JWTExpired) {
      throw new UnauthorizedError("Request object has expired");
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      throw new UnauthorizedError(
        `Request object claim validation failed: ${error.message}`,
      );
    }
    if (
      error instanceof jose.errors.JWSSignatureVerificationFailed ||
      error instanceof jose.errors.JWKSMultipleMatchingKeys ||
      error instanceof jose.errors.JWKSNoMatchingKey
    ) {
      throw new UnauthorizedError(
        "Request object signature verification failed",
      );
    }
    // Catch other jose errors or re-throw general errors
    throw new UnauthorizedError(
      `Invalid request object: ${error.message || "Verification failed"}`,
    );
  }
}
