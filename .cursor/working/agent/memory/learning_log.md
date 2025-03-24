# Learning Log

## Project Insights
- *Date*: [Record date]
  - *Context*: [Brief context of work]
  - *Learning*: [Specific insight or pattern discovered]
  - *Applied to*: [Reference to task or component]
  
## Code Patterns
- *Date*: [Record date]
  - *Pattern*: [Description of code pattern]
  - *Context*: [Where it was encountered]
  - *Benefits*: [Why this pattern is useful]
  - *Examples*: [Reference to implementation examples]
  
## Technical Discoveries
- *Date*: [Record date]
  - *Discovery*: [Technical insight]
  - *Impact*: [How this affects the project]
  - *Follow-up*: [Any actions needed based on this]
  
## Developer Preferences
- *Date*: [Record date]
  - *Context*: [Work scenario]
  - *Observed Preference*: [What worked well]
  - *Applied to*: [How it was implemented]

## 2024-03-23: TypeScript Errors with Database Testing

### Problem
Found TypeScript errors in the integration tests where `testDb` was being used incorrectly. The errors were:
```
Property 'select' does not exist on type '() => NodePgDatabase<Record<string, unknown>> & { $client: NodePgClient; }'
```

### Root Cause
In `src/utils/test/integration-setup.ts`, `testDb` is exported as a function that returns a database object, but it was being used directly as if it were the database object in `tests/integration/credential.integration.test.ts`.

### Solution
Fixed by adding parentheses to call the `testDb()` function before accessing database methods:
```typescript
// Changed from:
const issuers = await testDb.select()...

// To:
const issuers = await testDb().select()...
```

### Related Knowledge
- The project uses Drizzle ORM for database operations
- `testDb` is intended to be used as a function to get a fresh database connection
- There may be other similar issues in other test files or documentation
- This follows a common pattern where database connections are wrapped in functions to control their lifecycle

### Related Tasks
- Found similar issues in `TESTING.md` documentation examples
- Related to `mock-context-fix.md` and `drizzle_orm_upgrade.task.md` tasks 
