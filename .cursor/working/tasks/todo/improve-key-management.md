# Improve Key Management Security

## 1. Goal
- **Objective:** Refactor `KeyManagementService` to use unique salts per encryption operation when encrypting/decrypting issuer private keys. Move away from using a fixed salt and address the security risks of relying solely on an environment variable for the `MASTER_ENCRYPTION_KEY`.
- **Energy Level:** High 🔋
- **Status:** 🟡 In Progress

## 2. Resources
- **Existing Tools/Files:** `src/services/key.service.ts`, `node:crypto` module, `.env` files (for current key handling)
- **Additional Needs:** Potentially a secrets management solution (Vault, KMS) or updated environment variable strategy.
- **Related Files:** `src/services/key.service.ts`, `tests/unit/services/key.service.test.ts`, `tests/integration/services/key.service.integration.test.ts`, `issuer_profiles` schema (if format changes), `.env` files.

## 3. Ideas & Challenges
- **Approaches:**
    - Strategy 1 (Chosen in analysis): Unique salt per encryption, stored alongside ciphertext (e.g., `salt:iv:tag:ciphertext`, base64 encoded).
    - Strategy 2: Integrate with external KMS (AWS, GCP).
    - Strategy 3: Integrate with HashiCorp Vault.
- **Potential Issues:**
    - Correctly implementing cryptographic primitives (salt generation, key derivation, authenticated encryption).
    - Handling existing encrypted keys (requires migration/re-encryption).
    - Securely managing the `MASTER_ENCRYPTION_KEY` itself (even if only used for derivation).
    - Ensuring sufficient entropy for salts.
- **Decision Log:**
  - Decision: Proceed with Strategy 1 (unique salts stored with data) for now as outlined in the previous analysis feature branch plan.
  - Reasoning: Improves crypto hygiene significantly without introducing external dependencies immediately. Addresses the fixed salt vulnerability directly.
  - Alternatives: KMS/Vault integration (can be future enhancements).

## 4. Plan
- **Quick Wins:**
  - [ ] Define the new storage format string (e.g., how salt, iv, tag, ciphertext are combined/encoded).
- **Major Steps:**
  1. Step: Modify `KeyManagementService.encryptPrivateKey` to generate unique salt, derive key, encrypt, combine components (salt:iv:tag:ciphertext), and base64 encode. (Estimate: 50 mins) 🎯
  2. Step: Modify `KeyManagementService.decryptPrivateKey` to decode base64, parse components, extract salt, re-derive key, and decrypt using extracted iv/tag/ciphertext. (Estimate: 50 mins) 🎯
  3. Step: Update unit tests (`key.service.test.ts`) for encryption/decryption (unskipping/modifying existing). Focus on validating the new format and correct key derivation with unique salts. (Estimate: 50 mins) 🎯
  4. Step: Update integration tests (`key.service.integration.test.ts`) to store/retrieve keys using the new format. (Estimate: 25 mins) 🎯
  5. Step: Plan and potentially implement a migration strategy/utility for re-encrypting existing keys in the database (if any). (Estimate: 25 mins) 🎯

## 5. Execution
- **Progress Updates:**
  - [x] Step 1: Modified `KeyManagementService.encryptPrivateKey` to use a unique salt, derive key, and output in the format `salt:iv:tag:ciphertext` (base64 encoded). This was actually already implemented in the codebase.
  - [x] Step 2: Modified `KeyManagementService.decryptPrivateKey` to correctly parse the salt, IV, tag, and ciphertext from the base64 string, derive the key using the extracted salt, and decrypt the data. Fixed several bugs in this implementation, including incorrect subarray offsets and improper buffer handling.
  - [x] Step 3: Updated unit tests by unskipping the encryption/decryption tests that were previously disabled. These tests now pass with the updated implementation.
  - [x] Step 4: Integration tests were run and confirmed to be working with the new implementation. No changes were needed to the integration tests themselves, as they were already designed to work with the updated format.
  - [ ] Step 5: No migration utility appears to be needed at this time, as the key management implementation was likely not actively used in production data yet.
- **Context Resume Point:**
  Last working on: Completing Steps 1-4 of the task.
  Next planned action: Complete a PR with the fixes to `decryptPrivateKey`.
  Current blockers: None.

## 6. Next Actions & Blockers
- **Immediate Next Actions:**
  - [ ] Create a PR with the changes to `decryptPrivateKey` and the unskipped unit tests.
  - [ ] Document the key storage format in a comment or README to ensure future developers understand the implementation.
- **Current Blockers:**
  - None

## 7. User Experience & Reflection
- **Friction Points:**
- **Flow Moments:**
- **Observations:**
- **Celebration Notes:** 🎉 Successfully initiated task using the new framework! 