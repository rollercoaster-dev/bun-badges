# Task: Refactor Utility Functions to Use openbadges-types

## 1. Goal
- **Objective:** Update utility functions to use standardized types from openbadges-types
- **Status:** 🟡 Not Started
- **Priority:** Medium
- **Estimated Time:** 4-5 hours
- **Dependencies:** Requires completion of core model refactoring

## 2. Resources
- **Package:** [openbadges-types](https://www.npmjs.com/package/openbadges-types)
- **Files to Update:**
  - `src/utils/badge-baker.ts`
  - `src/utils/schema-validation.ts`
  - `src/utils/signing/*.ts`

## 3. Implementation Plan

### 3.1 Badge Baker Updates
- [ ] Update BadgeAssertion type to use standardized types
- [ ] Update extraction and baking functions to use proper types
- [ ] Use type guards from openbadges-types

### 3.2 Schema Validation Updates
- [ ] Update validation functions to use standardized types
- [ ] Ensure schema URLs are properly typed as IRIs

### 3.3 Signing Utilities Updates
- [ ] Update signing functions to use standardized types
- [ ] Ensure proper handling of proof types
- [ ] Use helper functions for branded types

### 3.4 Testing
- [ ] Update utility tests to work with new types
- [ ] Add tests for edge cases with branded types

## 4. Type Adaptation Patterns

### Badge Baker Type Updates
```typescript
// Before
export type BadgeAssertion = OpenBadgeCredential | Record<string, unknown>;

// After
export type BadgeAssertion = OB3.VerifiableCredential | OB2.Assertion | Record<string, unknown>;
```

### Schema Validation Updates
```typescript
// Before
export async function validateOB3Credential(
  credential: OpenBadgeCredential
): Promise<ValidationResult> {
  // ...
}

// After
export async function validateOB3Credential(
  credential: OB3.VerifiableCredential
): Promise<ValidationResult> {
  // ...
}
```

## 5. Acceptance Criteria
- [ ] All utility functions use standardized types
- [ ] Helper functions are used for branded types
- [ ] All tests pass
- [ ] No type errors in the utility layer
