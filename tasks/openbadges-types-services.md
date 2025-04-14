# Task: Refactor Services to Use openbadges-types

## 1. Goal
- **Objective:** Update service layer to use standardized types from openbadges-types
- **Status:** 🟡 Not Started
- **Priority:** Medium
- **Estimated Time:** 6-8 hours
- **Dependencies:** Requires completion of core model refactoring

## 2. Resources
- **Package:** [openbadges-types](https://www.npmjs.com/package/openbadges-types)
- **Files to Update:**
  - `src/services/credential.service.ts`
  - `src/services/verification.service.ts`
  - `src/services/credential-verification.service.ts`
  - `src/services/credential-signing.service.ts`

## 3. Implementation Plan

### 3.1 Credential Service Updates
- [ ] Update method signatures to use standardized types
- [ ] Replace custom type references with imports from openbadges-types
- [ ] Use helper functions for branded types (IRI, DateTime)
- [ ] Update credential creation to use proper types

### 3.2 Verification Service Updates
- [ ] Update verification methods to use standardized types
- [ ] Replace custom type guards with standard ones
- [ ] Update verification result interfaces

### 3.3 Signing Service Updates
- [ ] Update signing methods to use standardized types
- [ ] Ensure proper handling of proof types

### 3.4 Testing
- [ ] Update service tests to work with new types
- [ ] Add tests for edge cases with branded types

## 4. Common Challenges and Solutions

### Branded Types
When working with methods that create URLs or dates:
```typescript
// Before
const id = `${hostUrl}/badges/${badgeId}`;

// After
const id = toIRI(`${hostUrl}/badges/${badgeId}`);
```

### Achievement Arrays
When working with achievements that might be arrays:
```typescript
// Before
const name = credential.credentialSubject.achievement.name;

// After
const name = isSingleAchievement(credential.credentialSubject.achievement)
  ? credential.credentialSubject.achievement.name
  : credential.credentialSubject.achievement[0]?.name;
```

## 5. Acceptance Criteria
- [ ] All service methods use standardized types
- [ ] Helper functions are used for branded types
- [ ] All tests pass
- [ ] No type errors in the service layer
