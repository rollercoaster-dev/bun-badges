// Type declarations for path aliases

declare module "@/*" {
  const content: any;
  export = content;
}

declare module "@routes/*" {
  const content: any;
  export = content;
}

declare module "@controllers/*" {
  const content: any;
  export = content;
}

declare module "@utils/*" {
  const content: any;
  export = content;
}

declare module "@models/*" {
  const content: any;
  export = content;
}

declare module "@services/*" {
  const content: any;
  export = content;
}

declare module "@middleware/*" {
  const content: any;
  export = content;
}

declare module "@tests/*" {
  const content: any;
  export = content;
}

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
