import { describe, expect, it, mock, beforeEach } from "bun:test";
import {
  generateCSRFToken,
  setCSRFToken,
  getCSRFToken,
  validateCSRFToken,
} from "@/utils/auth/csrf";

// Mock the hono/cookie module
mock.module("hono/cookie", () => {
  return {
    setCookie: (c: any, name: string, value: string) => {
      c._cookies = c._cookies || {};
      c._cookies[name] = value;
      return c;
    },
    getCookie: (c: any, name: string) => {
      return c._cookies?.[name] || null;
    },
  };
});

describe("CSRF Utilities", () => {
  let mockContext: any;

  beforeEach(() => {
    // Mock context
    mockContext = {
      _cookies: {}, // Store cookies here for testing
      req: {
        header: (name: string) => {
          if (name === "X-CSRF-Token")
            return mockContext._cookies["csrf-token"] || null;
          return null;
        },
      },
      get: (key: string) => {
        if (key === "formData") {
          const formData = new FormData();
          if (mockContext._cookies["csrf-token"]) {
            formData.append("_csrf", mockContext._cookies["csrf-token"]);
          }
          return formData;
        }
        if (key === "jsonBody") {
          return mockContext._cookies["csrf-token"]
            ? { _csrf: mockContext._cookies["csrf-token"] }
            : {};
        }
        return undefined;
      },
    };
  });

  it("should generate a CSRF token", () => {
    const token = generateCSRFToken();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(16);
  });

  it("should set a CSRF token in cookies", () => {
    const token = setCSRFToken(mockContext);
    expect(token).toBeDefined();
    expect(mockContext._cookies["csrf-token"]).toBe(token);
  });

  it("should get a CSRF token from header", () => {
    const token = "test-token-123";
    mockContext._cookies["csrf-token"] = token;

    const retrievedToken = getCSRFToken(mockContext);
    expect(retrievedToken).toBe(token);
  });

  it("should get a CSRF token from form data", () => {
    const token = "test-token-123";
    mockContext._cookies["csrf-token"] = token;

    // Clear header to force form data check
    const originalHeader = mockContext.req.header;
    mockContext.req.header = () => null;

    const retrievedToken = getCSRFToken(mockContext);

    // Restore original header function
    mockContext.req.header = originalHeader;

    expect(retrievedToken).toBe(token);
  });

  it("should get a CSRF token from JSON body", () => {
    const token = "test-token-123";
    mockContext._cookies["csrf-token"] = token;

    // Clear header and modify get to force JSON body check
    const originalHeader = mockContext.req.header;
    const originalGet = mockContext.get;

    mockContext.req.header = () => null;
    mockContext.get = (key: string) => {
      if (key === "jsonBody") {
        return { _csrf: token };
      }
      return undefined;
    };

    const retrievedToken = getCSRFToken(mockContext);

    // Restore original functions
    mockContext.req.header = originalHeader;
    mockContext.get = originalGet;

    expect(retrievedToken).toBe(token);
  });

  it("should validate matching CSRF tokens", () => {
    const token = "test-token-123";
    mockContext._cookies["csrf-token"] = token;
    mockContext.req.header = (name: string) => {
      if (name === "X-CSRF-Token") return token;
      return null;
    };

    const isValid = validateCSRFToken(mockContext);
    expect(isValid).toBe(true);
  });

  it("should reject non-matching CSRF tokens", () => {
    const token = "test-token-123";
    mockContext._cookies["csrf-token"] = token;
    mockContext.req.header = (name: string) => {
      if (name === "X-CSRF-Token") return "different-token";
      return null;
    };

    const isValid = validateCSRFToken(mockContext);
    expect(isValid).toBe(false);
  });

  it("should reject when cookie token is missing", () => {
    // Clear cookies
    mockContext._cookies = {};

    mockContext.req.header = (name: string) => {
      if (name === "X-CSRF-Token") return "some-token";
      return null;
    };

    const isValid = validateCSRFToken(mockContext);
    expect(isValid).toBe(false);
  });

  it("should reject when request token is missing", () => {
    const token = "test-token-123";
    mockContext._cookies["csrf-token"] = token;

    // Clear header and get to force token to be missing
    mockContext.req.header = () => null;
    const originalGet = mockContext.get;
    mockContext.get = () => undefined;

    const isValid = validateCSRFToken(mockContext);

    // Restore original get function
    mockContext.get = originalGet;

    expect(isValid).toBe(false);
  });
});
