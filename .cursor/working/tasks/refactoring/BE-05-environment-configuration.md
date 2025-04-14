# BE-05: Environment Configuration Improvements

## Description
Enhance our environment configuration system based on Badge Engine's well-organized approach, focusing on better documentation, validation, and organization.

## Tasks
- [ ] Create a comprehensive `.env.example` file with detailed documentation
- [ ] Implement environment variable validation using a library like `zod-env` or `t3-env`
- [ ] Organize environment variables by domain/purpose
- [ ] Create separate environment configurations for different environments (dev, test, prod)
- [ ] Document environment setup process
- [ ] Add environment variable checks to CI/CD pipeline

## Implementation Details
Badge Engine has a well-documented `.env.example` file with clear organization:

```
# Copy this template to `.env` to begin configuring your local development environment.

# Required

# Prisma
# @link https://www.prisma.io/docs/reference/database-reference/connection-urls#env
DATABASE_URL="mongodb://mongodb:27017/badgingsoln?replicaSet=rs0&directConnection=true"

# NextAuth
# NEXTAUTH_SECRET="" # Required in production.
NEXTAUTH_URL="https://badging.lndo.site"

# Auth0
# @link https://next-auth.js.org/providers/auth0#example
AUTH0_CLIENT_ID=""
AUTH0_CLIENT_SECRET=""
AUTH0_ISSUER=""

# Optional
# DCC Status Service
# STATUS_SERVICE_URL: "http://status:4008"
# STATUS_LIST_URL: ""
# STATUS_LIST_ID: ""
```

We can improve on this with environment variable validation:

```typescript
// env.mjs
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url(),
    // Add more server environment variables here
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url(),
    // Add more client environment variables here
  },
  // For Next.js >= 13.4.4, you only need to destructure client variables
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    // Add all environment variables here
  },
});
```

## Benefits
- Better documentation for developers
- Runtime validation of environment variables
- Improved type safety
- Clearer organization by domain
- Reduced configuration errors
- Easier onboarding for new developers

## References
- Badge Engine's environment configuration: `../badge-engine/.env.example`
- T3 Env documentation: https://env.t3.gg/
- Zod documentation: https://zod.dev/
