# Utilities

This directory contains utility functions that are used throughout the application. Utilities are small, reusable functions that provide common functionality and help reduce code duplication.

## When to Create a Utility Function

Consider creating a utility function when:

1. **The same logic is repeated in multiple places** - If you find yourself writing the same code in multiple components or services, it's a good candidate for a utility function.

2. **The logic is complex but self-contained** - If a piece of logic is complex but doesn't depend on the specific context where it's used, it can be extracted into a utility.

3. **The functionality is generic** - If the functionality is not specific to a particular domain or feature, it's likely a good utility candidate.

4. **The code improves readability when extracted** - Sometimes extracting code into a well-named utility function makes the calling code more readable and self-documenting.

## Where to Put Utility Functions

1. **Domain-specific vs. Generic**:
   - Generic utilities that could be used in any application should go in this `utils` directory.
   - Domain-specific utilities that only make sense in the context of a specific feature should go in a `utils` subdirectory within that feature's directory.

2. **Categorization**:
   - Group related utilities in the same file (e.g., `error-handling.ts`, `crypto.ts`, `jwt.ts`).
   - If a utility file grows too large (>300 lines), consider splitting it into more specific files.

3. **Naming Conventions**:
   - Use clear, descriptive names for utility files and functions.
   - Prefer verb phrases for function names (e.g., `formatDate`, `validateEmail`).
   - Use noun phrases for utility files (e.g., `date-utils.ts`, `validation-utils.ts`).

## Existing Utility Functions

### Logger (`logger.ts`)

A centralized logging utility built on top of Pino.

- `logger.info()` - Log informational messages
- `logger.error()` - Log error messages
- `logger.warn()` - Log warning messages
- `logger.debug()` - Log debug messages

### Error Handling (`error-handling.ts`)

Utilities for standardized error handling across the application.

- `executeWithErrorHandling()` - Execute an async operation with standardized error handling
- `unwrapResult()` - Unwrap the result of an async operation, throwing an error if it failed

### JWT Utilities (`jwt.ts`)

Utilities for working with JWTs (JSON Web Tokens).

- `encodeBase64Url()` - Encode an object as a base64url string
- `decodeBase64Url()` - Decode a base64url string to an object
- `splitJwt()` - Split a JWT into its parts (header, payload, signature)
- `createJwt()` - Create a JWT from a header, payload, and signature
- `getCurrentTimestamp()` - Get the current timestamp in seconds

### Crypto Utilities (`crypto.ts`)

Utilities for cryptographic operations.

- `getSigningAlgorithm()` - Get the appropriate signing algorithm for a key algorithm
- `getJwtAlgorithm()` - Get the appropriate JWT algorithm name for a key algorithm
- `signData()` - Sign data with a private key
- `verifySignature()` - Verify a signature

## Best Practices for Utility Functions

1. **Keep them pure** - Utility functions should be pure functions whenever possible, meaning they don't have side effects and always return the same output for the same input.

2. **Keep them focused** - Each utility function should do one thing and do it well.

3. **Document them well** - Use JSDoc comments to document parameters, return values, and behavior.

4. **Test them thoroughly** - Utility functions are often critical infrastructure used throughout the application, so they should have comprehensive tests.

5. **Handle errors gracefully** - Utility functions should handle edge cases and provide meaningful error messages.

6. **Consider performance** - Since utility functions may be called frequently, be mindful of their performance characteristics.

7. **Use TypeScript** - Leverage TypeScript to provide strong typing for parameters and return values.
