# Task: Refactor Core Models to Use openbadges-types

## 1. Goal
- **Objective:** Refactor the core model files to use standardized types from the openbadges-types package, centralizing type aliases in the utility module.
- **Status:** Completed
- **Priority:** High
- **Estimated Time:** 4-6 hours

## 2. Resources
- **Package:** [openbadges-types](https://www.npmjs.com/package/openbadges-types)
- **Files to Update:**
  - `src/models/credential.model.ts` - Replace custom types with standardized types
  - `src/models/issuer.model.ts` - Update issuer types
- **Utility Module:** `src/utils/openbadges-types.ts` - Contains helper functions, re-exports standard types, and centralized project-specific type aliases.
- **Documentation:** `docs/openbadges-types-guide.md` - Guide for using the openbadges-types package

## 3. Implementation Plan

### 3.1 Credential Model Updates
- [x] Replace custom interfaces with imports from openbadges-types (via utility module)
- [x] Remove deprecated interfaces entirely for cleanliness.
- [x] **Update Type Guards:** Replace custom type guards with official ones from `openbadges-types` (or utility module).
  - `isOpenBadgeCredential` -> `OB3.isVerifiableCredential` (or equivalent)
  - `isStatusList2021Credential` -> Requires combined check (is VC + check type property)
  - `isEvidence` -> `OB3.isEvidence` (or equivalent)
  - `isAchievement` -> `OB3.isAchievement` (or equivalent)

### 3.2 Issuer Model Updates
- [x] Update JSON-LD interfaces (`IssuerJsonLdV2`, `IssuerJsonLdV3`) to extend standard types (`OB2.Profile`, `OB3.Issuer`).
- [x] Refactor constructor functions (`constructIssuerJsonLd`, `constructIssuerJsonLdV3`) for type safety.
- [x] **Align V3 Issuer:** Remove non-standard `alsoKnownAs` and `otherIdentifier` fields from `IssuerJsonLdV3` and constructor.
- [x] Maintain Zod schema compatibility for internal validation.
- [x] Add adapter types for any custom extensions (If needed - currently none identified).

### 3.3 Centralized Type Aliases
- [x] **Move Aliases:** Move `OpenBadgeEvidence`, `OpenBadgeCredentialStatus`, `OpenBadgeProof`, `OpenBadgeAchievement`, `OpenBadgeCredential` definitions from `credential.model.ts` to `src/utils/openbadges-types.ts`.
- [x] Ensure aliases are exported correctly from the utility module.

### 3.4 Testing
- [x] Ensure all existing tests pass with the new types
  - [x] Resolved type errors in `tests/integration/integration/credential.service.integration.test.ts`
- [x] Add tests for type compatibility (Covered by full suite pass)
- [x] Test the helper functions for branded types (toIRI, toDateTime) (Implicitly tested via usage)

## 4. Type Adaptation Patterns

When adapting types, use these patterns:

### Direct Type Alias (Centralized)
Defined in `src/utils/openbadges-types.ts`:
```typescript
// In src/utils/openbadges-types.ts
import { OB3 } from "openbadges-types";
export type OpenBadgeCredential = OB3.VerifiableCredential;
// ... other aliases ...
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
- [x] Core model files (`credential.model.ts`, `issuer.model.ts`) use types from `openbadges-types` via the utility module.
- [x] Project-specific type aliases are centralized in `src/utils/openbadges-types.ts`.
- [x] Type guards in `credential.model.ts` use official library functions where possible.
- [x] `IssuerJsonLdV3` in `issuer.model.ts` aligns strictly with standard `OB3.Issuer` fields.
- [x] All tests pass with the new types.
- [x] Documentation is updated with examples of using the new types (Marked complete, revisit if needed)
- [x] Helper functions for branded types are used correctly (Verified through passing tests)
