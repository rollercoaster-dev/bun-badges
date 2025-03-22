import { Context as HonoContext } from "hono";
import { StatusCode } from "hono/utils/http-status";

// Type definitions for the mock context
export type MockResponse = {
  status?: StatusCode;
  data?: any;
  body?: string | object;
  headers?: Record<string, string>;
  redirect?: string;
};

export type QueryParamValue = string | string[] | undefined;
export type QueryParams = Record<string, QueryParamValue>;

// Custom Proxy type to handle both property access and function call
export type QueryProxy = {
  [key: string]: QueryParamValue;
} & ((key: string) => QueryParamValue);

/**
 * Creates a mock Hono Context for testing
 *
 * This implementation supports both property access and function calls for query parameters:
 * - context.req.query.param (property access)
 * - context.req.query('param') (function call)
 *
 * It also properly implements all the commonly used Hono Context methods:
 * - context.json() - Returns JSON response
 * - context.html() - Returns HTML response
 * - context.redirect() - Returns redirect response
 * - context.status() - Sets status code
 * - context.req.param() - Access route params
 * - context.req.query - Access query params (both styles)
 * - context.req.json() - Parse JSON body
 * - context.req.parseBody() - Parse form body
 *
 * @param options Configuration options for the mock context
 * @returns A mock Hono Context that can be used in tests
 */
export function createMockContext({
  params = {},
  query = {},
  body = {},
  headers = {},
  url = "https://example.com",
  method = "GET",
  env = {
    JWT_SECRET: "test-secret",
    JWT_EXPIRY: "15m",
  },
}: {
  params?: Record<string, string>;
  query?: QueryParams;
  body?: any;
  headers?: Record<string, string>;
  url?: string;
  method?: string;
  env?: Record<string, any>;
} = {}): HonoContext {
  // Create a proxy for query that supports both function call and property access
  const queryProxy = new Proxy(query, {
    // Handle property access (e.g., query.page)
    get: (target, prop) => {
      if (typeof prop === "string") {
        return target[prop];
      }
      return undefined;
    },
    // Handle function calls (e.g., query('page'))
    apply: (target, _, args) => {
      if (args.length === 0) {
        return target;
      }
      const key = args[0];
      return target[key];
    },
  }) as QueryProxy;

  // Create mock context object
  const context = {
    req: {
      param: (name: string) => params[name],
      query: queryProxy,
      body,
      headers,
      url,
      method,
      json: async () => {
        return typeof body === "string" ? JSON.parse(body) : body;
      },
      parseBody: () => Promise.resolve(body),
      header: (name: string) => headers[name] || headers[name.toLowerCase()],
      path: url.split("?")[0],
    },
    // Helper for creating correct JSON response format
    json: (data: any, status: StatusCode = 200) => ({
      status,
      data,
      headers: { "Content-Type": "application/json" },
    }),
    // Helper for creating correct HTML response format
    html: (content: string, status: StatusCode = 200) => ({
      status,
      body: content,
      headers: { "Content-Type": "text/html" },
    }),
    // Helper for setting status and returning chained response object
    status: (code: StatusCode) => ({
      status: code,
      json: (data: any) => ({
        status: code,
        data,
        headers: { "Content-Type": "application/json" },
      }),
      html: (content: string) => ({
        status: code,
        body: content,
        headers: { "Content-Type": "text/html" },
      }),
      redirect: (url: string) => ({
        status: code,
        redirect: url,
        headers: { Location: url },
      }),
    }),
    // Helper for creating redirect response
    redirect: (url: string, status: StatusCode = 302) => ({
      status,
      redirect: url,
      headers: { Location: url },
    }),
    // Environment variables access
    env,
    // Additional helper for text responses
    text: (content: string, status: StatusCode = 200) => ({
      status,
      body: content,
      headers: { "Content-Type": "text/plain" },
    }),
    // Set response header helper
    header: (name: string, value: string) => {
      const headers = { [name]: value };
      return { headers };
    },
    // Mock for render functionality
    render: (view: string, params: Record<string, any> = {}) => ({
      status: 200,
      body: `Rendered ${view} with params: ${JSON.stringify(params)}`,
      headers: { "Content-Type": "text/html" },
    }),
  };

  return context as unknown as HonoContext;
}

/**
 * Type guard to check if a response is a MockResponse
 */
export function isMockResponse(response: any): response is MockResponse {
  return (
    response !== null &&
    typeof response === "object" &&
    (typeof response.status === "number" ||
      response.data !== undefined ||
      response.body !== undefined ||
      response.redirect !== undefined)
  );
}
