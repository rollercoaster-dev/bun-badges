# OB3 Enhanced Badge Baking

## Priority
Medium

## Status
Pending

## Parent Issue
OB3 Implementation Roadmap

## Description
Enhance the badge baking functionality to fully support Open Badges 3.0 credentials, allowing for embedding OB3 credentials into images and extracting them properly. This will ensure compatibility with OB3 credential wallets and verification systems.

## Tasks

- [ ] Enhance badge baking with OB3 support
  - [ ] Update baking functions to handle OB3 credential structure
  - [ ] Ensure proper handling of cryptographic proofs during baking
  - [ ] Verify credential integrity is maintained when baked
  - [ ] Support both PNG and SVG formats for OB3 credentials

- [ ] Add extraction capability for OB3 credentials
  - [ ] Update extraction functions to detect and correctly parse OB3 credentials
  - [ ] Handle both with-proof and without-proof variants
  - [ ] Maintain cryptographic proof integrity during extraction
  - [ ] Properly reconstruct the credential from extracted data

- [ ] Create validation for baked OB3 credentials
  - [ ] Validate extracted credentials against OB3 schemas
  - [ ] Verify cryptographic proofs after extraction
  - [ ] Check status references are maintained correctly
  - [ ] Ensure all required OB3 fields are preserved

- [ ] Add tests for OB3 badge baking
  - [ ] Test baking and extraction with various credential types
  - [ ] Verify credentials can be verified after extraction
  - [ ] Test handling of malformed inputs
  - [ ] Benchmark performance of OB3 baking operations

## Technical Considerations
- OB3 credentials are larger due to cryptographic proofs
- Some OB3 wallets may have specific requirements for baked credentials
- PNG and SVG formats handle metadata differently
- Maintaining proof integrity is critical for verification

## Implementation Approach
1. Analyze current baking code in `src/utils/badge-baker.ts`
2. Update to handle OB3-specific structures
3. Implement specialized extraction for OB3 credentials
4. Add validation to ensure extracted credentials remain valid
5. Create comprehensive tests for the new functionality

## Estimated Effort
6-8 hours

## Success Criteria
- OB3 credentials can be successfully baked into images
- Extracted credentials maintain their validity and can be verified
- All cryptographic proofs are preserved during baking and extraction
- Tests demonstrate reliable operation with different credential formats

## Related Files
- `src/utils/badge-baker.ts` - Main baking and extraction code
- `src/routes/badges.routes.ts` - Badge API routes for baking
- `src/controllers/badge.controller.ts` - Controller for badge operations
- `tests/unit/utils/badge-baker.test.ts` - Tests for baking functionality 