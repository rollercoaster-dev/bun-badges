# Task: Standardize Key Management API Parameter

## Background

The key management API currently uses both `id` and `name` parameters in the request body for creating keys. This is confusing and inconsistent with best practices. The `id` field should be a system-generated identifier, while the `name` field should be a user-provided label.

## Current Implementation

- The database schema uses `id` as the primary key (auto-generated) and has a separate `name` field for the key name.
- The `KeyManagementService.generateKey()` method accepts a `name` parameter.
- The controller accepts both `id` and `name` parameters, with `id` being used for backward compatibility.
- The API tests have been updated to use `name` instead of `id`.

## Analysis

### Database Schema

The database schema is correctly designed:
- `id` is the primary key, auto-generated using CUID
- `name` is a separate field for the user-provided key name

### Service Layer

The service layer is correctly implemented:
- `KeyManagementService.generateKey()` accepts a `name` parameter
- `KeysService.createKey()` accepts a `NewKey` object that includes a `name` field

### Controller Layer

The controller has been updated to support both `id` and `name` parameters:
- It accepts both parameters in the request body
- It uses `name` if provided, otherwise falls back to `id`
- It has a deprecation notice in the JSDoc comment

### Tests

The API tests have been updated to use `name` instead of `id`, and all tests are passing. This confirms that the controller implementation is working correctly.

## Decision

Since this change hasn't been released yet, and it aligns with best practices, we should proceed with standardizing on the `name` parameter. The `id` parameter should be reserved for the system-generated identifier.

## Tasks

1. **Verify Controller Implementation**
   - Ensure the controller correctly handles both `id` and `name` parameters
   - Confirm that the `keyName` variable is correctly passed to the service

2. **Fix API Tests**
   - Identify why the tests are failing
   - Update the tests to use `name` consistently

3. **Plan for Deprecation**
   - Keep the backward compatibility for now
   - Add a deprecation notice in the API documentation
   - Plan to remove the `id` parameter support in a future release

## Implementation Notes

- The change from `id` to `name` is semantically correct and aligns with best practices
- This change does not go against the Open Badges protocol
- The database schema and service layer already support this approach

## Acceptance Criteria

- [x] Controller correctly handles both `id` and `name` parameters
- [x] API tests pass using the `name` parameter
- [x] Deprecation notice is included in the API documentation
- [x] A plan is in place for eventually removing the `id` parameter support
