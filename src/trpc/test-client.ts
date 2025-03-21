import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "./index";

console.log("Setting up tRPC test client...");

// Create a test client
const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/trpc",
      headers: {
        // Add auth header for protected routes if needed
        // Authorization: 'Bearer YOUR_TEST_TOKEN_HERE',
      },
    }),
  ],
});

console.log("tRPC client ready. Use it to test your procedures.");
console.log("Example:");
console.log("client.badges.getPublicBadges.query()");
console.log('client.badges.getBadge.query({ id: "some-uuid" })');
