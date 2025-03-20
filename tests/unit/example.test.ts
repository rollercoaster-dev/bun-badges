import { describe, expect, test } from "bun:test";

// Example utility function to test
function sum(a: number, b: number): number {
  return a + b;
}

describe("Unit Test Example", () => {
  test("sum function adds two numbers correctly", () => {
    expect(sum(1, 2)).toBe(3);
    expect(sum(5, 10)).toBe(15);
    expect(sum(-1, 1)).toBe(0);
  });

  test("equality examples", () => {
    // Basic equality
    expect(2 + 2).toBe(4);

    // Object equality (tests value equality)
    expect({ name: "test" }).toEqual({ name: "test" });

    // Array equality
    expect([1, 2, 3]).toEqual([1, 2, 3]);
  });

  test("truth examples", () => {
    // Checking truthy/falsy values
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
    expect(null).toBeFalsy();

    // Checking for nulls and undefined
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
  });
});
