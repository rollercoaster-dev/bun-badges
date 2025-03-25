# JSONB Usage in drizzle-orm 0.41.0

This document provides information about using the `jsonb` type in drizzle-orm version 0.41.0, specifically addressing known issues and workarounds.

## Issue: JSONB Insertion

In drizzle-orm 0.41.0, there's a known issue related to handling JSONB data when using certain PostgreSQL drivers. When inserting data into jsonb columns:

1. The jsonb data may be inserted as a string instead of a proper JSON object
2. This can cause problems when retrieving or querying the data later
3. It primarily affects `postgres-js` driver, but similar issues may occur with `node-postgres` (pg)

This is related to [Issue #724](https://github.com/drizzle-team/drizzle-orm/issues/724) in the drizzle-orm repository.

## Workaround for Tests and Code

We've created utility functions in `src/utils/db-helpers.ts` to handle these issues correctly:

### 1. For inserting JSON data

```typescript
import { sql } from "drizzle-orm";
import { toJsonb } from "@/utils/db-helpers";

// Instead of:
db.insert(myTable).values({ jsonColumn: myObject });

// Use:
await db.execute(sql`
  INSERT INTO ${myTable} (json_column)
  VALUES (${toJsonb(myObject)})
  RETURNING *
`);

// Or with raw SQL:
await client.query(`
  INSERT INTO my_table (json_column)
  VALUES ($1::jsonb)`, 
  [JSON.stringify(myObject)]
);
```

### 2. For reading JSON data

When retrieving data, you may get either a string or an object depending on the driver:

```typescript
import { normalizeJsonb } from "@/utils/db-helpers";

// Use the helper to normalize the value
const result = await db.select().from(myTable);
const normalizedJson = normalizeJsonb(result[0].jsonColumn);
```

### 3. For comparing JSON values in tests

```typescript
import { compareJsonbValues } from "@/utils/db-helpers";

// In your test:
const actual = await db.select().from(myTable);
const expected = { foo: "bar" };

expect(compareJsonbValues(actual[0].jsonColumn, expected)).toBe(true);
```

## Integration Tests

When working with integration tests, the issue with jsonb becomes more apparent. Here are specific guidelines for integration tests:

### TypeScript Typing Issues

In integration tests, you may encounter TypeScript errors when working with the results of `testDb().execute()` calls. The solution is to properly type the results:

```typescript
// Execute a query with SQL template
const result = await testDb().execute(sql`
  SELECT * FROM ${myTable} WHERE id = ${id}
`);

// Fix TypeScript errors by casting the result
const typedResult = result as unknown as Array<any>;
expect(typedResult.length).toBe(1);
```

### Handling Query Results Consistently

A better approach is to create a helper function to handle query results consistently:

```typescript
/**
 * Helper function to get data from a testDb execute query
 * Handles the return type properly for PostgreSQL driver
 */
async function getQueryResult<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  const result = await testDb().execute(query);
  return (result.rows as T[]) || [];
}

// Then use it with proper typing:
interface User {
  id: string;
  name: string;
  email: string;
}

const users = await getQueryResult<User>(sql`SELECT * FROM users WHERE id = ${userId}`);
if (users.length > 0) {
  const user = users[0];
  // user is properly typed as User
  console.log(user.name);
}
```

### Creating Test Data with JSONB

When creating test data in your integration tests, always use the `toJsonb` helper:

```typescript
// Create test record with jsonb data
const testData = {
  name: "Test Object",
  properties: { key1: "value1", key2: 123 }
};

await testDb().execute(sql`
  INSERT INTO ${myTable} (name, properties_json)
  VALUES (${testData.name}, ${toJsonb(testData.properties)})
`);
```

### Verifying JSONB Data in Tests

When reading and verifying jsonb data in tests, use the `normalizeJsonb` helper to ensure consistency:

```typescript
// Get the record
const result = await getQueryResult<MyRecord>(sql`
  SELECT * FROM ${myTable} WHERE name = ${'Test Object'}
`);

// Use normalizeJsonb to handle potential string encoding
const properties = normalizeJsonb(result[0].properties_json);
expect(properties.key1).toBe("value1");
expect(properties.key2).toBe(123);
```

## Specific Issues Fixed

### signingKeys Table

The `signingKeys` table uses jsonb for the `keyInfo` field which stores public key information. We encountered a syntax error when trying to create OB3 assertions because:

1. The `generateSigningKey` function was inserting the `keyInfo` object directly without using the `toJsonb` helper
2. This caused a SQL syntax error when trying to query for the signing key later during credential creation

The fix:

```typescript
// Import the helper
import { toJsonb } from "@/utils/db-helpers";

// Modified the db.insert call in generateSigningKey:
await db.insert(signingKeys).values({
  issuerId,
  publicKeyMultibase: storedKeyPair.publicKeyMultibase,
  privateKeyMultibase: storedKeyPair.privateKeyMultibase,
  controller: storedKeyPair.controller,
  type: storedKeyPair.type,
  keyInfo: toJsonb(storedKeyPair.keyInfo), // Use toJsonb helper
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

### assertionJson in Controllers

The `assertionJson` field in the `badgeAssertions` table also needed the `toJsonb` helper:

```typescript
// In the AssertionController.createAssertion method:
await db.insert(badgeAssertions).values({
  assertionId,
  badgeId,
  issuerId: badge[0].issuerId,
  // ...other fields
  assertionJson: toJsonb({
    "@context": "https://w3id.org/openbadges/v2",
    // ...assertion data
  }),
});
```

## Performance Considerations

Using the `toJsonb` helper requires explicit SQL templates, which means you can't use the more concise insert/update APIs of drizzle-orm. However, the performance impact should be minimal in most applications.

If you're performing bulk operations, consider the following approaches:

1. For small to medium bulk inserts, use a transaction with multiple SQL statements
2. For very large bulk operations, consider using PostgreSQL's COPY command
3. For performance-critical code paths, benchmark both approaches

## Long-term Solution

1. Consider upgrading to a newer version of drizzle-orm once the issue is fixed
2. Alternatively, lock to a known working version for your specific use case
3. For production code, always use the utility functions to ensure consistent behavior

## Import Information

The `jsonb` type itself is properly exported from `drizzle-orm/pg-core` in version 0.41.0, but its handling during SQL generation is where the issue occurs.

```typescript
import { jsonb } from "drizzle-orm/pg-core";
// This import works fine
``` 