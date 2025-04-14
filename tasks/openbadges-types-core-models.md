# Task: Refactor Core Models to Use openbadges-types

## 1. Goal
- **Objective:** Refactor the core model files to use standardized types from the openbadges-types package
- **Status:** 🟡 Not Started
- **Priority:** High
- **Estimated Time:** 4-6 hours

## 2. Resources
- **Package:** [openbadges-types](https://www.npmjs.com/package/openbadges-types)
- **Files to Update:**
  - `src/models/credential.model.ts` - Replace custom types with standardized types
  - `src/models/issuer.model.ts` - Update issuer types

## 3. Implementation Plan

### 3.1 Credential Model Updates
- [ ] Create type aliases for backward compatibility
  ```typescript
  // Example:
  export type OpenBadgeCredential = OB3.VerifiableCredential;
  ```
- [ ] Replace custom interfaces with imports from openbadges-types
- [ ] Add JSDoc comments with @deprecated tags for custom types
- [ ] Update type guards to use the standard ones where possible

### 3.2 Issuer Model Updates
- [ ] Update issuer interfaces to use OB2.Profile and OB3.Issuer
- [ ] Maintain Zod schema compatibility
- [ ] Add adapter types for any custom extensions

### 3.3 Testing
- [ ] Ensure all existing tests pass with the new types
- [ ] Add tests for type compatibility

## 4. Type Adaptation Patterns

When adapting types, use these patterns:

### Direct Type Alias
For types that match the standard exactly:
```typescript
export type OpenBadgeCredential = OB3.VerifiableCredential;
```

### Type Extension
For types that need additional properties:
```typescript
export interface CustomIssuer extends OB3.Issuer {
  customProperty: string;
}
```

### Type Adaptation with Omit
For types that need to override properties:
```typescript
export type CustomCredential = Omit<OB3.VerifiableCredential, 'issuer'> & {
  issuer: string | CustomIssuer;
};
```

## 5. Acceptance Criteria
- [ ] All core model files use openbadges-types where appropriate
- [ ] Backward compatibility is maintained
- [ ] All tests pass
- [ ] Documentation is updated
