# Digital Signing Implementation

## Task Description
Implement digital signing capabilities for Open Badges, using badge-engine's implementation as a reference, to ensure badge authenticity and security.

## Priority
High - Critical for badge verification and security

## Estimated Time
8-12 days

## Dependencies
- Open Badges and W3C Verifiable Credentials research
- Library selection and evaluation

## Research Findings

After examining the badge-engine implementation, the following approach for digital signing was identified:

### Library Stack
- **jsonld**: For JSON-LD document processing
- **n3**: For RDF operations 
- **@noble/curves/ed25519**: For Ed25519 digital signatures
- **multiformats/bases/base58**: For encoding
- **@digitalbazaar/ed25519-multikey**: For key management
- **bnid**: For secure key seed generation

### Key Management
- Uses `createSigningKey.ts` to generate and store Ed25519 keypairs
- Uses `getSigningKey.ts` to retrieve existing keys or create new ones
- Keys are stored in a database table (in badge-engine, this is in a Prisma table called `multikey`)

### Signing Approach
- Uses eddsa-rdfc-2022 cryptosuite for signatures
- Processes JSON-LD documents with canonicalization using RDFC10
- Creates proofs that comply with W3C Data Integrity standards

### Integration with Open Badges
- Badge assertions can include a proof that verifies their authenticity
- Public keys are managed at the issuer level
- The implementation targets compatibility with Verifiable Credentials

### Implementation Plan for bun-badges
1. Add the required library dependencies to our project
2. Create a database schema for key management
3. Implement the core signing utilities
4. Create API endpoints for signing and verification
5. Integrate signing with the badge issuance process

## Detailed Steps

### Phase 1: Research and Specification Compliance (2-3 days)
- [ ] Research best practices for digitally signing Open Badges
- [ ] Study how Verifiable Credentials handle digital signatures
- [ ] Examine badge-engine's cryptographic suite implementation
- [ ] Review W3C Verifiable Credentials Data Model for proof formats
- [ ] Analyze compatibility of different signature methods with Open Badges
- [ ] Document cryptographic requirements and security considerations

### Phase 2: Library Selection and Architecture Design (1-2 days)
- [ ] Adopt badge-engine's library stack:
  - [ ] jsonld for JSON-LD processing
  - [ ] n3 for RDF operations
  - [ ] @noble/curves/ed25519 for Ed25519 digital signatures
  - [ ] multiformats/bases/base58 for encoding
- [ ] Design key management approach similar to badge-engine
- [ ] Create architecture document for signing implementation

### Phase 3: Core Signing Utilities (2-3 days)
- [ ] Create utility functions for:
  - [ ] Generating and storing signing keys (reference create-signing-key.ts)
  - [ ] JSON-LD document processing and canonicalization using RDFC10
  - [ ] Creating and verifying Ed25519 signatures with eddsa-rdfc-2022 cryptosuite
  - [ ] Proper key management and security
- [ ] Ensure compatibility with Open Badges verification requirements

### Phase 4: API Implementation (2-3 days)
- [ ] Create `SigningController` with methods for:
  - [ ] Generating digital proofs for credentials
  - [ ] Verifying signed credentials
  - [ ] Key management functions
- [ ] Implement routes for:
  - [ ] `POST /api/sign/:assertionId`: Sign a credential
  - [ ] `POST /api/verify`: Verify a signed credential
- [ ] Add authentication and authorization for signing operations
- [ ] Reference signing.router.ts implementation for proof creation

### Phase 5: Integration with Assertions (1-2 days)
- [ ] Research optimal signed Open Badge representation for compatibility
- [ ] Modify assertion creation process to support optional signing
- [ ] Update badge assertion JSON structure to accommodate proofs
- [ ] Ensure compatibility with Verifiable Credentials specification
- [ ] Use proof.schema.ts as reference for proof structure

### Phase 6: Testing and Validation (1-2 days)
- [ ] Write unit tests for signing utilities
- [ ] Create integration tests for signing and verification
- [ ] Test with various credential formats
- [ ] Verify interoperability with other Open Badges systems

## Acceptance Criteria
- Digital signatures comply with W3C Data Integrity Proof standard
- Signing process uses eddsa-rdfc-2022 cryptosuite as specified
- API endpoints for signing and verification work correctly
- Integration with badge creation process is seamless
- Verification of signed badges works with standard verification tools
- All tests pass for signing and verification functionality

## Notes
- Security is critical - follow best practices for key management
- Maintain compatibility with existing badge validators
- Documentation should include cryptographic choices and rationale
- Consider performance implications of signing operations 