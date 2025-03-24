# Known Issues

## PostgreSQL + drizzle-orm 0.29.5 SQL Syntax Issues

### Problem

In drizzle-orm 0.29.5, there are specific issues with SQL syntax in PostgreSQL queries, particularly when working with:

1. Complex parameter binding in prepared statements
2. JSONB columns and data 
3. IN clauses with array parameters
4. Complex WHERE conditions

These issues often manifest as SQL syntax errors like:
```
error: syntax error at or near "="
```

The issue is particularly prevalent in test environments where parameterized queries may be processed differently than in production environments.

### Root Cause

The core issue relates to how drizzle-orm formats SQL queries with parameter placeholders, especially for JSONB columns. In PostgreSQL, JSONB operations require specific syntax for operations like containment (`@>`) or path access (`->`, `->>`) which can conflict with parameter binding in prepared statements.

### Solutions

#### 1. Direct Parameter Binding

Instead of using the query builder for complex operations with JSONB data, use direct parameterized queries:

```typescript
// Instead of this:
const result = await db
  .select()
  .from(table)
  .where(eq(table.jsonbColumn, someValue))

// Use this:
const query = `
  SELECT * FROM table 
  WHERE jsonb_column = $1::jsonb
`;
const result = await pool.query(query, [JSON.stringify(someValue)]);
```

#### 2. Use Explicit SQL Templates

For queries that must use the ORM, explicitly format the SQL with proper casting:

```typescript
import { sql } from 'drizzle-orm';

const result = await db
  .select()
  .from(table)
  .where(sql`jsonb_column = ${sql.jsonb(someValue)}`)
```

#### 3. Proper Array Parameter Handling

For IN clauses with arrays, ensure the array is properly formatted:

```typescript
// Instead of:
.where(inArray(field, values))

// Use:
.where(sql`field IN (${sql.join(values)})`)
```

#### 4. Type Casting in Parameters

Always add explicit type casting for JSONB parameters:

```typescript
// Explicit casting in raw SQL
const jsonStr = JSON.stringify(jsonObject);
const query = `INSERT INTO table (jsonb_column) VALUES ($1::jsonb)`;
await pool.query(query, [jsonStr]);
```

### Testing Considerations

In test environments:

1. Use the `::jsonb` PostgreSQL type cast explicitly when inserting or comparing JSONB data
2. Consider using utility functions (see `test-sql-helpers.ts`) for consistent parameter handling
3. In some cases, use raw SQL queries for test setup to avoid ORM-related formatting issues

### References

- [PostgreSQL JSON Types Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [drizzle-orm GitHub Issues - inArray syntax error](https://github.com/drizzle-team/drizzle-orm/issues/1415)
- [PostgreSQL Prepared Statements](https://www.postgresql.org/docs/current/sql-prepare.html) 