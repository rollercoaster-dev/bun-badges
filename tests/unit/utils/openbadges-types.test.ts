import { describe, test, expect } from "bun:test";
import {
  toIRI,
  toDateTime,
  isSingleAchievement,
  getAchievementName,
  OB3,
} from "../../../src/utils/openbadges-types";

describe("openbadges-types helpers", () => {
  describe("toIRI", () => {
    test("should convert a valid URL to an IRI", () => {
      const url = "https://example.com/badges/123";
      const iri = toIRI(url);
      // We need to use String() to compare the branded type with a string
      expect(String(iri)).toBe(url);
    });

    test("should throw an error for an invalid URL", () => {
      const invalidUrl = "not-a-url";
      expect(() => toIRI(invalidUrl)).toThrow("Invalid IRI");
    });
  });

  describe("toDateTime", () => {
    test("should convert a valid ISO date to a DateTime", () => {
      const date = "2023-01-01T00:00:00Z";
      const dateTime = toDateTime(date);
      // We need to use String() to compare the branded type with a string
      expect(String(dateTime)).toBe(date);
    });

    test("should throw an error for an invalid date format", () => {
      const invalidDate = "2023-01-01";
      expect(() => toDateTime(invalidDate)).toThrow("Invalid DateTime format");
    });
  });

  describe("isSingleAchievement", () => {
    test("should return true for a single achievement", () => {
      const achievement: OB3.Achievement = {
        type: ["Achievement"],
        name: "Test Achievement",
      };
      expect(isSingleAchievement(achievement)).toBe(true);
    });

    test("should return false for an array of achievements", () => {
      const achievements: OB3.Achievement[] = [
        {
          type: ["Achievement"],
          name: "Test Achievement 1",
        },
        {
          type: ["Achievement"],
          name: "Test Achievement 2",
        },
      ];
      expect(isSingleAchievement(achievements)).toBe(false);
    });
  });

  describe("getAchievementName", () => {
    test("should get the name from a single achievement", () => {
      const achievement: OB3.Achievement = {
        type: ["Achievement"],
        name: "Test Achievement",
      };
      expect(getAchievementName(achievement)).toBe("Test Achievement");
    });

    test("should get the name from the first achievement in an array", () => {
      const achievements: OB3.Achievement[] = [
        {
          type: ["Achievement"],
          name: "Test Achievement 1",
        },
        {
          type: ["Achievement"],
          name: "Test Achievement 2",
        },
      ];
      expect(getAchievementName(achievements)).toBe("Test Achievement 1");
    });

    test("should return empty string for an empty array", () => {
      const achievements: OB3.Achievement[] = [];
      expect(getAchievementName(achievements)).toBe("");
    });
  });
});
