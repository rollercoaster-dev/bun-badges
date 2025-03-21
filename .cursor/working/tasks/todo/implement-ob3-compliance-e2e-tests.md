# Task: Implement Comprehensive OB3 Compliance E2E Test Suite

## Summary

Our current E2E tests verify basic badge functionality but lack comprehensive testing for Open Badges 3.0 compliance. This task involves creating a thorough test suite that verifies all aspects of OB3 compliance, including proper context URLs, credential schemas, cryptographic proofs, and revocation mechanisms.

## Background

Open Badges 3.0 introduces significant changes from previous versions, requiring:
- Verifiable Credentials data model
- Digital signatures using cryptographic proofs
- Status list-based revocation
- Well-defined context structures

While we have implemented most of these features, we need comprehensive E2E tests to ensure our implementation fully complies with the OB3 specification and remains compliant as development continues.

## Requirements

The new E2E test suite should verify:

### 1. Badge Lifecycle with OB3 Format
- Create a badge with OB3 format (using the `format=ob3` parameter)
- Verify the badge has the correct OB3 context URLs and structure
- Issue a badge credential with proper DataIntegrityProof
- Verify the badge credential signature
- Test credential revocation using StatusList2021

### 2. Context and Schema Validation
- Validate that all credentials include the required context URLs:
  - `https://www.w3.org/2018/credentials/v1`
  - `https://w3id.org/vc/status-list/2021/v1`
  - `https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json`
- Verify credentials include proper schema references
- Ensure the structure follows the OB3 specification

### 3. Cryptographic Proof Tests
- Verify the DataIntegrityProof with eddsa-rdfc-2022 cryptosuite is correctly implemented
- Test signature verification
- Test with invalid signatures to ensure proper validation

### 4. Revocation Mechanism
- Test creating a status list
- Test revoking a credential
- Verify a revoked credential is detected as invalid
- Test status list updates

### 5. API Endpoints for OB3
- Test `/assertions` endpoint with OB3 format parameter
- Test `/verify` endpoint for OB3 credentials
- Test status list endpoints
- Verify support for both OB2 and OB3 formats

### 6. Format Conversion
- Test converting between OB2 and OB3 formats 
- Verify backwards compatibility

## Tasks

1. **Create OB3 Badge Lifecycle Test**
   - [ ] Create a new test file for OB3-specific badge lifecycle
   - [ ] Implement tests for badge creation with OB3 format
   - [ ] Verify OB3 credential structure and context
   - [ ] Test badge issuance with cryptographic proof
   - [ ] Test badge verification

2. **Implement Cryptographic Validation Tests**
   - [ ] Create tests to verify proof generation
   - [ ] Add tests for signature verification
   - [ ] Add tests with intentionally invalid signatures
   - [ ] Verify proof format compliance

3. **Implement Revocation Tests**
   - [ ] Test status list creation
   - [ ] Test credential revocation
   - [ ] Verify revoked credential detection
   - [ ] Test status list updates

4. **Test API Endpoint Compliance**
   - [ ] Verify all endpoints support the format parameter
   - [ ] Test content negotiation
   - [ ] Verify proper error handling
   - [ ] Test rate limiting and security features

5. **Create Format Conversion Tests**
   - [ ] Test converting from OB2 to OB3
   - [ ] Test backwards compatibility
   - [ ] Verify format-specific features

## Implementation Example

```typescript
// Example test structure for OB3 credential tests
it("should create an OB3 credential and verify its structure", async () => {
  // Create a badge with OB3 format
  const badgeData = {
    name: "OB3 Test Badge",
    description: "Tests OB3 compliance",
    criteria: { narrative: "Complete OB3 tests" },
    image: "https://example.com/badge.png"
  };

  // Create the badge using format=ob3
  const createResponse = await authenticatedRequest(
    request,
    "post",
    "/badges?format=ob3",
    user.token,
    badgeData
  );
  
  expect(createResponse.status).toBe(201);
  
  // Verify OB3 structure
  expect(createResponse.body["@context"]).toContain("https://www.w3.org/2018/credentials/v1");
  expect(createResponse.body["@context"]).toContain("https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json");
  expect(createResponse.body.type).toContain("VerifiableCredential");
  expect(createResponse.body.type).toContain("OpenBadgeCredential");
  expect(createResponse.body.credentialSchema).toBeDefined();
  expect(createResponse.body.credentialSchema.id).toBe("https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json");
  
  // Issue a badge assertion with OB3 format
  const assertionData = {
    badgeId: createResponse.body.id,
    recipient: {
      identity: "recipient@example.com",
      type: "email"
    },
    format: "ob3"
  };
  
  const assertResponse = await authenticatedRequest(
    request,
    "post",
    "/assertions",
    user.token,
    assertionData
  );
  
  expect(assertResponse.status).toBe(201);
  
  // Verify proof structure
  expect(assertResponse.body.proof).toBeDefined();
  expect(assertResponse.body.proof.type).toBe("DataIntegrityProof");
  expect(assertResponse.body.proof.cryptosuite).toBe("eddsa-rdfc-2022");
  expect(assertResponse.body.proof.proofValue).toBeDefined();
  
  // Verify credential status
  expect(assertResponse.body.credentialStatus).toBeDefined();
  expect(assertResponse.body.credentialStatus.type).toBe("StatusList2021Entry");
  
  // Verify the credential
  const verifyResponse = await request.get(`/verify/${assertResponse.body.id}?format=ob3`);
  expect(verifyResponse.status).toBe(200);
  expect(verifyResponse.body.valid).toBe(true);
  
  // Test revocation
  const revokeResponse = await authenticatedRequest(
    request,
    "post",
    `/assertions/${assertResponse.body.id}/revoke`,
    user.token
  );
  
  expect(revokeResponse.status).toBe(200);
  
  // Verify the revoked credential
  const verifyRevokedResponse = await request.get(`/verify/${assertResponse.body.id}?format=ob3`);
  expect(verifyRevokedResponse.status).toBe(200);
  expect(verifyRevokedResponse.body.valid).toBe(false);
  expect(verifyRevokedResponse.body.revoked).toBe(true);
});
```

## References

The OB3 example workflow in `examples/ob3-workflow.ts` provides an excellent reference for what needs to be tested.

## Acceptance Criteria

- [ ] All test cases pass successfully
- [ ] Test coverage includes all required OB3 features
- [ ] Tests work with both mock servers and actual API
- [ ] Tests provide helpful error messages when compliance issues are detected
- [ ] Tests can be run in CI/CD pipeline

## Estimated Effort

- Create test framework: 3-4 hours
- Implement badge lifecycle tests: 2-3 hours
- Implement cryptographic validation tests: 3-4 hours
- Implement revocation tests: 2-3 hours
- Test API endpoint compliance: 2-3 hours
- Create format conversion tests: 2-3 hours

Total: 14-20 hours (approximately 2-3 days of development time) 