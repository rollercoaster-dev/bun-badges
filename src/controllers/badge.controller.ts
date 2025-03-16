import { db } from '../db/config';
import { badgeAssertions } from '../db/schema';
import { eq, count } from 'drizzle-orm';

export class BadgeController {

  async hasBadgeAssertions(badgeId: string): Promise<boolean> {
    const result = await db
      .select({ count: count() })
      .from(badgeAssertions)
      .where(eq(badgeAssertions.badgeId, badgeId));
    
    return result[0].count > 0;
  }

  constructBadgeClassJson(
    hostUrl: string, 
    badge: {
      badgeId: string;
      issuerId: string;
      name: string;
      description: string;
      criteria: string;
      imageUrl: string;
    }
  ) {
    return {
      "@context": "https://w3id.org/openbadges/v2",
      "type": "BadgeClass",
      "id": `${hostUrl}/badges/${badge.badgeId}`,
      "name": badge.name,
      "description": badge.description,
      "image": badge.imageUrl,
      "criteria": {
        "narrative": badge.criteria
      },
      "issuer": `${hostUrl}/issuers/${badge.issuerId}`
    };
  }
} 