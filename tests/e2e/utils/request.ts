/**
 * E2E Test Request Utilities
 *
 * This module provides functions for making common API requests in tests,
 * with built-in error handling and response processing.
 */

// Using our custom request type instead of supertest

/**
 * Options for issuing a test badge
 */
export interface BadgeOptions {
  name: string;
  description: string;
  recipient: string;
  token: string;
  hashed?: boolean;
  salt?: string;
  criteria?: { narrative: string };
  image?: string;
  format?: "ob3" | "ob2";
}

/**
 * Issues a test badge with the given options
 * @param request Request helper
 * @param options Badge creation options
 * @returns The created badge
 */
export async function issueTestBadge(request: any, options: BadgeOptions) {
  // Format the recipient based on type
  const recipient = {
    identity: options.recipient,
    type: options.recipient.includes("@") ? "email" : "url",
    hashed: options.hashed || false,
    salt: options.salt,
  };

  // Format query parameters for OB3 if needed
  const queryParams = options.format ? `?format=${options.format}` : "";

  // Make the request
  const response = await request.authRequest(
    "post",
    `/api/badges${queryParams}`,
    options.token,
    {
      name: options.name,
      description: options.description,
      criteria: options.criteria || { narrative: "Test criteria" },
      image: options.image || "https://example.com/badge.png",
    },
  );

  if (response.status !== 201) {
    throw new Error(`Failed to issue badge: ${JSON.stringify(response.body)}`);
  }

  // If the badge is created, create an assertion
  const badgeId = response.body.id;

  const assertionResponse = await request.authRequest(
    "post",
    `/api/assertions${queryParams}`,
    options.token,
    {
      badgeId,
      recipient,
    },
  );

  if (assertionResponse.status !== 201) {
    throw new Error(
      `Failed to issue assertion: ${JSON.stringify(assertionResponse.body)}`,
    );
  }

  return {
    badge: response.body,
    credential: assertionResponse.body,
    credentialId: assertionResponse.body.id,
    badgeId,
  };
}

/**
 * Verifies a test badge by ID or credential
 * @param request Request helper
 * @param params Verification parameters (either id or credential)
 * @param format Optional format specification
 * @returns Verification result
 */
export async function verifyTestBadge(
  request: any,
  params: { id?: string; credential?: any },
  format?: "ob3" | "ob2",
) {
  // Format query parameters for OB3 if needed
  const queryParams = format ? `?format=${format}` : "";

  // Prepare request body based on input
  const body = params.id
    ? { credentialId: params.id }
    : { credential: params.credential };

  const response = await request.post(`/api/verify${queryParams}`, body);

  return {
    status: response.status,
    body: response.body,
    isValid:
      response.status === 200 &&
      (response.body.verified === true || response.body.valid === true),
    verificationDetails: response.body,
  };
}

/**
 * Revokes a test badge by ID
 * @param request Request helper
 * @param id Credential/assertion ID to revoke
 * @param token Auth token
 * @param reason Optional reason for revocation
 * @returns Revocation result
 */
export async function revokeTestBadge(
  request: any,
  id: string,
  token: string,
  reason?: string,
) {
  const response = await request.authRequest(
    "post",
    `/api/assertions/${id}/revoke`,
    token,
    { reason: reason || "Testing revocation" },
  );

  if (response.status !== 200) {
    throw new Error(`Failed to revoke badge: ${JSON.stringify(response.body)}`);
  }

  return response.body;
}

/**
 * Retrieves a credential by ID
 * @param request Request helper
 * @param id Credential/assertion ID
 * @param format Optional format (ob3 or ob2)
 * @returns The credential
 */
export async function getCredential(
  request: any,
  id: string,
  format?: "ob3" | "ob2",
) {
  // Format query parameters for OB3 if needed
  const queryParams = format ? `?format=${format}` : "";

  const response = await request.get(`/api/assertions/${id}${queryParams}`);

  if (response.status !== 200) {
    throw new Error(
      `Failed to get credential: ${JSON.stringify(response.body)}`,
    );
  }

  return response.body;
}

/**
 * Retrieves a badge by ID
 * @param request Request helper
 * @param id Badge ID
 * @param format Optional format (ob3 or ob2)
 * @returns The badge
 */
export async function getBadge(
  request: any,
  id: string,
  format?: "ob3" | "ob2",
) {
  // Format query parameters for OB3 if needed
  const queryParams = format ? `?format=${format}` : "";

  const response = await request.get(`/api/badges/${id}${queryParams}`);

  if (response.status !== 200) {
    throw new Error(`Failed to get badge: ${JSON.stringify(response.body)}`);
  }

  return response.body;
}
