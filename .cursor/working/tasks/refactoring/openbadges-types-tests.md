# Task: Refactor Test Suite to Use openbadges-types

## 1. Goal
- **Objective:** Update test fixtures and assertions to use standardized types from openbadges-types
- **Status:** 🟡 Not Started
- **Priority:** Low
- **Estimated Time:** 5-6 hours
- **Dependencies:** Requires completion of other refactoring tasks

## 2. Resources
- **Package:** [openbadges-types](https://www.npmjs.com/package/openbadges-types)
- **Files to Update:**
  - `tests/unit/*.test.ts`
  - `tests/integration/*.test.ts`
  - `tests/e2e/*.test.ts`
  - Test fixtures and helpers

## 3. Implementation Plan

### 3.1 Test Fixture Updates
- [ ] Update test fixtures to use standardized types
- [ ] Use helper functions for branded types
- [ ] Create factory functions for test objects

### 3.2 Test Assertion Updates
- [ ] Update assertions to work with new types
- [ ] Use type guards from openbadges-types

### 3.3 Test Helper Updates
- [ ] Update test helpers to use standardized types
- [ ] Create helper functions for common test patterns

## 4. Type Adaptation Patterns

### Test Fixture Factory
```typescript
// Create a factory function for test credentials
function createTestCredential(overrides?: Partial<OB3.VerifiableCredential>): OB3.VerifiableCredential {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: toIRI('https://example.org/credentials/123'),
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: toIRI('https://example.org/issuers/1'),
    issuanceDate: toDateTime('2023-01-01T00:00:00Z'),
    credentialSubject: {
      id: toIRI('did:example:123'),
      achievement: {
        type: ['Achievement'],
        name: 'Test Achievement',
        description: 'This is a test achievement'
      }
    },
    ...overrides
  };
}
```

### Test Assertions
```typescript
// Before
expect(credential.id).toBe('https://example.org/credentials/123');

// After
expect(String(credential.id)).toBe('https://example.org/credentials/123');
```

## 5. Acceptance Criteria
- [ ] All test fixtures use standardized types
- [ ] Helper functions are used for branded types
- [ ] All tests pass
- [ ] No type errors in the test suite
