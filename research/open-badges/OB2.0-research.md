# Open Badges 2.0 Specification Research

## Core Components

### 1. Issuer Profile
```json
{
  "@context": "https://w3id.org/openbadges/v2",
  "type": "Issuer",
  "id": "https://example.org/issuer",
  "name": "Example Issuer",
  "url": "https://example.org",
  "email": "badges@example.org",
  "description": "An example issuer of Open Badges"
}
```

Required fields:
- `type`: Must be "Issuer"
- `id`: HTTP URL that can be used to retrieve the Issuer
- `name`: Human-readable name

Optional fields:
- `url`: Homepage or website
- `email`: Contact email
- `description`: Human-readable description
- `image`: Image representing the issuer

### 2. BadgeClass
```json
{
  "@context": "https://w3id.org/openbadges/v2",
  "type": "BadgeClass",
  "id": "https://example.org/badges/123",
  "name": "Example Badge",
  "description": "An example badge that can be earned",
  "image": "https://example.org/badges/123/image",
  "criteria": {
    "narrative": "The requirements to earn this badge include..."
  },
  "issuer": "https://example.org/issuer"
}
```

Required fields:
- `type`: Must be "BadgeClass"
- `id`: HTTP URL that can be used to retrieve the BadgeClass
- `name`: Human-readable name
- `description`: Human-readable description
- `image`: Image representing the badge
- `issuer`: URL or embedded issuer object
- `criteria`: Description of what is needed to earn the badge

Optional fields:
- `alignment`: Educational standards alignment
- `tags`: Keywords or categories

### 3. Assertion
```json
{
  "@context": "https://w3id.org/openbadges/v2",
  "type": "Assertion",
  "id": "https://example.org/assertions/123",
  "recipient": {
    "type": "email",
    "hashed": true,
    "salt": "deadsea",
    "identity": "sha256$c7ef86405ba71b85acd8e2e95166c4b111448089f2e1599f42fe1bba46e865c5"
  },
  "badge": "https://example.org/badges/123",
  "issuedOn": "2023-04-01T00:00:00Z",
  "verification": {
    "type": "HostedBadge"
  }
}
```

Required fields:
- `type`: Must be "Assertion"
- `id`: HTTP URL that can be used to retrieve the Assertion
- `recipient`: Object describing the recipient
- `badge`: URL or embedded BadgeClass
- `issuedOn`: ISO8601 timestamp
- `verification`: Object describing verification method

Optional fields:
- `evidence`: Evidence of achievement
- `expires`: ISO8601 timestamp
- `revoked`: Boolean
- `revocationReason`: String explaining revocation

## Verification Methods

### 1. Hosted Verification
- Badge issuer hosts JSON files at publicly accessible URLs
- Verifiers fetch and validate JSON-LD data
- Most straightforward implementation

### 2. Signed Verification
- Assertions are cryptographically signed
- Requires public/private key infrastructure
- More complex but allows offline verification

## Implementation Requirements

### 1. JSON-LD Context
- Must use `https://w3id.org/openbadges/v2` context
- All objects must include `type` field
- IDs must be HTTP(S) URLs

### 2. Data Validation
- Validate all required fields
- Check data types and formats
- Verify URLs are accessible
- Validate image requirements

### 3. Image Requirements
- Must be PNG or SVG
- Recommended size: 400x400 pixels
- Maximum size: 1MB
- Should include badge name in metadata

## Security Considerations

### 1. Recipient Privacy
- Support for hashed identifiers
- Salt values for hashing
- Multiple identifier types

### 2. Verification
- HTTPS for all URLs
- Signature validation for signed badges
- Revocation checking

### 3. Data Protection
- Secure storage of recipient data
- Access control for private badges
- Audit logging

## Certification Requirements

### 1. Technical Requirements
- Implement all required fields
- Support both hosted and signed verification
- Proper JSON-LD implementation
- Valid image handling

### 2. Functional Requirements
- Badge creation and management
- Recipient notification
- Public badge discovery
- Verification endpoints

### 3. Documentation Requirements
- API documentation
- Implementation guide
- Security documentation
- User guides

## Migration to OB 3.0

### Key Differences
1. Verifiable Credentials format
2. Decentralized Identifiers (DIDs)
3. Enhanced privacy features
4. Blockchain compatibility

### Preparation
1. Use extensible data structures
2. Plan for DID support
3. Consider blockchain integration
4. Design for enhanced privacy

## Next Steps

1. **Implementation Planning**
   - Choose verification method
   - Design database schema
   - Plan API endpoints

2. **Development Tasks**
   - Set up JSON-LD context
   - Implement core objects
   - Create verification system

3. **Testing Strategy**
   - Unit tests for objects
   - Integration tests for verification
   - Certification test suite 