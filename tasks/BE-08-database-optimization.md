# BE-08: Database Optimization

## Description
Improve our database setup and performance based on lessons from Badge Engine, focusing on connection pooling, migrations, and query optimization.

## Tasks
- [ ] Implement proper database connection pooling
- [ ] Optimize Prisma query performance
- [ ] Create comprehensive database migration strategy
- [ ] Implement database seeding for development
- [ ] Add database health checks
- [ ] Configure database backups
- [ ] Document database schema and relationships
- [ ] Implement proper indexes for performance

## Implementation Details
Badge Engine has a basic database setup, but we can improve with more advanced configurations:

### Connection Pooling
```typescript
// db.ts
import { PrismaClient } from "@prisma/client";
import { env } from "~/env.mjs";

const createPrismaClient = () =>
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // Add connection pooling configuration
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    // Add query performance metrics
    __internal: {
      measurePerformance: env.NODE_ENV === "development",
    },
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Database Seeding
```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN",
    },
  });

  // Create sample badges
  const badge1 = await prisma.badge.create({
    data: {
      name: "Achievement Badge",
      description: "Awarded for completing the course",
      criteria: "Complete all modules with at least 80% score",
      issuerId: "issuer-123",
    },
  });

  console.log({ user1, badge1 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Benefits
- Improved database performance
- Better reliability
- Easier development with seeded data
- More robust error handling
- Better monitoring capabilities
- Simplified deployment with migrations
- Improved security

## References
- Badge Engine's database setup: `../badge-engine/src/server/db/prismaConnect.ts`
- Prisma documentation: https://www.prisma.io/docs/
- Database connection pooling: https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-pool
- Prisma migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate
