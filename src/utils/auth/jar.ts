import * as jose from "jose";
import type { VerificationService } from "@services/verification.service";
// Import logger
// import { createLogger } from "@/utils/logger";
import logger from "@/utils/logger";

// Create logger instance
// const logger = createLogger("JarUtils");
const baseLogger = logger.child({ context: "JarUtils" });

// Define expected claims for JAR
interface JarPayload extends jose.JWTPayload {
  response_type?: string;
  client_id: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

/**
 * Verifies a JWT Request Object (JAR).
 * @param requestObject The encoded JWT string from the 'request' parameter.
 * @param expectedClientId The expected client ID.
 * @param issuer The expected issuer (our server).
 * @param verificationService Service for key verification (will be used for JWKS lookup).
 * @returns The verified payload and header.
 * @throws {Error} If verification fails.
 */
export async function verifyJar(
  requestObject: string,
  expectedClientId: string,
  issuer: string,
  verificationService: VerificationService,
): Promise<jose.JWTVerifyResult<JarPayload>> {
  try {
    const keyLookup: jose.JWTVerifyGetKey = async (
      protectedHeader,
    ): Promise<CryptoKey | Uint8Array> => {
      const kid = protectedHeader.kid;
      try {
        // Attempt to get the client's key using verificationService
        // This will throw until implemented, but at least we're using the service
        const key = await verificationService.verifyKey(
          expectedClientId,
          kid ? Buffer.from(kid) : Buffer.alloc(0), // Convert kid to Uint8Array
        );
        if (!key) {
          throw new Error("Client key not found");
        }
        return key.key;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `JWKS lookup failed for client ${expectedClientId}: ${message}`,
        );
      }
    };

    // Verify the JWT (Request Object)
    const result = await jose.jwtVerify<JarPayload>(requestObject, keyLookup, {
      issuer: issuer,
      audience: issuer,
      algorithms: ["ES256K", "RS256"],
    });

    // --- Payload Validation ---
    if (result.payload.client_id !== expectedClientId) {
      throw new Error(
        `JAR client_id (${result.payload.client_id}) does not match expected client_id (${expectedClientId})`,
      );
    }

    // Basic OAuth parameter checks
    if (
      !result.payload.response_type ||
      !result.payload.client_id ||
      !result.payload.redirect_uri
    ) {
      throw new Error(
        "Request object missing required parameters (response_type, client_id, redirect_uri)",
      );
    }

    // Replace console.log with logger.info
    // logger.info("JAR Verified Successfully for client:", expectedClientId);
    baseLogger.info(
      { clientId: expectedClientId },
      "JAR Verified Successfully",
    );
    return result;
  } catch (error: unknown) {
    // Replace console.error
    // logger.error(
    //  "JAR Verification Failed:",
    //  error instanceof Error ? error.message : String(error),
    // );
    baseLogger.error(error, "JAR Verification Failed");
    if (error instanceof jose.errors.JWTExpired) {
      throw new Error("Request object (JAR) has expired");
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      throw new Error(
        `Request object (JAR) claim validation failed: ${error.message}`,
      );
    }
    throw new Error(
      `Invalid request object (JAR): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
