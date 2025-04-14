# PR: Add openbadges-types Package

## Overview
This PR adds the `openbadges-types` package and sets up the foundation for gradually adopting standardized Open Badges type definitions throughout the codebase.

## Changes
- Added `openbadges-types` package
- Created adapter module for type re-exports
- Added helper functions for working with branded types
- Created documentation for gradual migration

## Approach
Rather than replacing all existing types at once (which would cause many type errors), we're taking a gradual approach:

1. **Add the package** without breaking existing code
2. **Create helper functions** for working with branded types (IRI, DateTime)
3. **Document the migration path** for future development
4. **Use new types in new code** going forward

## Type Compatibility Considerations

### Branded Types
The `openbadges-types` package uses branded types for `IRI` and `DateTime`:

```typescript
type IRI = string & { readonly __brand: unique symbol };
type DateTime = string & { readonly __brand: unique symbol };
```

To work with these types, we've added helper functions:

```typescript
// Convert a string to an IRI
export function toIRI(url: string): IRI {
  // Validation logic here
  return url as IRI;
}

// Convert a string to a DateTime
export function toDateTime(date: string): DateTime {
  // Validation logic here
  return date as DateTime;
}
```

### Migration Strategy
We'll migrate the codebase to use these types gradually:

1. **Phase 1:** Add package and helpers (this PR)
2. **Phase 2:** Use new types in new code
3. **Phase 3:** Gradually migrate existing modules
4. **Phase 4:** Complete migration

## Testing
- No existing functionality is changed
- Helper functions are unit tested
- Documentation includes examples

## Future Work
- Begin using openbadges-types in new features
- Create a schedule for migrating existing modules
- Consider contributing improvements back to the openbadges-types package
