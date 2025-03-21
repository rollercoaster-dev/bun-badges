import { router } from "./trpc";
import { badgesRouter } from "./routers/badges";

/**
 * Main tRPC router that combines all sub-routers
 */
export const appRouter = router({
  badges: badgesRouter,
  // Add more routers as needed
});

// Export type definition of our API
export type AppRouter = typeof appRouter;
