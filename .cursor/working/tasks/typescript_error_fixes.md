# TypeScript Error Fixes for Test Files

This guide outlines the approach to fixing the TypeScript errors in the test files, particularly focusing on the unused variable warnings that are preventing successful Git commits.

## Error Pattern

Most of the TypeScript errors follow this pattern:
```
src/utils/test/crypto-setup.ts(17,20): error TS6133: 'data' is declared but its value is never read.
```

These are TS6133 errors indicating that variables are declared but never used. In many cases, these are function parameters in mock implementations that must match the expected signature but aren't actually used within the function body.

## Solution Approaches

### 1. Use Underscores for Unused Parameters

The simplest approach is to prefix unused parameters with an underscore:

```typescript
// BEFORE
function someFunction(data: Uint8Array) {
  // Parameter 'data' is not used
  return fixedValue;
}

// AFTER
function someFunction(_data: Uint8Array) {
  // Underscore prefix indicates intentionally unused parameter
  return fixedValue;
}
```

### 2. Use TypeScript Ignore Comments

For cases where the parameter structure needs to match an interface exactly:

```typescript
// BEFORE
verify: async (
  signature: Uint8Array, 
  message: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> => {
  // Parameters 'signature' and 'message' are not used
  return (
    publicKey.length === TEST_KEYS.publicKey.length &&
    publicKey[0] === TEST_KEYS.publicKey[0]
  );
}

// AFTER
verify: async (
  // @ts-ignore
  signature: Uint8Array, 
  // @ts-ignore
  message: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> => {
  return (
    publicKey.length === TEST_KEYS.publicKey.length &&
    publicKey[0] === TEST_KEYS.publicKey[0]
  );
}
```

### 3. Use TypeScript Configuration

For a more systemic solution, modify the `tsconfig.json` to ignore this specific error in test files:

```json
{
  "compilerOptions": {
    // ...existing options
    "noUnusedParameters": false
  }
}
```

Or more specifically for test files only:

```json
{
  "compilerOptions": {
    // ...existing options
  },
  "include": ["src/**/*"],
  "files": ["src/index.ts"],
  "exclude": ["node_modules"],
  "ts-node": {
    "compilerOptions": {
      "noUnusedParameters": false
    }
  }
}
```

## Implementation Plan

1. **Initial Scan**: Review all TypeScript error messages to identify patterns
2. **Quick Fixes**: Apply the underscore prefix to clearly unused parameters
3. **Selective Ignores**: Use `// @ts-ignore` for mock implementations where parameter structure must match interfaces exactly
4. **Configuration Changes**: If there are too many instances, consider a configuration-based solution as a last resort

## Examples from Codebase

Let's look at specific examples from the codebase and apply fixes:

### Example 1: Crypto Setup Mocks

```typescript
// File: src/utils/test/crypto-setup.ts
// BEFORE
sha512Sync: (data: Uint8Array) => {
  // Return a consistent hash for testing
  const hash = new Uint8Array(64);
  hash.fill(9);
  return hash;
},

// AFTER
sha512Sync: (_data: Uint8Array) => {
  // Return a consistent hash for testing
  const hash = new Uint8Array(64);
  hash.fill(9);
  return hash;
},
```

### Example 2: Base64 Encoding/Decoding Mocks

```typescript
// File: src/utils/test/setup.ts
// BEFORE
base64url: {
  decode: (str: string): Uint8Array => {
    // Return test signature for any base64 input
    return TEST_KEYS.signature.slice();
  },
  encode: (bytes: Uint8Array): string => {
    // Return consistent base64 string
    return "TEST_BASE64_SIGNATURE";
  },
},

// AFTER
base64url: {
  decode: (_str: string): Uint8Array => {
    // Return test signature for any base64 input
    return TEST_KEYS.signature.slice();
  },
  encode: (_bytes: Uint8Array): string => {
    // Return consistent base64 string
    return "TEST_BASE64_SIGNATURE";
  },
},
```

### Example 3: Handler Function

```typescript
// BEFORE
const handler = {
  get: (target: object, prop: string | symbol) => {
    // target is not used
    if (prop === "array") {
      return () => new Proxy({}, handler);
    }
    return () => new Proxy({}, handler);
  },
};

// AFTER
const handler = {
  get: (_target: object, prop: string | symbol) => {
    if (prop === "array") {
      return () => new Proxy({}, handler);
    }
    return () => new Proxy({}, handler);
  },
};
```

## Automated Fix Script

For a larger codebase with many instances of this error, a simple script could automate the prefix addition:

```javascript
// fixUnusedParams.js
const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Regex to find parameter declarations that are flagged as unused
  // This is a simplified example - a real implementation would need to be more sophisticated
  const unusedParamRegex = /(\w+)(\s*:\s*[^,\)]+)/g;
  
  content = content.replace(unusedParamRegex, (match, paramName) => {
    // Check if this param is used elsewhere in the function body
    // For simplicity, this example assumes any param is unused
    // A real implementation would need more analysis
    return `_${paramName}${match.slice(paramName.length)}`;
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Processed: ${filePath}`);
}

// Run against specific files or directories
const targetFiles = [
  'src/utils/test/crypto-setup.ts',
  'src/utils/test/integration-setup.ts',
  'src/utils/test/setup.ts',
  'src/utils/test/unit-setup.ts'
];

targetFiles.forEach(file => processFile(path.resolve(process.cwd(), file)));
```

## Next Steps

1. Start with the test utility files that have the most errors
2. Apply the underscore prefix approach consistently
3. Run `tsc --noEmit` after each file update to verify error count reduction
4. Commit changes gradually to prevent merge conflicts