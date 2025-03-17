import { randomBytes } from "crypto";

// Generates a secure random base64url-encoded string for OAuth authorization codes
export async function generateCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    randomBytes(32, (err, buffer) => {
      if (err) {
        reject(err);
        return;
      }
      // Convert to base64url encoding (RFC 4648)
      const code = buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      resolve(code);
    });
  });
}
