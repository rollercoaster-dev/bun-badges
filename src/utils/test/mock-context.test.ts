import { describe, expect, it } from "bun:test";
import { createMockContext } from "./mock-context";

describe("createMockContext", () => {
  describe("query parameter handling", () => {
    it("should handle function-style query parameter access", () => {
      const mockContext = createMockContext({
        query: {
          page: "1",
          limit: "10",
          version: "2.0",
        },
      });

      // Function style access with parameter
      expect(mockContext.req.query("page")).toBe("1");
      expect(mockContext.req.query("limit")).toBe("10");
      expect(mockContext.req.query("version")).toBe("2.0");

      // Non-existent parameter
      expect(mockContext.req.query("nonexistent")).toBeUndefined();
    });

    it("should handle property-style query parameter access", () => {
      const mockContext = createMockContext({
        query: {
          page: "1",
          limit: "10",
          version: "2.0",
        },
      });

      // Property style access - use type assertions to avoid TypeScript errors
      // since TypeScript doesn't understand our dual-purpose function/object
      const query = mockContext.req.query as any;
      expect(query.page).toBe("1");
      expect(query.limit).toBe("10");
      expect(query.version).toBe("2.0");

      // Non-existent parameter
      expect(query.nonexistent).toBeUndefined();
    });

    it("should handle no-argument function call to return all query parameters", () => {
      const queryParams = {
        page: "1",
        limit: "10",
        version: "2.0",
      };

      const mockContext = createMockContext({
        query: queryParams,
      });

      // No argument function call
      const result = mockContext.req.query();
      expect(result).toEqual(queryParams);
    });
  });

  describe("other context functionality", () => {
    it("should handle route parameters", () => {
      const mockContext = createMockContext({
        params: {
          id: "test-id",
          action: "view",
        },
      });

      expect(mockContext.req.param("id")).toBe("test-id");
      expect(mockContext.req.param("action")).toBe("view");
      expect(mockContext.req.param("nonexistent")).toBeUndefined();
    });

    it("should handle JSON responses", async () => {
      const mockContext = createMockContext();

      const response = mockContext.json({ test: true }, 200);
      // Access the response properties that are available
      expect(response.status).toBe(200);
      // Use the json method to access the data
      const jsonData = await response.json();
      expect(jsonData).toEqual({ test: true });
    });
  });
});
