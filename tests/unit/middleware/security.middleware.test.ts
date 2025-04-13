import { describe, expect, it, mock, beforeEach } from "bun:test";
import { createSecurityMiddleware } from "@middleware/security.middleware";
// Removed unused import: import { Hono } from "hono";

describe("Security Middleware", () => {
  // Removed unused variable: app
  let mockContext: any;
  let mockNext: any;

  beforeEach(() => {
    // Mock context
    mockContext = {
      req: {
        method: "GET",
        header: () => null,
      },
      res: {
        headers: new Map(),
      },
    };

    // Mock next function
    mockNext = mock(() => Promise.resolve());
  });

  it("should add Content Security Policy headers", async () => {
    const middleware = createSecurityMiddleware({
      enableCSP: true,
      cspReportOnly: false,
    });

    await middleware(mockContext, mockNext);

    expect(mockContext.res.headers.has("Content-Security-Policy")).toBe(true);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should add CSP in report-only mode when configured", async () => {
    const middleware = createSecurityMiddleware({
      enableCSP: true,
      cspReportOnly: true,
    });

    await middleware(mockContext, mockNext);

    expect(
      mockContext.res.headers.has("Content-Security-Policy-Report-Only"),
    ).toBe(true);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should add XSS Protection headers when enabled", async () => {
    const middleware = createSecurityMiddleware({
      enableXSSProtection: true,
    });

    await middleware(mockContext, mockNext);

    expect(mockContext.res.headers.has("X-XSS-Protection")).toBe(true);
    expect(mockContext.res.headers.get("X-XSS-Protection")).toBe(
      "1; mode=block",
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it("should add additional security headers", async () => {
    const middleware = createSecurityMiddleware();

    await middleware(mockContext, mockNext);

    expect(mockContext.res.headers.has("X-Content-Type-Options")).toBe(true);
    expect(mockContext.res.headers.has("Referrer-Policy")).toBe(true);
    expect(mockContext.res.headers.has("Permissions-Policy")).toBe(true);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    const middleware = createSecurityMiddleware();
    const errorNext = mock(() => Promise.reject(new Error("Test error")));

    try {
      await middleware(mockContext, errorNext);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      expect(errorNext).toHaveBeenCalled();
    }
  });
});
