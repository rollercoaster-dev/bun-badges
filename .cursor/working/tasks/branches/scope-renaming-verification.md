# Scope Renaming Verification Task

## Overview
This task addresses the renaming of `OAUTH_SCOPES.PROFILE_UPDATE` to `OAUTH_SCOPES.LEGACY_PROFILE_UPDATE` and ensures consistency throughout the codebase. This change requires careful verification to prevent authorization failures or security vulnerabilities.

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

## Commit Structure
- `fix(auth): verify and update PROFILE_UPDATE scope renaming`
- `feat(auth): add backward compatibility for legacy scopes`
- `test(auth): add tests for scope backward compatibility`
- `docs: update documentation for scope changes`

## Learnings
- Scope renaming requires careful verification across the entire codebase
- Security-related changes need comprehensive testing and backward compatibility
- Clear deprecation notices and migration guides are essential for API changes

## References
- [OAuth 2.0 Scope Definition](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3)
- [API Versioning Best Practices](https://www.mnot.net/blog/2012/12/04/api-evolution)
- [Open Badges 3.0 Specification](https://www.imsglobal.org/spec/ob/v3p0/)
