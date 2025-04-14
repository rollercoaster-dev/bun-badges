# Open Badges Types Guide

This guide explains how to use the `openbadges-types` package in the Bun Badges project.

## Overview

The `openbadges-types` package provides comprehensive TypeScript type definitions for both Open Badges 2.0 and 3.0 specifications. It includes:

- Types for Open Badges 2.0 (under the `OB2` namespace)
- Types for Open Badges 3.0 (under the `OB3` namespace)
- Shared types used by both versions (under the `Shared` namespace)
- Type guards and utility types

## Getting Started

To use the openbadges-types in your code, import from our adapter module:

```typescript
import { OB2, OB3, Shared, toIRI, toDateTime } from '../utils/openbadges-types';
```

## Working with Branded Types

The package uses "branded types" for `IRI` and `DateTime` to ensure type safety. These can't be directly assigned from strings:

```typescript
// This won't work
const id: Shared.IRI = "https://example.com/badges/123"; // Type error!

// Use the helper function instead
const id = toIRI("https://example.com/badges/123"); // Works correctly
```

## Available Types

### Open Badges 2.0 (OB2)

- `OB2.Assertion` - A badge assertion (award)
- `OB2.BadgeClass` - A badge class definition
- `OB2.Profile` - An issuer profile
- `OB2.VerificationObject` - Verification instructions
- `OB2.Evidence` - Evidence for an achievement
- And many more...

### Open Badges 3.0 (OB3)

- `OB3.VerifiableCredential` - A verifiable credential
- `OB3.Achievement` - An achievement definition
- `OB3.CredentialSubject` - The subject of a credential
- `OB3.Issuer` - An issuer profile
- `OB3.Proof` - Cryptographic proof
- And many more...

### Shared Types

- `Shared.IRI` - Internationalized Resource Identifier (URL)
- `Shared.DateTime` - ISO 8601 date string
- `Shared.JsonLdContext` - JSON-LD context
- `Shared.MultiLanguageString` - Internationalized string
- And more...

## Helper Functions

Our adapter module provides several helper functions:

- `toIRI(url: string): Shared.IRI` - Convert a string to an IRI
- `toDateTime(date: string): Shared.DateTime` - Convert a string to a DateTime
- `isSingleAchievement(achievement: OB3.Achievement | OB3.Achievement[]): boolean` - Check if an achievement is a single object or array
- `getAchievementName(achievement: OB3.Achievement | OB3.Achievement[]): string` - Get the name from an achievement (handles both single and array)

## Migration Strategy

We're adopting these types gradually:

1. **Phase 1: Parallel Types**
   - Keep existing types working as-is
   - Use openbadges-types in new code

2. **Phase 2: Gradual Migration**
   - Incrementally update modules to use openbadges-types
   - Start with less connected modules

3. **Phase 3: Complete Migration**
   - Remove duplicate type definitions
   - Update all documentation

## Example Usage

### Creating a Verifiable Credential (OB3)

```typescript
import { OB3, toIRI, toDateTime } from '../utils/openbadges-types';

const credential: OB3.VerifiableCredential = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  id: toIRI('https://example.org/credentials/123'),
  type: ['VerifiableCredential'],
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
```

### Creating a Badge Class (OB2)

```typescript
import { OB2, toIRI } from '../utils/openbadges-types';

const badgeClass: OB2.BadgeClass = {
  '@context': 'https://w3id.org/openbadges/v2',
  id: toIRI('https://example.org/badges/5'),
  type: 'BadgeClass',
  name: '3-D Printmaster',
  description: 'This badge is awarded for passing the 3-D printing knowledge and safety test.',
  image: toIRI('https://example.org/badges/5/image'),
  criteria: {
    narrative: 'Students are tested on knowledge and safety, both through a paper test and a supervised performance evaluation on key skills.'
  },
  issuer: toIRI('https://example.org/issuer')
};
```

## Best Practices

1. **Always use helper functions** for branded types
2. **Use type guards** when working with union types
3. **Prefer the standard types** for new code
4. **Add tests** when migrating existing code
5. **Document any extensions** to the standard types
