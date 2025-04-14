# Task: Update Documentation and Examples for openbadges-types

## 1. Goal
- **Objective:** Update documentation and examples to reflect the use of standardized types
- **Status:** 🟡 Not Started
- **Priority:** Medium
- **Estimated Time:** 3-4 hours
- **Dependencies:** Requires completion of implementation tasks

## 2. Resources
- **Package:** [openbadges-types](https://www.npmjs.com/package/openbadges-types)
- **Files to Update:**
  - `docs/openbadges-types-guide.md` (expand existing)
  - `README.md`
  - Example files
  - API documentation

## 3. Implementation Plan

### 3.1 Documentation Updates
- [ ] Expand the openbadges-types guide with more examples
- [ ] Add section to README about the types package
- [ ] Update API documentation to reflect new types

### 3.2 Example Updates
- [ ] Create example files showing proper usage of types
- [ ] Update existing examples to use standardized types
- [ ] Add examples for common patterns and edge cases

### 3.3 Type Migration Guide
- [ ] Create a guide for migrating from custom types to standardized types
- [ ] Document common patterns and solutions
- [ ] Add troubleshooting section for common issues

## 4. Documentation Examples

### README Update
```markdown
## Types

This project uses the [openbadges-types](https://www.npmjs.com/package/openbadges-types) package for standardized Open Badges type definitions. This provides:

- Type definitions for Open Badges 2.0 and 3.0
- Type guards and validation utilities
- Branded types for improved type safety

See the [Open Badges Types Guide](./docs/openbadges-types-guide.md) for more information.
```

### Example File
Create an example file showing how to create and validate a credential:

```typescript
// examples/create-credential.ts
import { OB3, toIRI, toDateTime } from '../src/utils/openbadges-types';

// Create a verifiable credential
const credential: OB3.VerifiableCredential = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  id: toIRI('https://example.org/credentials/123'),
  type: ['VerifiableCredential', 'OpenBadgeCredential'],
  issuer: {
    id: toIRI('https://example.org/issuers/1'),
    type: ['Profile'],
    name: 'Example Issuer',
    url: toIRI('https://example.org')
  },
  issuanceDate: toDateTime('2023-01-01T00:00:00Z'),
  credentialSubject: {
    id: toIRI('did:example:123'),
    achievement: {
      type: ['Achievement'],
      name: 'Example Achievement',
      description: 'This is an example achievement'
    }
  }
};

console.log(JSON.stringify(credential, null, 2));
```

## 5. Acceptance Criteria
- [ ] Documentation is updated to reflect the use of standardized types
- [ ] Examples show proper usage of types
- [ ] Migration guide helps developers understand the changes
- [ ] README includes information about the types package
