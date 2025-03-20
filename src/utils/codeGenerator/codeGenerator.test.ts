import { expect, test, describe } from "bun:test";
import {
  generateCode,
  isCodeExpired,
  isValidCodeFormat,
} from "../../../../utils/auth/codeGenerator";

describe("Code Generator", () => {
  test("generates numeric code with default options", () => {
    const result = generateCode();

    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.ttl).toBe(300);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test("generates alphanumeric code with custom options", () => {
    const result = generateCode({
      length: 8,
      charset: "alphanumeric",
      ttl: 600,
    });

    expect(result.code).toMatch(/^[0-9A-Z]{8}$/);
    expect(result.ttl).toBe(600);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test("generates alphabetic code", () => {
    const result = generateCode({ charset: "alphabetic" });

    expect(result.code).toMatch(/^[A-Z]{6}$/);
  });
});

describe("Code Validation", () => {
  test("detects expired codes", () => {
    const pastDate = new Date(Date.now() - 1000);
    const futureDate = new Date(Date.now() + 1000);

    expect(isCodeExpired(pastDate)).toBe(true);
    expect(isCodeExpired(futureDate)).toBe(false);
  });

  test("validates code format", () => {
    expect(isValidCodeFormat("123456")).toBe(true);
    expect(isValidCodeFormat("12345")).toBe(false);
    expect(isValidCodeFormat("1234567")).toBe(false);
    expect(isValidCodeFormat("12345A")).toBe(false);
  });

  test("validates custom format", () => {
    const options = { length: 8, charset: "alphanumeric" as const };

    expect(isValidCodeFormat("12345678", options)).toBe(true);
    expect(isValidCodeFormat("1234ABCD", options)).toBe(true);
    expect(isValidCodeFormat("1234567", options)).toBe(false);
    expect(isValidCodeFormat("1234567$", options)).toBe(false);
  });
});
