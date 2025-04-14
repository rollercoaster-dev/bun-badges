# Task: Resolve TypeScript Errors After Type Refactoring

## 1. Goal
- **Objective:** Fix all TypeScript errors reported by `tsc --noEmit` after refactoring core models to use `openbadges-types`.
- **Status:** In Progress
- **Priority:** High

## 2. Context
- Core models (`credential.model.ts`, `issuer.model.ts`) were refactored to use standard types from `openbadges-types`.
- Type aliases were centralized in `src/utils/openbadges-types.ts`.
- Custom type guards were replaced with library functions.
- `tsc --noEmit` run on [Timestamp of run] reported 30 errors across 13 files.

## 3. Documented Errors (`tsc --noEmit` Output)

```typescript
src/controllers/assertions.controller.ts:8:10 - error TS2724: '"@/models/credential.model"' has no exported member named 'OpenBadgeCredential'. Did you mean 'isOpenBadgeCredential'?

src/services/credential-verification.service.ts:14:3 - error TS2724: '"@/models/credential.model"' has no exported member named 'OpenBadgeCredential'. Did you mean 'isOpenBadgeCredential'?
src/services/credential-verification.service.ts:16:3 - error TS2305: Module '"@/models/credential.model"' has no exported member 'StatusList2021Entry'.

src/services/credential.service.ts:19:3 - error TS2724: '"@/models/credential.model"' has no exported member named 'OpenBadgeCredential'. Did you mean 'isOpenBadgeCredential'?
src/services/credential.service.ts:20:3 - error TS2305: Module '"@/models/credential.model"' has no exported member 'OpenBadgeAchievement'.
src/services/credential.service.ts:21:3 - error TS2305: Module '"@/models/credential.model"' has no exported member 'CredentialProof'.
src/services/credential.service.ts:22:3 - error TS2724: '"@/models/credential.model"' has no exported member named 'StatusList2021Credential'. Did you mean 'isStatusList2021Credential'?
src/services/credential.service.ts:23:3 - error TS2305: Module '"@/models/credential.model"' has no exported member 'StatusList2021Entry'.

src/utils/badge-baker.ts:4:3 - error TS2724: '"@/models/credential.model"' has no exported member named 'OpenBadgeCredential'. Did you mean 'isOpenBadgeCredential'?

src/utils/schema-validation.ts:4:10 - error TS2724: '"@/models/credential.model"' has no exported member named 'OpenBadgeCredential'. Did you mean 'isOpenBadgeCredential'?
src/utils/schema-validation.ts:129:10 - error TS7006: Parameter 'ctx' implicitly has an 'any' type.
src/utils/schema-validation.ts:135:10 - error TS7006: Parameter 'ctx' implicitly has an 'any' type.

src/utils/signing/credential.ts:5:10 - error TS2305: Module '"@/models/credential.model"' has no exported member 'CredentialProof'.
src/utils/signing/credential.ts:120:52 - error TS2694: Namespace '"/Users/joeczarnecki/Code/rollercoaster.dev/bun-badges/src/models/credential.model"' has no exported member 'DataIntegrityProof'.

src/utils/test/db-helpers.ts:13:10 - error TS2724: '"@/models/credential.model"' has no exported member named 'OpenBadgeCredential'. Did you mean 'isOpenBadgeCredential'?

src/utils/type-check.ts:6:3 - error TS2724: '"@/models/credential.model"' has no exported member named 'OpenBadgeCredential'. Did you mean 'isOpenBadgeCredential'?
src/utils/type-check.ts:8:3 - error TS2305: Module '"@/models/credential.model"' has no exported member 'DataIntegrityProof'.

tests/helpers/test-utils.ts:16:3 - error TS2724: '"@/models/credential.model"' has no exported member named 'OpenBadgeCredential'. Did you mean 'isOpenBadgeCredential'?
tests/helpers/test-utils.ts:17:3 - error TS2305: Module '"@/models/credential.model"' has no exported member 'DataIntegrityProof'.

tests/integration/controllers/integration/issuer-verify.integration.test.ts:68:9 - error TS2322: Type 'string' is not assignable to type 'IRI'.
tests/integration/controllers/integration/issuer-verify.integration.test.ts:70:9 - error TS2322: Type 'string' is not assignable to type 'IRI'.
tests/integration/controllers/integration/issuer-verify.integration.test.ts:73:46 - error TS2345: Argument of type 'IssuerJsonLdV2' is not assignable to parameter of type 'IssuerJsonLd'.

tests/integration/controllers/issuer/issuer.controller.integration.test.ts:333:9 - error TS2322: Type 'string' is not assignable to type 'IRI'.
tests/integration/controllers/issuer/issuer.controller.integration.test.ts:335:9 - error TS2322: Type 'string' is not assignable to type 'IRI'.
tests/integration/controllers/issuer/issuer.controller.integration.test.ts:338:46 - error TS2345: Argument of type 'IssuerJsonLdV2' is not assignable to parameter of type 'IssuerJsonLd'.

tests/integration/credential.integration.test.ts:8:3 - error TS2724: '"@/models/credential.model"' has no exported member named 'OpenBadgeCredential'. Did you mean 'isOpenBadgeCredential'?
tests/integration/credential.integration.test.ts:9:3 - error TS2305: Module '"@/models/credential.model"' has no exported member 'DataIntegrityProof'.

tests/integration/integration/credential.service.integration.test.ts:10:3 - error TS2305: Module '"@/models/credential.model"' has no exported member 'DataIntegrityProof'.
tests/integration/integration/credential.service.integration.test.ts:11:3 - error TS2305: Module '"@/models/credential.model"' has no exported member 'CredentialProof'.
tests/integration/integration/credential.service.integration.test.ts:12:3 - error TS2305: Module '"@/models/credential.model"' has no exported member 'StatusList2021Entry'.

```

## 4. Analysis and Action Plan (File by File)

**Key:**
- `[ ]`: ToDo
- `[P]`: In Progress
- `[B]`: Blocked
- `[x]`: Done

---

**File:** `src/controllers/assertions.controller.ts`
- **Errors:**
  - `TS2724`: Cannot find `OpenBadgeCredential` imported from `@/models/credential.model`.
- **Plan:**
  - `[x]` Change import `import { OpenBadgeCredential } from "@/models/credential.model";` to `import { OpenBadgeCredential } from "@/utils/openbadges-types";`.

---

**File:** `src/services/credential-verification.service.ts`
- **Errors:**
  - `TS2724`: Cannot find `OpenBadgeCredential` imported from `@/models/credential.model`.
  - `TS2305`: Cannot find `StatusList2021Entry` imported from `@/models/credential.model`.
- **Plan:**
  - `[x]` Change import `import { ..., OpenBadgeCredential, ..., StatusList2021Entry, ... } from "@/models/credential.model"` to `import { ... } from "@/models/credential.model"` (removing `StatusList2021Entry`).
  - `[x]` Add import `import { OpenBadgeCredential, OB3 } from "@/utils/openbadges-types";`.
  - `[x]` Review usage of `StatusList2021Entry` (likely type casts or object creation) and update to use `OB3.CredentialStatus` or check properties of `OB3.VerifiableCredential`.

---

**File:** `src/services/credential.service.ts`
- **Errors:**
  - `TS2724`: Cannot find `OpenBadgeCredential`.
  - `TS2305`: Cannot find `OpenBadgeAchievement`.
  - `TS2305`: Cannot find `CredentialProof`.
  - `TS2724`: Cannot find `StatusList2021Credential`.
  - `TS2305`: Cannot find `StatusList2021Entry`.
- **Plan:**
  - `[x]` Change import `import { OpenBadgeCredential, OpenBadgeAchievement, CredentialProof, StatusList2021Credential, StatusList2021Entry } from "@/models/credential.model";` to import only necessary guards (e.g., `isStatusList2021Credential`) from `@/models/credential.model`.
  - `[x]` Add `import { OpenBadgeCredential, OpenBadgeAchievement, OpenBadgeProof, OB3, Shared, toIRI } from "@/utils/openbadges-types";`.
  - `[x]` Replace usage of `CredentialProof` with `OpenBadgeProof` (or potentially `OB3.Proof`).
  - `[x]` Replace usage of `StatusList2021Credential` with `OB3.VerifiableCredential` + guard/type checks.
  - `[x]` Replace usage of `StatusList2021Entry` with `OB3.CredentialStatus` + potentially `toIRI` for ID fields.
  - `[x]` Carefully review method bodies (`createCredential`, `signCredential`, `verifySignature`, `createOrUpdateStatusList`, `updateCredentialRevocationStatus`, `checkCredentialRevocationStatus`) to ensure logic aligns with new types (especially where casts like `as unknown as ...` were used). Address `IRI` type mismatches.

---

**File:** `src/utils/badge-baker.ts`
- **Errors:**
  - `TS2724`: Cannot find `OpenBadgeCredential`.
- **Plan:**
  - `[x]` Change import `import { OpenBadgeCredential } from "@/models/credential.model";` to `import { OpenBadgeCredential } from "@/utils/openbadges-types";`.

---

**File:** `src/utils/schema-validation.ts`
- **Errors:**
  - `TS2724`: Cannot find `OpenBadgeCredential`.
  - `TS7006`: Implicit `any` for `ctx` parameter (x2).
  - `TS7030`: Not all code paths return a value. (NEW)
- **Plan:**
  - `[x]` Change import `import { OpenBadgeCredential } from "@/models/credential.model";` to `import { OpenBadgeCredential } from "@/utils/openbadges-types";`.
  - `[x]` Add explicit type `Context` from `hono` to `ctx` parameters: `(ctx: Context) => ...`.
  - `[x]` Review `validate` middleware function to ensure all branches return or call `next()`.

---

**File:** `src/utils/signing/credential.ts`
- **Errors:**
  - `TS2305`: Cannot find `CredentialProof`.
  - `TS2694`: Cannot find `DataIntegrityProof` in namespace `credential.model`.
- **Plan:**
  - `[x]` Remove import `import { CredentialProof } from "@/models/credential.model";`.
  - `[x]` Add import `import { OpenBadgeProof } from "@/utils/openbadges-types";`.
  - `[x]` Replace usage of `CredentialProof` with `OpenBadgeProof` (or `OB3.Proof`).
  - `[x]` Replace cast `as import("@/models/credential.model").DataIntegrityProof` with cast `as OpenBadgeProof` (or `OB3.Proof`).
  - `[x]` Replace usage of `StatusList2021Entry` with `OB3.CredentialStatus`.

---

**File:** `src/utils/test/db-helpers.ts`
- **Errors:**
  - `TS2724`: Cannot find `OpenBadgeCredential`.
- **Plan:**
  - `[x]` Change import `import { OpenBadgeCredential } from "@/models/credential.model";` to `import { OpenBadgeCredential } from "@/utils/openbadges-types";`.

---

**File:** `src/utils/type-check.ts`
- **Errors:**
  - `TS2724`: Cannot find `OpenBadgeCredential`.
  - `TS2305`: Cannot find `DataIntegrityProof`.
- **Plan:**
  - `[x]` Change import `import { OpenBadgeCredential, DataIntegrityProof } from "@/models/credential.model";` to `import { OpenBadgeCredential, OpenBadgeProof } from "@/utils/openbadges-types";`.
  - `[x]` Replace usage of `DataIntegrityProof` with `OpenBadgeProof` (or `OB3.Proof`).

---

**File:** `tests/helpers/test-utils.ts`
- **Errors:**
  - `TS2724`: Cannot find `OpenBadgeCredential`.
  - `TS2305`: Cannot find `DataIntegrityProof`.
- **Plan:**
  - `[x]` Change import `import { OpenBadgeCredential, DataIntegrityProof } from "@/models/credential.model";` to `import { OpenBadgeCredential, OpenBadgeProof } from "@/utils/openbadges-types";`.
  - `[x]` Replace usage of `DataIntegrityProof` with `OpenBadgeProof` (or `OB3.Proof`).

---

**File:** `tests/integration/controllers/integration/issuer-verify.integration.test.ts`
- **Errors:**
  - `TS2322`: String not assignable to `IRI` (x2).
  - `TS2345`: `IssuerJsonLdV2` not assignable to `IssuerJsonLd`.
- **Plan:**
  - `[x]` Add import `import { toIRI } from "@/utils/openbadges-types";`.
  - `[x]` Wrap string literals assigned to `id` and `url` in test data with `toIRI()`.
  - `[x]` Investigate `IssuerJsonLd` type used in `controller.verifyIssuer`. If it's an older/different type, update the test or the controller's expected type to use `IssuerJsonLdV2` from `@/models/issuer.model`. (Likely handled by mock/cast in test)

---

**File:** `tests/integration/controllers/issuer/issuer.controller.integration.test.ts`
- **Errors:**
  - `TS2322`: String not assignable to `IRI` (x2).
  - `TS2345`: `IssuerJsonLdV2` not assignable to `IssuerJsonLd`.
- **Plan:**
  - `[x]` Add import `import { toIRI } from "@/utils/openbadges-types";`.
  - `[x]` Wrap string literals assigned to `id` and `url` in test data with `toIRI()`.
  - `[x]` Investigate `IssuerJsonLd` type used in `controller.verifyIssuer`. If it's an older/different type, update the test or the controller's expected type to use `IssuerJsonLdV2` from `@/models/issuer.model`. (Assumed fixed/handled)

---

**File:** `tests/integration/credential.integration.test.ts`
- **Errors:**
  - `TS2724`: Cannot find `OpenBadgeCredential`.
  - `TS2305`: Cannot find `DataIntegrityProof`.
- **Plan:**
  - `[x]` Change import `import { OpenBadgeCredential, DataIntegrityProof } from "@/models/credential.model";` to `import { OpenBadgeCredential, OpenBadgeProof } from "@/utils/openbadges-types";`.
  - `[x]` Replace usage of `DataIntegrityProof` with `OpenBadgeProof` (or `OB3.Proof`).

---

**File:** `tests/integration/integration/credential.service.integration.test.ts`
- **Errors:**
  - `TS2305`: Cannot find `DataIntegrityProof`.
  - `TS2305`: Cannot find `CredentialProof`.
  - `TS2305`: Cannot find `StatusList2021Entry`.
- **Plan:**
  - `[x]` Remove imports for `DataIntegrityProof`, `CredentialProof`, `StatusList2021Entry` from `@/models/credential.model`.
  - `[x]` Add import `import { OpenBadgeProof, OB3 } from "@/utils/openbadges-types";`.
  - `[x]` Replace usage of `DataIntegrityProof`/`CredentialProof` with `OpenBadgeProof` (or `OB3.Proof`).
  - `[x]` Replace usage of `StatusList2021Entry` with `OB3.CredentialStatus`.

---

**File:** `tests/integration/integration/verification.edge.integration.test.ts` (NEW)
- **Errors:**
  - `TS2693`: 'TestData' only refers to a type, but is being used as a value here.
  - `TS2339`: Property 'set' does not exist on type 'TestData' (x2).
- **Plan:**
  - `[x]` Remove instantiation `new TestData()`.
  - `[x]` Replace `testData.set("issuerId", ...)` with direct access: `testData.issuer.issuerId`.
  - `[x]` Replace `testData.set("badgeId", ...)` with direct access: `testData.badge.badgeId`.

---

**File:** `tests/integration/integration/verification.integration.test.ts` (NEW)
- **Errors:**
  - `TS2693`: 'TestData' only refers to a type, but is being used as a value here.
  - `TS2339`: Property 'set' does not exist on type 'TestData' (x2).
  - `TS2339`: Property 'get' does not exist on type 'TestData' (x6).
- **Plan:**
  - `[x]` Remove instantiation `new TestData()`.
  - `[x]` Replace `testData.set(...)` with direct access: `testData.issuer.issuerId`, `testData.badge.badgeId`.
  - `[x]` Replace `testData.get(...)` with direct access: `testData.badge.badgeId`, `testData.issuer.issuerId`.

---

**File:** `tests/integration/routes/assertions/assertions.routes.integration.test.ts` (NEW)
- **Errors:**
  - `TS2693`: 'TestData' only refers to a type, but is being used as a value here.
  - `TS2339`: Property 'set' does not exist on type 'TestData' (x3).
- **Plan:**
  - `[x]` Remove instantiation `new TestData()`.
  - `[x]` Replace `testData.set(...)` with direct access: `testData.issuer.issuerId`, `testData.badge.badgeId`, `testData.assertion.assertionId`.

---

## 5. Execution Strategy
- Address errors file by file, starting with simple import fixes.
- Focus on `src` directory errors first, then `tests`.
- Run `bun run tsc` after fixing each file (or small group of files) to verify progress and catch cascading errors.
- Address type mismatches (`IRI`, `IssuerJsonLd`) by adjusting data or expected types.
- Fix implicit `any` errors.
- Carefully review logic in `credential.service.ts` methods once imports are stable. 