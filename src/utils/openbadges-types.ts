/**
 * Adapter module for openbadges-types package
 *
 * This module re-exports types from the openbadges-types package and provides
 * helper functions for working with branded types.
 */

import { OB2, OB3, Shared, OpenBadgesVersion } from "openbadges-types";

// Re-export all types
export { OB2, OB3, Shared, OpenBadgesVersion };

/**
 * Helper function to convert a string to an IRI (Internationalized Resource Identifier)
 *
 * @param url The URL string to convert
 * @returns The URL as an IRI branded type
 * @throws Error if the URL is invalid
 */
export function toIRI(url: string): Shared.IRI {
  // Basic validation
  try {
    new URL(url);
    return url as Shared.IRI;
  } catch (_) {
    throw new Error(`Invalid IRI: ${url}`);
  }
}

/**
 * Helper function to convert a string to a DateTime
 *
 * @param dateTime The date string to convert (ISO 8601 format)
 * @returns The date string as a DateTime branded type
 * @throws Error if the date format is invalid
 */
export function toDateTime(dateTime: string): Shared.DateTime {
  // Basic ISO 8601 validation
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(
      dateTime,
    )
  ) {
    throw new Error(`Invalid DateTime format: ${dateTime}`);
  }
  return dateTime as Shared.DateTime;
}

/**
 * Helper function to check if an object is a single Achievement or an array
 *
 * @param achievement The achievement object to check
 * @returns True if it's a single Achievement, false if it's an array
 */
export function isSingleAchievement(
  achievement: OB3.Achievement | OB3.Achievement[],
): achievement is OB3.Achievement {
  return !Array.isArray(achievement);
}

/**
 * Helper function to get the name from an Achievement (handles both single and array)
 *
 * @param achievement The achievement object
 * @returns The name of the achievement
 */
export function getAchievementName(
  achievement: OB3.Achievement | OB3.Achievement[],
): string | Shared.MultiLanguageString {
  if (isSingleAchievement(achievement)) {
    return achievement.name;
  }
  // If it's an array, return the name of the first achievement
  return achievement[0]?.name || "";
}

/**
 * Example usage:
 *
 * ```typescript
 * import { OB3, toIRI, toDateTime } from './utils/openbadges-types';
 *
 * // Create a verifiable credential
 * const credential: OB3.VerifiableCredential = {
 *   '@context': ['https://www.w3.org/2018/credentials/v1'],
 *   id: toIRI('https://example.org/credentials/123'),
 *   type: ['VerifiableCredential'],
 *   issuer: {
 *     id: toIRI('https://example.org/issuers/1'),
 *     type: ['Profile'],
 *     name: 'Example Issuer',
 *     url: toIRI('https://example.org')
 *   },
 *   issuanceDate: toDateTime('2023-01-01T00:00:00Z'),
 *   credentialSubject: {
 *     id: toIRI('did:example:123'),
 *     achievement: {
 *       type: ['Achievement'],
 *       name: 'Example Achievement',
 *       description: 'This is an example achievement'
 *     }
 *   }
 * };
 * ```
 */
