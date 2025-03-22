// Type declarations for path aliases

declare module "@/utils/test/db-helpers" {
  export function seedTestData(): Promise<any>;
  export function clearTestData(): Promise<void>;
}

declare module "@/routes/assertions.routes" {
  import { Hono } from "hono";
  const router: Hono;
  export default router;
}

declare module "@/routes/verification.routes" {
  import { Hono } from "hono";
  const router: Hono;
  export default router;
}

// Add other path aliases as needed
