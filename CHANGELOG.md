# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## 0.0.2-alpha.0 (2025-03-26)


### Features

* add credential schema support for OB3.0 compliance ([d5d0e01](https://github.com/YOUR-USERNAME/bun-badges/commit/d5d0e0160d722efb0f3e1256b56481f7eae65695))
* Add FastBitSet type definitions and credential signing utilities ([393b8c4](https://github.com/YOUR-USERNAME/bun-badges/commit/393b8c4024ac0a1fbe5c0df80d62f75114a022c0))
* Add Open Badges 3.0 implementation documents and testing requirements ([2ff3c3a](https://github.com/YOUR-USERNAME/bun-badges/commit/2ff3c3a1b0595f8eb51793e8ac9d412f3113a774))
* add path aliases for cleaner imports ([ea60801](https://github.com/YOUR-USERNAME/bun-badges/commit/ea60801491d7faf438051a888abaf4b0fbc1d67b))
* **assertion:** implement badge assertion endpoints with hashing and revocation ([e14e3e7](https://github.com/YOUR-USERNAME/bun-badges/commit/e14e3e7afe2c30f8dea8125e9b580638199a774d))
* **auth:** add code generation and rate limiting utilities ([2e0b025](https://github.com/YOUR-USERNAME/bun-badges/commit/2e0b025fe7ff0400bfd1312f46b79630124a51c5))
* **auth:** add code verification endpoint ([1e31587](https://github.com/YOUR-USERNAME/bun-badges/commit/1e3158737b04b46490c6711598de86c3d9ef2fc9))
* **auth:** add JWT token generation for code verification ([5acbdf2](https://github.com/YOUR-USERNAME/bun-badges/commit/5acbdf23d9d024ced0985ee6364f3098f4bc336a))
* **auth:** add JWT verification middleware ([c8cd1e6](https://github.com/YOUR-USERNAME/bun-badges/commit/c8cd1e6ed3be7e34f3ccf6f95956241619744186))
* **auth:** add token refresh functionality with separate access and refresh tokens ([2709d4c](https://github.com/YOUR-USERNAME/bun-badges/commit/2709d4ca1c5ee5e24cc74fc7e05f9bd3bcd8fa1c))
* **auth:** add token revocation endpoint ([d1de9d3](https://github.com/YOUR-USERNAME/bun-badges/commit/d1de9d37939bc3bc8a32095d42dc4ac68edb42e0))
* **auth:** add token revocation endpoint ([789796d](https://github.com/YOUR-USERNAME/bun-badges/commit/789796d968b7cddb8d57eb9315ee79999be7ab75))
* **auth:** enhance authorization middleware and routes ([2ff9b17](https://github.com/YOUR-USERNAME/bun-badges/commit/2ff9b171e461455e8cb0d088709b0d597b29d9fd)), closes [#002](https://github.com/rollercoaster-dev/bun-badges/issues/002)
* **auth:** implement auth middleware for API endpoints ([7159a9a](https://github.com/YOUR-USERNAME/bun-badges/commit/7159a9a744842a4985d217628146c727c45dd9ba))
* **auth:** implement code request endpoint ([2e7140d](https://github.com/YOUR-USERNAME/bun-badges/commit/2e7140d03fc6331d237dcd5df7eed947a4215f79))
* **auth:** implement database storage for codes and tokens ([987f42b](https://github.com/YOUR-USERNAME/bun-badges/commit/987f42b0cead8352b6929df7592d842d975cae97))
* **auth:** implement enhanced authentication middleware ([1f289d4](https://github.com/YOUR-USERNAME/bun-badges/commit/1f289d43aa9a96419edf4ae496f7266fc3a5ce7b)), closes [#002](https://github.com/rollercoaster-dev/bun-badges/issues/002)
* **auth:** implement missing authentication endpoints for E2E tests ([8e7fadd](https://github.com/YOUR-USERNAME/bun-badges/commit/8e7faddc9b02b8c95e04973407cb47206277d99b))
* **badge:** implement badge baking functionality ([8a6dea6](https://github.com/YOUR-USERNAME/bun-badges/commit/8a6dea63bcb43d7923d735e5152b101120eb5034))
* **badge:** implement badge class endpoints with CRUD operations ([e2b6250](https://github.com/YOUR-USERNAME/bun-badges/commit/e2b625032f2da2f77ad9c72d098424c740f8fa28))
* **badge:** update badge system for OB 3.0 ([639211f](https://github.com/YOUR-USERNAME/bun-badges/commit/639211fc82f0a9390813f31bd1f9bff5440b1b98)), closes [#001](https://github.com/rollercoaster-dev/bun-badges/issues/001)
* **build:** introduce custom build script and optimize Docker configurations ([f69f49a](https://github.com/YOUR-USERNAME/bun-badges/commit/f69f49a1d42a9926a0ece921c6be359536e4f9da))
* **ci:** enhance CI test setup and configuration ([ed83914](https://github.com/YOUR-USERNAME/bun-badges/commit/ed83914549b7f7cd7192bd2560af3d4fe52b9ec1))
* **ci:** enhance CI/CD test environment configuration ([c045c2c](https://github.com/YOUR-USERNAME/bun-badges/commit/c045c2c9fb4300b443bdeb068446a54b8adec86f))
* Consolidate testing tasks and improve test runner ([fe5dd5f](https://github.com/YOUR-USERNAME/bun-badges/commit/fe5dd5fe811d498c0b2edf79b6b2a3aa19cc6303))
* **db:** add postgresql docker configuration ([a1967c9](https://github.com/YOUR-USERNAME/bun-badges/commit/a1967c9f4a71ce5c48b84d5f5d72dcca426e26fb))
* **db:** add schema support for OB 3.0 ([5a6a445](https://github.com/YOUR-USERNAME/bun-badges/commit/5a6a445b43f2ac43787d64cde39c7f7830dba56a)), closes [#001](https://github.com/rollercoaster-dev/bun-badges/issues/001)
* **db:** implement postgresql schema and migrations ([62997ed](https://github.com/YOUR-USERNAME/bun-badges/commit/62997ed0160e496341b430fb27a3801d0a93fec8))
* **db:** upgrade drizzle-orm to 0.41.0 and add PostgreSQL environment comparison utility ([3d7b2dc](https://github.com/YOUR-USERNAME/bun-badges/commit/3d7b2dcdf32fbd9cafba62d148a300a5519ee67a))
* **deployment:** add Docker configuration for development and production ([a1eb619](https://github.com/YOUR-USERNAME/bun-badges/commit/a1eb619c74adc781e1fa07654c28883407c76f88))
* **docker:** enhance development and production setup with improved scripts and configurations ([a885f75](https://github.com/YOUR-USERNAME/bun-badges/commit/a885f7567410edac0ecb01ecee8c01dcd4ad8f37))
* **docs:** add OpenAPI/Swagger UI for API documentation ([574cd13](https://github.com/YOUR-USERNAME/bun-badges/commit/574cd13e45c1f603003602fa9b4c490b8021eaff))
* Enhance credential signing and verification utilities for Open Badges 3.0 ([24ed00c](https://github.com/YOUR-USERNAME/bun-badges/commit/24ed00c9b38f4bd7da87e687aaf03e9105dcbc9b))
* Implement HTTPS support and update configurations ([3dd9598](https://github.com/YOUR-USERNAME/bun-badges/commit/3dd95980cc56c235a3f7f38dd9c31d172c6dc6f1))
* Implement Open Badges 3.0 components ([a3693ed](https://github.com/YOUR-USERNAME/bun-badges/commit/a3693ed57be8f36e7e670a3e345086b2205a2fc1))
* Implement Open Badges 3.0 standard ([dc0ffab](https://github.com/YOUR-USERNAME/bun-badges/commit/dc0ffab0070a0272f0c0fdb5cf2084f6133acb59))
* initial project setup for Bun Badges ([ce327b8](https://github.com/YOUR-USERNAME/bun-badges/commit/ce327b80ca3e4224f61ec739ece3ee66c88f2285))
* Initialize Bun Badges project ([c4b5c0d](https://github.com/YOUR-USERNAME/bun-badges/commit/c4b5c0d430a893c6053231969196b80b57f84a41))
* Initialize Bun Badges project ([f8bc620](https://github.com/YOUR-USERNAME/bun-badges/commit/f8bc620f029444b4c0baa0b1fea96f4a7e90701c))
* Initialize Bun Badges project exploration ([cca9753](https://github.com/YOUR-USERNAME/bun-badges/commit/cca97533861f68ce4a2996ac703bd81e7b75fc9d))
* Initialize Open Badges 3.0 implementation ([78747da](https://github.com/YOUR-USERNAME/bun-badges/commit/78747da254a744e34bef41cd9cf1f3fa62412807))
* Initialize project and examine test database task ([e13b9f4](https://github.com/YOUR-USERNAME/bun-badges/commit/e13b9f4f4bfc3f13f9b523d585057b2af60ff600))
* initialize project structure and core files ([513f5d1](https://github.com/YOUR-USERNAME/bun-badges/commit/513f5d13c309e11c0d09b758938485538c7800f1))
* Introduce TypeScript configuration for source and test files ([fb05842](https://github.com/YOUR-USERNAME/bun-badges/commit/fb05842948e8d2936224a4e31da1d69dfb2e14ba))
* **issuer:** add OB 3.0 support to issuer management ([66c6552](https://github.com/YOUR-USERNAME/bun-badges/commit/66c6552db38c7c38b5a8dc898646f012d86ff45a)), closes [#001](https://github.com/rollercoaster-dev/bun-badges/issues/001)
* **issuer:** implement issuer management functionality ([85efbee](https://github.com/YOUR-USERNAME/bun-badges/commit/85efbee5ffd05d5d7bec4c43e035213718843794)), closes [#01](https://github.com/rollercoaster-dev/bun-badges/issues/01)
* **oauth:** add scope validation and API documentation ([2c15fc3](https://github.com/YOUR-USERNAME/bun-badges/commit/2c15fc3ef3fcadbba54c97991dd71db44db1d8a9))
* **oauth:** add tests and example client ([6910eb3](https://github.com/YOUR-USERNAME/bun-badges/commit/6910eb3954385312acfac3c799bd5386e2fdf146))
* **oauth:** implement authorization, token, introspection, and revocation endpoints ([5510a9a](https://github.com/YOUR-USERNAME/bun-badges/commit/5510a9a1b49b09c118f8a8eb5d74d78478eef73d))
* **oauth:** implement client registration endpoint ([bc792c0](https://github.com/YOUR-USERNAME/bun-badges/commit/bc792c0eda54680ba3a74ae2462b66c5ef6e4ad7))
* **oauth:** implement OAuth foundation ([7668528](https://github.com/YOUR-USERNAME/bun-badges/commit/7668528ce6b66e4723b889924993b6a8cf6519a1))
* **release:** add versioning and changelog management ([da41059](https://github.com/YOUR-USERNAME/bun-badges/commit/da41059e565eb692beef7c1962439baccdeb90e3))
* **routes:** add badge baking endpoints ([356572a](https://github.com/YOUR-USERNAME/bun-badges/commit/356572a9ff27fdd798942a52c9b473ed90c0a9c0))
* **setup:** initialize project with Bun and Hono ([f3bdff3](https://github.com/YOUR-USERNAME/bun-badges/commit/f3bdff374c46a3853aa401213518c4d6ad83d401))
* **test:** add schema validation and fix test helpers ([a9c3dc7](https://github.com/YOUR-USERNAME/bun-badges/commit/a9c3dc7d19145e724ab7fea30c896905f61c8df7))
* **test:** add test migration scripts for co-location ([4165ec1](https://github.com/YOUR-USERNAME/bun-badges/commit/4165ec1968fc29ad9f7a562c94f9a149648a6bc4))
* **test:** implement E2E testing infrastructure for badge flow ([a3528df](https://github.com/YOUR-USERNAME/bun-badges/commit/a3528df24422904a346b4eed4d5f611083626e79))
* **test:** improve test runner for individual files and update pre-commit hook ([e4b940c](https://github.com/YOUR-USERNAME/bun-badges/commit/e4b940c245ad9a2acb575396fc99658554665b30))
* **testing:** refactor e2e tests ([51d086b](https://github.com/YOUR-USERNAME/bun-badges/commit/51d086b18accfc228b4607ac9d46af49d5017c5a))
* **tests:** enhance integration test framework and fix database interactions ([d1b28f6](https://github.com/YOUR-USERNAME/bun-badges/commit/d1b28f61af9ddecaa6a79e95b46ba2129d5374a0))
* **tests:** enhance testing capabilities and improve credential service error handling ([abdb3ac](https://github.com/YOUR-USERNAME/bun-badges/commit/abdb3acadaf15809cfd4452fb8f87b38089eadd2))
* **tests:** initiate E2E test refactoring for OB3 compliance ([1e354f8](https://github.com/YOUR-USERNAME/bun-badges/commit/1e354f81484b97a7c297d845c3f4c334da626d5d))
* **tests:** restructured tests ([a30455f](https://github.com/YOUR-USERNAME/bun-badges/commit/a30455fee545da8fe7a5b8a85abf8f98eeb20a8a))
* **tests:** streamline test structure and enhance TypeScript support ([ee8354f](https://github.com/YOUR-USERNAME/bun-badges/commit/ee8354f7d003e26612cbd372145d10c230637096))
* **validation:** add OB3 credential schema validation ([4415a4f](https://github.com/YOUR-USERNAME/bun-badges/commit/4415a4f19a7b6171ede8a471694ee339c95e5978))
* **verify:** implement JSON-LD credential signing and verification ([facec43](https://github.com/YOUR-USERNAME/bun-badges/commit/facec43c9a62cfee055b5b0fa3a84849a23a6749))


### Bug Fixes

* Address failing tests across the project ([f0594a0](https://github.com/YOUR-USERNAME/bun-badges/commit/f0594a0df0a66ef9d5b9877aadf8acba508b0e9d))
* **api:** add UUID validation to assertions endpoints to return 404 for invalid IDs ([a22009c](https://github.com/YOUR-USERNAME/bun-badges/commit/a22009cb40e45676fe3267288629534b8e4dab7d))
* **auth:** add explicit return type to auth middleware ([207840c](https://github.com/YOUR-USERNAME/bun-badges/commit/207840c3f1367e404ec053388b71e6cc312bfa39))
* **build:** set build target to bun ([6a52844](https://github.com/YOUR-USERNAME/bun-badges/commit/6a528448f810659ed8e136ba17a133d855e870ee))
* changed typecheck to tsc ([bb17b33](https://github.com/YOUR-USERNAME/bun-badges/commit/bb17b339e7c4f76c6b78ae913dbabad2a25114da))
* **ci:** add database table listing step in CI workflow ([5264318](https://github.com/YOUR-USERNAME/bun-badges/commit/526431822c80146f2f9f763acbd71cc9e1b76c39))
* **ci:** add wait step for database schema application in CI workflow ([4407f51](https://github.com/YOUR-USERNAME/bun-badges/commit/4407f51daa87fb9db99360fb54d6d84751a0fb56))
* **ci:** enhance database connection management for tests ([6641c66](https://github.com/YOUR-USERNAME/bun-badges/commit/6641c662cf21f4067ff6a0823867f413577361d2))
* **ci:** improve ci workflow and database setup ([b0c223c](https://github.com/YOUR-USERNAME/bun-badges/commit/b0c223c0aae150526b7d64993ea9fda4e740330f))
* **ci:** properly use real database in CI tests ([b62d64a](https://github.com/YOUR-USERNAME/bun-badges/commit/b62d64a9599c6f9b404e88ab4c8502b5188f8d75))
* **ci:** streamline database setup in CI process ([5e8e83a](https://github.com/YOUR-USERNAME/bun-badges/commit/5e8e83ab1937a6c49cc7d472d5a9745f22722202))
* **ci:** update database migration command in CI workflow ([6cf4d6e](https://github.com/YOUR-USERNAME/bun-badges/commit/6cf4d6e0f4514ff2c081915efe0c35c963a4ba18))
* **config:** change default port to 6669 ([a94429b](https://github.com/YOUR-USERNAME/bun-badges/commit/a94429be35ac547a959e027402df2b28f7ccc5a7))
* **db:** add missing evidence_url column to badge_assertions table ([c97d7c2](https://github.com/YOUR-USERNAME/bun-badges/commit/c97d7c2ca3a655d9fd4605d11242305e9527070e))
* **db:** add missing evidence_url column to badge_assertions table ([a6df39c](https://github.com/YOUR-USERNAME/bun-badges/commit/a6df39cf8aa7e1523d951fa95e2fc7613e512e4a))
* **db:** add missing evidence_url column to badge_assertions table ([fe630cb](https://github.com/YOUR-USERNAME/bun-badges/commit/fe630cbcdd9c1861144cfe74c31b3c3008b9dc0a))
* **db:** add missing evidence_url column to badge_assertions table ([0049cd0](https://github.com/YOUR-USERNAME/bun-badges/commit/0049cd07e6fe59540b9b3037a113e99bdee91d40))
* **db:** add missing evidence_url column to badge_assertions table ([15cd216](https://github.com/YOUR-USERNAME/bun-badges/commit/15cd21677963cad6fa67f1e7ce0524b236fb1e2c))
* **db:** improve database setup for CI tests ([a4ead5e](https://github.com/YOUR-USERNAME/bun-badges/commit/a4ead5e87b3087e162996dfef8ee993d0ea71e65))
* **db:** resolve jsonb handling in drizzle-orm 0.41.0 ([8fd0293](https://github.com/YOUR-USERNAME/bun-badges/commit/8fd0293a6f811d84598d6627f5dd8a030b8553ee))
* **db:** update test DB connection to port 5434 ([6b42f16](https://github.com/YOUR-USERNAME/bun-badges/commit/6b42f1641fed947c4672b36279a300a838dc819b))
* **husky:** update test commands ([fc3643f](https://github.com/YOUR-USERNAME/bun-badges/commit/fc3643fe40b4efeea3d0e86edab496ae26945c1f))
* lint ([4830263](https://github.com/YOUR-USERNAME/bun-badges/commit/483026334a25b2c10aaa3687ffacd04367e5f0f4))
* **migration:** add CI environment check to skip migration ([ed1ad9c](https://github.com/YOUR-USERNAME/bun-badges/commit/ed1ad9cfd8a415c520801599622e8ce0f688c578))
* repair failing verification and signing tests ([a61d617](https://github.com/YOUR-USERNAME/bun-badges/commit/a61d6170277e0c4c4d244ad8137e562e06ec744d))
* resolve all failing tests in the project ([0f4ca96](https://github.com/YOUR-USERNAME/bun-badges/commit/0f4ca96e8e81d2de736154cd3533fc763538e499))
* resolve database connection issues in CI integration tests ([45e0ca2](https://github.com/YOUR-USERNAME/bun-badges/commit/45e0ca278b8be67aa7a6148cb73d488d5360ec75))
* resolve failing integration tests ([afa8ff3](https://github.com/YOUR-USERNAME/bun-badges/commit/afa8ff338e91155b944289182fffd92aa54293f2))
* resolve failing tests in bun-badges project ([db3d8b6](https://github.com/YOUR-USERNAME/bun-badges/commit/db3d8b6d716ae910622c607d70b8cee27f996984))
* resolve failing tests in the test suite ([982d0f0](https://github.com/YOUR-USERNAME/bun-badges/commit/982d0f00beb83a4105c5a86358592d7d5d4d2396))
* resolve test failures in integration tests ([2e97a49](https://github.com/YOUR-USERNAME/bun-badges/commit/2e97a49c30ba42a661d62b90c043ffae26485f9b))
* resolve test failures in the project ([867ab0a](https://github.com/YOUR-USERNAME/bun-badges/commit/867ab0aaf6e07dc0b5c08f59069634452e04b3f0))
* **schema:** resolve circular dependencies in database schema files ([be393b4](https://github.com/YOUR-USERNAME/bun-badges/commit/be393b415ed4f3523302ba741269244091e08745))
* **server:** resolve server startup conflicts by removing explicit serve call ([bddeae1](https://github.com/YOUR-USERNAME/bun-badges/commit/bddeae19cda4bf80451a99d67623c5002fe9d421))
* **test:** add db-config-patch for E2E tests ([f1fa55a](https://github.com/YOUR-USERNAME/bun-badges/commit/f1fa55abeb863e41cf52d94aac75fd3d5d9c5f18))
* **test:** add missing createMockContext export to db-helpers ([bb9b165](https://github.com/YOUR-USERNAME/bun-badges/commit/bb9b1655cc392f6d449f1127824c95e18d41ba94))
* **test:** create explicit unit test script to avoid running integration tests ([95a81ec](https://github.com/YOUR-USERNAME/bun-badges/commit/95a81ecbed15d04965ab7c465aec660bfaded86b))
* **test:** fix circular import in schema files ([6103fd5](https://github.com/YOUR-USERNAME/bun-badges/commit/6103fd547de3c6419026636454d9fa912e51d39b))
* **test:** fix path handling in test-unit.sh script ([3c8973a](https://github.com/YOUR-USERNAME/bun-badges/commit/3c8973aba95baf4311f2b10a5a64a44a67fd6cf0))
* **test:** fix TypeScript errors in test utilities and routes ([eae2a11](https://github.com/YOUR-USERNAME/bun-badges/commit/eae2a111f9b118396db1a709c78f62e774c39874))
* **test:** implement proper mocking for Ed25519 cryptography in tests ([48ee486](https://github.com/YOUR-USERNAME/bun-badges/commit/48ee486cd52580c5750528d7a370fd68a6e1368d))
* **test:** improve unit test script to handle missing directories ([289a85a](https://github.com/YOUR-USERNAME/bun-badges/commit/289a85a69365b666cc1330cd1ee1a7877b033da7))
* **test:** improve unit test script to properly exclude integration tests ([c5effad](https://github.com/YOUR-USERNAME/bun-badges/commit/c5effad9b18ead42fa2728ef976a41b83b72a41f))
* **test:** mark failing SQL tests as todo with detailed docs ([e6e4dc9](https://github.com/YOUR-USERNAME/bun-badges/commit/e6e4dc99ad38e04d23ccbcd78864167a1d031c12))
* **test:** resolve E2E test failures and create OB3 compliance test plan ([1eb3a55](https://github.com/YOUR-USERNAME/bun-badges/commit/1eb3a5552f398bd09729eabd39fa2bf063144010))
* **tests:** correct TypeScript usage of testDb function in integration tests ([1dcd11b](https://github.com/YOUR-USERNAME/bun-badges/commit/1dcd11b6e9370df87dd30141a0c5a4f867cd1cee))
* **tests:** enhance mock implementation for drizzle-orm/pg-core to support integration tests ([46f86ea](https://github.com/YOUR-USERNAME/bun-badges/commit/46f86ea28cef6f8cea68db0a21db2394bb792e01))
* **tests:** enhance test data cleanup and SQL query handling in integration tests ([1515259](https://github.com/YOUR-USERNAME/bun-badges/commit/15152592f770ac706b09dc66b3d8a5c376657f09))
* **tests:** improve mock implementation for drizzle-orm/pg-core to resolve jsonb export issue ([953501b](https://github.com/YOUR-USERNAME/bun-badges/commit/953501bc42d5ccb81dcb3471cc94bbd7ddc2de4a))
* **tests:** integration tests ([1a161ef](https://github.com/YOUR-USERNAME/bun-badges/commit/1a161eff0245d020a239a498b38ea1b78c865973))
* **tests:** make docker-compose commands compatible with CI environment ([92a2417](https://github.com/YOUR-USERNAME/bun-badges/commit/92a24175ec6c347a4c487d5255222ad906799a39))
* **test:** update generateToken call in auth middleware test ([c7ee373](https://github.com/YOUR-USERNAME/bun-badges/commit/c7ee373d07f58817b291d255dbd0f1f2fee05b6b))
* **test:** update husky pre-push hook to ignore test failures ([b008af2](https://github.com/YOUR-USERNAME/bun-badges/commit/b008af249ae67f897832b6a6cd62c5f8f7b2be4f))
* **test:** update husky pre-push hook to run unit tests only ([e5f8bb6](https://github.com/YOUR-USERNAME/bun-badges/commit/e5f8bb64c404c5b5161f5ad11dbab100336137e4))
* **test:** update issuer controller tests with proper mocking ([8d3c6fc](https://github.com/YOUR-USERNAME/bun-badges/commit/8d3c6fc219a2e833aa181080222006a3de2a34f0))
* **test:** update schema exports and fix verification integration tests ([67bae8a](https://github.com/YOUR-USERNAME/bun-badges/commit/67bae8a5732682a3fe62639c91e6936bb72deb64))
* **test:** update test environment configuration and enhance mock context functionality ([d73ede6](https://github.com/YOUR-USERNAME/bun-badges/commit/d73ede623bb338c8c8fef2b0549e3900c4313ffe))
* **test:** update test integration script with correct paths ([53e98b9](https://github.com/YOUR-USERNAME/bun-badges/commit/53e98b96e312b10638be09ab2b8e4b67bbb0f168))
* **test:** update test utilities and fix middleware tests ([37bcd53](https://github.com/YOUR-USERNAME/bun-badges/commit/37bcd534da006816adf97e4aa5d59187dee6a502))
* **test:** use hardcoded middleware for auth token test ([e9ed399](https://github.com/YOUR-USERNAME/bun-badges/commit/e9ed399b1cf928e2f20c3ab2487fe9c585bc07da))
* tsy & lint ([327608f](https://github.com/YOUR-USERNAME/bun-badges/commit/327608fda1c65e65a882636881ae3d0fa6899308))
* type errors in typescript code ([64e2655](https://github.com/YOUR-USERNAME/bun-badges/commit/64e26554831efe57192949d3e1df288a85f7006d))
* typescript & linting ([557691f](https://github.com/YOUR-USERNAME/bun-badges/commit/557691f18f33666d9a3734313bad5a9a57ff31cc))


### Chores

* add workspace configuration and agent files ([e621737](https://github.com/YOUR-USERNAME/bun-badges/commit/e621737518c124545c1ce96ddc8889afe6a273fd))
* **config:** reorganize task files with consistent numbering ([399403e](https://github.com/YOUR-USERNAME/bun-badges/commit/399403eb92a1e5a675b6e35432cc52b5d1b1a6ef)), closes [#001](https://github.com/rollercoaster-dev/bun-badges/issues/001)
* **config:** update pre-commit hook to run but not block commits ([ff01654](https://github.com/YOUR-USERNAME/bun-badges/commit/ff01654a60ba32ac9465f807776f6acbb3d35d66))
* **config:** update project configuration and docs ([5b3ef61](https://github.com/YOUR-USERNAME/bun-badges/commit/5b3ef6171333d5bde3fb37f913f9f49f2f65ca80)), closes [#001](https://github.com/rollercoaster-dev/bun-badges/issues/001)
* **deps:** add @hono/swagger-ui for API documentation ([f5d94ac](https://github.com/YOUR-USERNAME/bun-badges/commit/f5d94ac5391147f70842b1883e2f75816ad49e94))
* **deps:** add bun lock file and remove old index ([5a44ea5](https://github.com/YOUR-USERNAME/bun-badges/commit/5a44ea570b848552c113887362e68b1d8b07581a))
* **deps:** add image processing dependencies ([be15416](https://github.com/YOUR-USERNAME/bun-badges/commit/be15416a4425b91455d0f1976dedef538ec6e9a4))
* **dev:** add git hooks for typecheck and tests ([d11a10a](https://github.com/YOUR-USERNAME/bun-badges/commit/d11a10a544a24e96a840aea28a531734d9815f75))
* explore project for E2E testing setup ([e2ea996](https://github.com/YOUR-USERNAME/bun-badges/commit/e2ea996cf979e710e6b06e9528e7c8b110384e8c))
* mark task 9 for testing and CI/CD as completed ([056be14](https://github.com/YOUR-USERNAME/bun-badges/commit/056be14f45d5fe147070443f7ccdf841ec539e8a))
* move completed tasks and update tests ([2acd555](https://github.com/YOUR-USERNAME/bun-badges/commit/2acd55502d3e3eede0f1ed1b4954b9aeea3143b8))
* remove completed tasks from todo folder ([8b2a32f](https://github.com/YOUR-USERNAME/bun-badges/commit/8b2a32f3232748df61ea09ba8a1f7732d1d2ac2e))
* remove old task file ([5b50979](https://github.com/YOUR-USERNAME/bun-badges/commit/5b509794dae6b8e8b765601fd2ddd8bead3146c8))
* remove temporary file ([48b045b](https://github.com/YOUR-USERNAME/bun-badges/commit/48b045b6deaa01a5456f11773958c7171830d991))
* **tasks:** move badge baking task to completed ([febffe5](https://github.com/YOUR-USERNAME/bun-badges/commit/febffe5c8966d992b880cb2693ac048496ebe6e7))
* **tasks:** move deployment config task to completed ([1089e9b](https://github.com/YOUR-USERNAME/bun-badges/commit/1089e9b93fdb4bb7d7900f7a0d0c5f1a915aacfe))
* **tasks:** move passwordless auth to completed ([6af9081](https://github.com/YOUR-USERNAME/bun-badges/commit/6af9081ac77432913e542a7e916cbd8cb5ba241e))
* update task progress and add jose dependency ([411b6b8](https://github.com/YOUR-USERNAME/bun-badges/commit/411b6b8e08ac5497a48b47a2cd855efdd12d78fc))


### Documentation

* add API documentation section to README ([eae4898](https://github.com/YOUR-USERNAME/bun-badges/commit/eae48983fce1f18e8669c8e4e16fa2ebe77e5d83))
* Add Open Badges 2.0 research and OB2 vs OB3 comparison ([3e19145](https://github.com/YOUR-USERNAME/bun-badges/commit/3e19145b611e7a785a0bc66cd235f5540a01de90))
* **auth:** simplify authentication approach ([85e66e5](https://github.com/YOUR-USERNAME/bun-badges/commit/85e66e50637200cb1085780d405305f96e1fcb21))
* **config:** add metadata to cursor rules files ([daf4eb4](https://github.com/YOUR-USERNAME/bun-badges/commit/daf4eb4653b4b42285587b8de8599c5ec9d7c039))
* fix CI badge URLs in README ([5b16c2f](https://github.com/YOUR-USERNAME/bun-badges/commit/5b16c2f5794788ee0e3c2649efa4eede1b3516b9))
* **git:** add commit message convention rule ([390bc73](https://github.com/YOUR-USERNAME/bun-badges/commit/390bc7393006b8fc16ff675d44e552f81a2e9765))
* **rules:** add cursor development rules ([82e5a41](https://github.com/YOUR-USERNAME/bun-badges/commit/82e5a4150d21d791653e58c7f2968d67ff0fed3f))
* **tasks:** add remaining task files ([d8347f6](https://github.com/YOUR-USERNAME/bun-badges/commit/d8347f6f9baa8282f10b20721546b57b665a7490))
* **tasks:** mark environment setup task as complete ([5eaa848](https://github.com/YOUR-USERNAME/bun-badges/commit/5eaa84864ed00f9fd633456598561f47a6af7327))
* **tasks:** mark OB spec research task as complete ([149bce8](https://github.com/YOUR-USERNAME/bun-badges/commit/149bce82044d403fa6193dd753f056bc03274923))
* **tasks:** update authorization and testing documentation ([dd4e790](https://github.com/YOUR-USERNAME/bun-badges/commit/dd4e790311629d254236fd6a32402eaaffb184e3)), closes [#002](https://github.com/rollercoaster-dev/bun-badges/issues/002)
* **test:** add test reorganization templates and reports ([7285fa9](https://github.com/YOUR-USERNAME/bun-badges/commit/7285fa9861c413723038b9a775f9bc2ab6f12765))
* **testing:** updated the cursor testing rules ([d8010b2](https://github.com/YOUR-USERNAME/bun-badges/commit/d8010b251393dbadf0e9ab5b957cfaf03fab9ed7))
* **test:** update test documentation with bun commands ([93b5e00](https://github.com/YOUR-USERNAME/bun-badges/commit/93b5e00dc60496235ef21758f5b1ae99bec9c508))
* **test:** update test inventory and organization task tracking ([e5292a8](https://github.com/YOUR-USERNAME/bun-badges/commit/e5292a823126ec1ae25c28032815e4b27ea91007))
* **test:** update test inventory and organization tracking ([a249cd8](https://github.com/YOUR-USERNAME/bun-badges/commit/a249cd8e2bb108c5b48ac48c95d4fd30aedda0ae))
* **test:** update test organization with remaining unit tests to migrate ([c181291](https://github.com/YOUR-USERNAME/bun-badges/commit/c181291dbd8da62885238667a62db33fd20568b5))
* update API documentation for badge baking ([85ca9b3](https://github.com/YOUR-USERNAME/bun-badges/commit/85ca9b3a13b33ed6bc24b4204e98c4dba343da70))


### Refactors

* **badge:** centralize context URLs in constants file ([592f6cf](https://github.com/YOUR-USERNAME/bun-badges/commit/592f6cf59b472950aa87c650c098f7c655d009e3))
* **ci:** streamline database configuration and test setup ([8e48955](https://github.com/YOUR-USERNAME/bun-badges/commit/8e48955179eb57fef469767c7feed7585237dc97))
* **ci:** update test workflow to separate unit, integration, and e2e tests ([0e04efa](https://github.com/YOUR-USERNAME/bun-badges/commit/0e04efae8df00902f4b7fd20a0e31ebfa6bc0313))
* **db:** update schema to improve badge and issuer handling ([340a4c5](https://github.com/YOUR-USERNAME/bun-badges/commit/340a4c53a259acfafa61f8086757314f64f42e60))
* Enhance type safety by replacing 'any' with specific types across the codebase ([b75d0ca](https://github.com/YOUR-USERNAME/bun-badges/commit/b75d0ca0fed3cd92944dff114439bcd2a5ee7e6e))
* Improve error handling and type safety in credential verification ([55d7362](https://github.com/YOUR-USERNAME/bun-badges/commit/55d7362dfd775df7ccffa4e0ab7980b82a765ea7))
* Remove package-lock.json and enhance credential verification logic ([a15cba1](https://github.com/YOUR-USERNAME/bun-badges/commit/a15cba1f6bb2fc5822c02679991055be88f69353))
* remove unused variables and fix TypeScript errors ([62c31cf](https://github.com/YOUR-USERNAME/bun-badges/commit/62c31cfbcbb4edce106c3e297192a24140b55e8b))
* Replace 'any' type with specific types in mock database and error handler ([9c85cbc](https://github.com/YOUR-USERNAME/bun-badges/commit/9c85cbc5282bba2709c796c7cd02bbc367c6bb8b))
* restructure test files to fix type issues ([ac3fffc](https://github.com/YOUR-USERNAME/bun-badges/commit/ac3fffc3cffc7f78a29c247b4d8892d591f9e53c))
* **test:** modernize test suite architecture ([788466b](https://github.com/YOUR-USERNAME/bun-badges/commit/788466b6f5f13cdd36fe8beba6919671c645a9cc))
* **test:** remove redundant unit tests replaced by integration tests ([75fc9ff](https://github.com/YOUR-USERNAME/bun-badges/commit/75fc9ffd9b698372f30509eb1f03a8756fe0d208))
* **test:** reorganize test files into proper directories ([aae98b7](https://github.com/YOUR-USERNAME/bun-badges/commit/aae98b745e39df06a4804ae65c18c91df895e22e))
* **test:** reorganize test structure and cleanup scripts ([a9c1708](https://github.com/YOUR-USERNAME/bun-badges/commit/a9c17084f533149174713d5c72a52e2eb90ae7e7))
* **verify:** improve type safety in credential signing ([d97f11e](https://github.com/YOUR-USERNAME/bun-badges/commit/d97f11e27b4eea69ea8938d212b57830e1cd7877))


### Tests

* Add integration test framework with PostgreSQL in Docker ([a466d67](https://github.com/YOUR-USERNAME/bun-badges/commit/a466d6771f27bcf7d2b803071030c22b81af5e29))
* **assertions:** add UUID validation tests ([0714c6d](https://github.com/YOUR-USERNAME/bun-badges/commit/0714c6d2e7c65641202129a47d68a05c7e23eea5))
* **auth:** fix integration tests for auth controller ([47a3bde](https://github.com/YOUR-USERNAME/bun-badges/commit/47a3bdec02b311b00e11603c6aa16abb3018e673))
* **badge:** add tests for badge and assertion endpoints ([aff5015](https://github.com/YOUR-USERNAME/bun-badges/commit/aff50157adf1bbdc2e0f5df124f9c233337495d7))
* fix all test failures in auth controller and route tests ([2572dea](https://github.com/YOUR-USERNAME/bun-badges/commit/2572deaf09c70b00e852b9a045df6fae83fee3b1))
* improve test mocking and fix token verification in tests ([3f6ca8b](https://github.com/YOUR-USERNAME/bun-badges/commit/3f6ca8b31446469ca3c977ee905c4e90069afb51))
* **issuer:** improve mock database setup for controller tests ([8808c1b](https://github.com/YOUR-USERNAME/bun-badges/commit/8808c1b024d2c8db4abfc42fee28ca60d9d54b52)), closes [#002](https://github.com/rollercoaster-dev/bun-badges/issues/002)
* **routes:** add issuer routes tests and test utilities ([8b06555](https://github.com/YOUR-USERNAME/bun-badges/commit/8b06555278abd21cf8f080776a7dabc2c3974962)), closes [#002](https://github.com/rollercoaster-dev/bun-badges/issues/002)
* **verify:** fix credential signing tests and add schema validation tests ([27647f4](https://github.com/YOUR-USERNAME/bun-badges/commit/27647f42aa4a589063370c50d71da3a5fa67276a))
* **verify:** fix ob3 compliance e2e tests ([7a64f80](https://github.com/YOUR-USERNAME/bun-badges/commit/7a64f805b089f4c299638c8970c3b7a6b371e8c2))
* **verify:** remove credential.service unit test after migration ([44932f4](https://github.com/YOUR-USERNAME/bun-badges/commit/44932f4e14ed32632af9857b794c7e82cd82a021))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of Open Badges server
- Badge issuance and verification flows
- OAuth-based authentication
- Docker-based deployment
- Documentation for setup and usage

### Fixed
- TypeScript and ESLint configuration
- Database service issues
- OAuth controller issues
- Credential utilities issues

### Changed
- Improved test structure and isolation
- Enhanced signing test reliability

[Unreleased]: https://github.com/YOUR-USERNAME/bun-badges/compare/v0.0.1...HEAD 