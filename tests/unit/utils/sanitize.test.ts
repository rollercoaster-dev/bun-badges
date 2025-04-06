import { describe, it, expect } from "bun:test";
import { sanitizeValue, sanitizeLogArguments } from "@/utils/sanitize";

describe("Log Sanitization Utilities", () => {
  // --- sanitizeValue Tests ---
  describe("sanitizeValue", () => {
    it("should sanitize sensitive strings", () => {
      expect(sanitizeValue("User logged in with password=secret123")).toBe(
        "User logged in with password=[REDACTED]",
      );
      expect(sanitizeValue("Authorization: Bearer sk_test_12345ABC")).toBe(
        "Authorization: Bearer [REDACTED]",
      );
      expect(sanitizeValue("API Key: sk_live_abcdefg")).toBe(
        "API Key: [REDACTED_API_KEY]",
      );
      expect(sanitizeValue("pk_test_zyxwvu")).toBe("[REDACTED_API_KEY]");
      expect(sanitizeValue("CC: 1234-5678-9012-3456")).toBe(
        "CC: [REDACTED_CC]",
      );
      expect(
        sanitizeValue(
          "Basic auth: Authorization: Basic YWxhZGRpbjpvcGVuc2VzYW1l",
        ),
      ).toBe("Basic auth: Authorization: Basic [REDACTED]");
    });

    it("should not change non-sensitive strings", () => {
      expect(sanitizeValue("This is a normal message")).toBe(
        "This is a normal message",
      );
      expect(sanitizeValue("User ID: 12345")).toBe("User ID: 12345");
    });

    it("should handle non-string primitives", () => {
      expect(sanitizeValue(123)).toBe(123);
      expect(sanitizeValue(true)).toBe(true);
      expect(sanitizeValue(null)).toBe(null);
      expect(sanitizeValue(undefined)).toBe(undefined);
    });

    it("should sanitize arrays recursively", () => {
      const input = ["normal", "password=bad", { nested: "Bearer sk_abc" }];
      const expected = [
        "normal",
        "password=[REDACTED]",
        { nested: "Bearer [REDACTED]" },
      ];
      expect(sanitizeValue(input)).toEqual(expected);
    });

    it("should sanitize objects recursively", () => {
      const input = {
        user: "Alice",
        credentials: {
          type: "password",
          value: "secret", // Note: pattern requires key=value format
          token: "Bearer sk_xyz",
        },
        data: [1, "pk_test_123", true],
      };
      const expected = {
        user: "Alice",
        credentials: {
          type: "password",
          value: "secret",
          token: "Bearer [REDACTED]",
        },
        data: [1, "[REDACTED_API_KEY]", true],
      };
      expect(sanitizeValue(input)).toEqual(expected);
    });

    it("should redact sensitive environment variable keys in objects", () => {
      const input = {
        config: {
          DATABASE_URL: "postgres://user:pass@host:port/db",
          JWT_SECRET: "supersecretjwttoken",
          port: 3000,
        },
        other: "value",
      };
      const expected = {
        config: {
          DATABASE_URL: "[REDACTED_ENV]",
          JWT_SECRET: "[REDACTED_ENV]",
          port: 3000,
        },
        other: "value",
      };
      expect(sanitizeValue(input)).toEqual(expected);
    });

    it("should handle circular references", () => {
      const obj1: any = { name: "obj1" };
      const obj2: any = { name: "obj2", ref: obj1 };
      obj1.ref = obj2;

      const expected = {
        name: "obj1",
        ref: {
          name: "obj2",
          ref: "[Circular Reference]",
        },
      };
      expect(sanitizeValue(obj1)).toEqual(expected);
    });

    it("should sanitize keys containing sensitive patterns", () => {
      const input = {
        "user_password=abc": "some_value",
        normalKey: "normalValue",
      };
      const expected = {
        "user_password=[REDACTED]": "some_value",
        normalKey: "normalValue",
      };
      expect(sanitizeValue(input)).toEqual(expected);
    });
  });

  // --- sanitizeLogArguments Tests ---
  describe("sanitizeLogArguments", () => {
    it("should sanitize both message and arguments", () => {
      const message = "Login attempt for user: password=foo";
      const args = [
        { ip: "127.0.0.1", token: "Bearer sk_123" },
        "pk_test_abc",
        { env: { DATABASE_URL: "sensitive_db_url" } },
      ];

      const expectedMessage = "Login attempt for user: password=[REDACTED]";
      const expectedArgs = [
        { ip: "127.0.0.1", token: "Bearer [REDACTED]" },
        "[REDACTED_API_KEY]",
        { env: { DATABASE_URL: "[REDACTED_ENV]" } },
      ];

      const { sanitizedMessage, sanitizedArgs } = sanitizeLogArguments(
        message,
        args,
      );

      expect(sanitizedMessage).toBe(expectedMessage);
      expect(sanitizedArgs).toEqual(expectedArgs);
    });

    it("should handle non-string messages", () => {
      const message: any = { info: "Starting up", password: "abc" }; // Non-string message
      const args = [123];

      const { sanitizedMessage, sanitizedArgs } = sanitizeLogArguments(
        message,
        args,
      );

      // Non-string messages are not sanitized by sanitizeString, passed as is
      expect(sanitizedMessage).toEqual({
        info: "Starting up",
        password: "abc",
      });
      expect(sanitizedArgs).toEqual([123]);
    });
  });
});
