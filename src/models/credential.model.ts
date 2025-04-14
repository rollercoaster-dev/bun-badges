import type { OB3 } from "../utils/openbadges-types";
// Import official type guards directly from the library's OB3 namespace
import {
  isVerifiableCredential as isOB3VerifiableCredential,
  isEvidence as isOB3Evidence,
  isAchievement as isOB3Achievement,
} from "openbadges-types/dist/v3"; // Try importing from the v3 directory

/**
 * Type guard for OpenBadgeCredential (OB3.VerifiableCredential)
 * Uses the official library function.
 */
export { isOB3VerifiableCredential as isOpenBadgeCredential };

/**
 * Type guard for StatusList2021Credential
 * Checks if a VerifiableCredential is a StatusList2021 type.
 * Requires combining the official guard with a type property check.
 */
export function isStatusList2021Credential(
  obj: unknown,
): obj is OB3.VerifiableCredential & {
  type: Array<string | "StatusList2021Credential">;
} {
  // Use the official guard first to ensure obj has the basic VC structure
  if (!isOB3VerifiableCredential(obj)) {
    return false;
  }
  // Now that we know obj is a VerifiableCredential, we can safely access obj.type
  return (
    Array.isArray(obj.type) && obj.type.includes("StatusList2021Credential")
    // Optional: Add checks for subject properties if needed for robustness
  );
}

/**
 * Type guard for OB3.Evidence
 * Uses the official library function.
 */
export { isOB3Evidence as isEvidence };

/**
 * Type guard for OB3.Achievement
 * Uses the official library function.
 */
export { isOB3Achievement as isAchievement };
