# Task: Refactor Controllers and Routes to Use openbadges-types

## 1. Goal
- **Objective:** Update controllers and routes to use standardized types from openbadges-types
- **Status:** 🟡 Not Started
- **Priority:** Low
- **Estimated Time:** 4-5 hours
- **Dependencies:** Requires completion of service layer refactoring

## 2. Resources
- **Package:** [openbadges-types](https://www.npmjs.com/package/openbadges-types)
- **Files to Update:**
  - `src/controllers/*.ts`
  - `src/routes/*.ts`

## 3. Implementation Plan

### 3.1 Controller Updates
- [ ] Update request and response types to use standardized types
- [ ] Use helper functions for branded types
- [ ] Update validation logic to work with new types

### 3.2 Route Updates
- [ ] Update route handlers to use standardized types
- [ ] Update request body validation

### 3.3 Testing
- [ ] Update controller tests to work with new types
- [ ] Add tests for edge cases with branded types

## 4. Type Adaptation Patterns

### Request Body Types
```typescript
// Before
interface CreateBadgeRequest {
  name: string;
  description?: string;
  // ...
}

// After
type CreateBadgeRequest = Omit<OB3.Achievement, 'id' | 'type'> & {
  name: string;
  // ...
};
```

### Response Types
```typescript
// Before
interface BadgeResponse {
  id: string;
  name: string;
  // ...
}

// After
type BadgeResponse = {
  id: string; // Not using IRI for responses
  name: string;
  // ... other properties
};
```

## 5. Acceptance Criteria
- [ ] All controllers and routes use standardized types
- [ ] Helper functions are used for branded types where needed
- [ ] All tests pass
- [ ] No type errors in the controller and route layers
