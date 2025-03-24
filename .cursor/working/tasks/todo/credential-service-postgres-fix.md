# Task: Fix PostgreSQL Syntax Errors in Credential Service Tests

## Issue Summary
In the credential service integration tests, we're encountering PostgreSQL syntax errors during test execution:

```
error: syntax error at or near "="
     length: 91,
   severity: "ERROR",
     detail: undefined,
       hint: undefined,
   position: "205",
 internalPosition: undefined,
 internalQuery: undefined,
```

This is affecting two specific test cases:
1. "should create a verifiable credential"
2. "should ensure issuer key exists"

## Priority Direction
Our priority is to ensure the real credential service is functioning correctly in production environments, then fix the tests to properly verify this functionality. The test is only there to prove the app is working - it should validate real service functionality, not use workarounds that bypass the actual implementation.

## Root Cause Analysis

### Error Details
- The error occurs in the PostgreSQL protocol library at `/Users/joeczarnecki/Code/rollercoaster.dev/bun-badges/node_modules/pg-protocol/dist/messages.js:45:11`
- Error position: 205 (near an "=" character)
- Error code: 42601 (SQL syntax error)
- Despite upgrading Drizzle ORM from v0.29.5 to v0.30.7, the error persists

### Updated Findings
After adding debug logging, we've determined:

1. **Protocol-Level Error**: 
   - The error is happening in the pg-protocol library, not directly in our code
   - This suggests an issue with how queries are being formatted or encoded

2. **Persistent Across Versions**:
   - Upgrading to the latest version of Drizzle ORM did not resolve the issue
   - This indicates it may be a deeper compatibility issue between pg and Drizzle ORM

3. **No SQL Visibility**:
   - The debug output doesn't show the actual SQL query causing the problem
   - This points to an issue in how the query is constructed or transmitted

4. **Test Environment Specific**:
   - The error only occurs in the integration test environment
   - In production or regular use, these same operations may work correctly

## Investigation Steps

### 1. Validate Production Functionality First
- Create a simple script that exercises the credential service in a production-like environment
- Verify that `createCredential()` and `ensureIssuerKeyExists()` work correctly in normal usage
- This ensures we focus on fixing the test without breaking actual functionality

### 2. Diagnose Test Environment Differences
- Compare PostgreSQL versions between test and production environments
- Examine connection configuration differences
- Check for test-specific DB setup that might affect query handling

### 3. Fix the Test Environment
- Instead of adapting our code to work around test issues, fix the test environment
- Ensure the test DB is configured identically to production
- If needed, update PostgreSQL client libraries to versions compatible with both environments

### 4. Enhance Debugging for SQL Queries
- Add detailed SQL logging in both test and production environments
- Compare the actual queries being sent in each case
- Use the PostgreSQL logs to capture the full queries and parameters

## Potential Solutions

### 1. Align Test and Production Environments
- Ensure PostgreSQL versions match
- Use identical configuration parameters
- Configure identical schema definitions and constraints

### 2. Update Database Client Libraries
- Try updating or downgrading the PostgreSQL client libraries (pg, pg-native)
- Test with postgres-js instead of node-postgres if compatibility issues persist
- Find the specific version combination that works in both environments

### 3. Fix Query Generation in Drizzle ORM
- Identify exactly which query pattern is failing
- Modify how we're using Drizzle ORM to avoid the problematic pattern
- Consider contributing a fix back to Drizzle ORM if it's a general issue

### 4. Database Configuration Tuning
- Adjust PostgreSQL configuration parameters that might affect query parsing
- Check for any test-specific PostgreSQL extensions or settings

## Next Steps

1. **Create a Validation Script**:
   - Build a simple standalone script to validate credential service operations
   - Test in both development and test environments
   - Confirm functionality works in normal usage

2. **Analyze Environment Differences**:
   - Document all differences between test and production PostgreSQL setups
   - Check schema creation scripts for subtle differences
   - Review connection parameters and pooling settings

3. **Capture Complete SQL Queries**:
   - Enable verbose PostgreSQL logging to capture full query details
   - Compare queries between environments that succeed vs fail
   - Identify the exact syntax causing the issue

4. **Fix Test Environment**:
   - Make targeted changes to the test setup based on findings
   - Focus on making the test environment match production
   - Avoid test-specific code paths in the service implementation

## References
- Test file: `tests/integration/integration/credential.service.integration.test.ts`
- Implementation: `src/services/credential.service.ts`
- Drizzle ORM version: 0.30.7 (upgraded from 0.29.5)
- Error location: `node_modules/pg-protocol/dist/messages.js:45:11`
- PostgreSQL error code: 42601 (syntax error)
- Error position: 205 (near an "=" character) 