# Scope Renaming Verification Task

## Branch: `fix/scope-renaming-verification`

## Prerequisites and Dependencies
- OAuth 2.0 implementation must be in place
- Authorization middleware must be implemented
- Route definitions with scope checks must exist

## Context and Background
This task addresses the renaming of `OAUTH_SCOPES.PROFILE_UPDATE` to `OAUTH_SCOPES.LEGACY_PROFILE_UPDATE` and ensures consistency throughout the codebase. This change requires careful verification to prevent authorization failures or security vulnerabilities.

The scope renaming is part of a larger effort to improve the security and clarity of the OAuth 2.0 implementation. The original scope name was too generic and could lead to confusion about what operations it allows. The new name better reflects its legacy status and helps developers understand its purpose.

Key design decisions:
- Maintain backward compatibility for existing clients
- Implement a mapping between legacy and new scopes
- Add deprecation notices for the legacy scope
- Provide a clear migration path for clients

## Current Status
- [x] Identified the scope renaming issue
- [ ] Performed comprehensive search for all occurrences
- [ ] Verified consistency in route definitions
- [ ] Verified consistency in authorization middleware
- [ ] Verified consistency in OAuth token generation
- [ ] Verified consistency in client registration
- [ ] Updated documentation to reflect the change
- [ ] Added backward compatibility support
- [ ] Added tests to verify both scopes work correctly

## Implementation Plan

### 1. Comprehensive Search and Analysis
- [ ] Search for all occurrences of `PROFILE_UPDATE` in the codebase
- [ ] Identify all files and code paths that use this scope
- [ ] Document all locations where updates are needed
- [ ] Analyze the impact of the change on existing clients

### 2. Implement Backward Compatibility
- [ ] Add support for both scope names during a transition period
- [ ] Update the scope validation logic to recognize both scopes
- [ ] Add mapping between legacy and new scopes
- [ ] Add deprecation notices for the legacy scope

### 3. Update Authorization Logic
- [ ] Update all route definitions that check for this scope
- [ ] Update authorization middleware to handle both scopes
- [ ] Update OAuth token generation to map scopes correctly
- [ ] Update client registration to handle both scopes

### 4. Update Documentation
- [ ] Update API documentation to reflect the scope change
- [ ] Add migration guide for clients using the old scope
- [ ] Document the deprecation timeline for the legacy scope
- [ ] Update examples to use the new scope name

### 5. Add Test Coverage
- [ ] Add tests for authorization with the new scope
- [ ] Add tests for authorization with the legacy scope
- [ ] Add tests for scope mapping and validation
- [ ] Add tests for backward compatibility

## Learnings
- Scope renaming requires careful verification across the entire codebase
- Security-related changes need comprehensive testing and backward compatibility
- Clear deprecation notices and migration guides are essential for API changes
- Maintaining backward compatibility is crucial for existing clients

## Next Steps
- Perform comprehensive search for all occurrences of the scope
- Implement backward compatibility for both scope names
- Update authorization logic to handle both scopes
- Update documentation and add tests

## Related Code Sections
- `src/constants/oauth.constants.ts` - OAuth scope definitions
- `src/middleware/auth.middleware.ts` - Authorization middleware
- `src/routes/` - Route definitions with scope checks
- `src/services/oauth.service.ts` - OAuth token generation
- `src/controllers/oauth.controller.ts` - Client registration

## Testing Strategy
- Unit tests for scope validation and mapping
- Integration tests for authorization with both scopes
- API tests for endpoints protected by the scope
- Backward compatibility tests for existing clients

Test cases to cover:
1. Authorization with the new scope
2. Authorization with the legacy scope
3. Scope mapping and validation
4. Error handling for invalid scopes
5. Deprecation notices for the legacy scope

## Rollback Plan
- Keep both scope names in the codebase during the transition period
- Maintain backward compatibility for at least one release cycle
- Document the rollback process for clients

## Definition of Done
- All occurrences of the scope have been identified and updated
- Backward compatibility is implemented and tested
- Documentation is updated with migration guide
- All tests pass with good coverage
- No authorization failures or security vulnerabilities are introduced

## Commit Structure
- `fix(auth): verify and update PROFILE_UPDATE scope renaming`
- `feat(auth): add backward compatibility for legacy scopes`
- `test(auth): add tests for scope backward compatibility`
- `docs: update documentation for scope changes`

## References
- [OAuth 2.0 Scope Definition](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3)
- [API Versioning Best Practices](https://www.mnot.net/blog/2012/12/04/api-evolution)
- [Open Badges 3.0 Specification](https://www.imsglobal.org/spec/ob/v3p0/)
- [Semantic Versioning](https://semver.org/)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics-18)
