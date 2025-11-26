# Changelog

## [1.3.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.2.5...v1.3.0) (2025-11-26)


### Features

* add BlinkTrack logo and icons for all platforms ([2ebf7d1](https://github.com/Benedict-Carling/eyeryhthm/commit/2ebf7d1f229ae9ef4504d1042a1c950195b58cd5))
* bundle MediaPipe assets locally for offline support ([c1f38da](https://github.com/Benedict-Carling/eyeryhthm/commit/c1f38da9b711e51094feffb2dd1fbe3ef02b8ea7))
* bundle MediaPipe assets locally for offline support ([85d3f8c](https://github.com/Benedict-Carling/eyeryhthm/commit/85d3f8c7d1bc076c695eda3187a99e2bb65c635d))
* improve fatigue detection with moving window and enhanced UI ([612be6b](https://github.com/Benedict-Carling/eyeryhthm/commit/612be6bafb9bc6d2a48e08955fa917618214cfcf))


### Bug Fixes

* move protocol.registerSchemesAsPrivileged before app.whenReady ([2e7b2ef](https://github.com/Benedict-Carling/eyeryhthm/commit/2e7b2efdcfe3d847437983d48a9da8284575e6ed))
* update CSP for offline MediaPipe and Sentry ([7e119e3](https://github.com/Benedict-Carling/eyeryhthm/commit/7e119e33ea2b7a827f7ea8640ef6b497a3099917))

## [1.2.5](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.2.4...v1.2.5) (2025-11-26)


### Bug Fixes

* add type safety for urlPath string operations ([b362b47](https://github.com/Benedict-Carling/eyeryhthm/commit/b362b47a07ec275e35081963687fb6b5524cafbe))
* **ci:** add include-hidden-files to artifact upload for .next directory ([8ab8823](https://github.com/Benedict-Carling/eyeryhthm/commit/8ab8823bcaa87a3f8ce47463b9d70edc317cb9ff))
* regenerate package-lock.json for updated dependencies ([3891575](https://github.com/Benedict-Carling/eyeryhthm/commit/389157522bfd09f9cf85f3235cba356fe8d5a7bb))
* resolve TypeScript strict mode errors in test files ([0e079a6](https://github.com/Benedict-Carling/eyeryhthm/commit/0e079a6fe6c5634b6b0544332382b61868b3e862))

## [1.2.4](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.2.3...v1.2.4) (2025-11-25)


### Bug Fixes

* use CSS module for webkit-app-region to ensure production build compatibility ([eb1e9ba](https://github.com/Benedict-Carling/eyeryhthm/commit/eb1e9ba370bf7332928eceae02443d423cda918e))

## [1.2.3](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.2.2...v1.2.3) (2025-11-25)


### Bug Fixes

* enable click handling in Electron navbar by adding no-drag region ([779e334](https://github.com/Benedict-Carling/eyeryhthm/commit/779e33403673b2a0bbe38eaa3ff026564be21f9c))

## [1.2.2](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.2.1...v1.2.2) (2025-11-25)


### Bug Fixes

* update release workflow to use correct electron-builder output directory ([353b945](https://github.com/Benedict-Carling/eyeryhthm/commit/353b9457db4e068370a22171f2c12a8fb00ffca1))

## [1.2.1](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.2.0...v1.2.1) (2025-11-25)


### Bug Fixes

* use correct electron-builder token environment variable syntax ([286ec8a](https://github.com/Benedict-Carling/eyeryhthm/commit/286ec8a0dfbb28519f7d81e810eaa41463748d56))

## [1.2.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.1.3...v1.2.0) (2025-11-25)


### Features

* trigger release workflow ([00438c6](https://github.com/Benedict-Carling/eyeryhthm/commit/00438c69e8363e6342106f14525aeec84350de3e))

## [1.1.3](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.1.2...v1.1.3) (2025-11-25)


### Bug Fixes

* correct Electron production mode detection and asset paths ([13f833a](https://github.com/Benedict-Carling/eyeryhthm/commit/13f833a8df357078dba2283737705925f41285c2))

## [1.1.2](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.1.1...v1.1.2) (2025-11-25)


### Bug Fixes

* use relative asset paths for Electron static export ([e4ed430](https://github.com/Benedict-Carling/eyeryhthm/commit/e4ed430560ccdb03d1cc16f58e3475ef61eebc2b))

## [1.1.1](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.1.0...v1.1.1) (2025-11-25)


### Bug Fixes

* correct Electron build output path and limit to macOS ([2ed6ed7](https://github.com/Benedict-Carling/eyeryhthm/commit/2ed6ed74d12e124f883127c543a821557009cf3a))

## [1.1.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.0.0...v1.1.0) (2025-11-25)


### Features

* trigger v1.0.1 release for Electron builds ([185c49a](https://github.com/Benedict-Carling/eyeryhthm/commit/185c49a0851f53e58b29b79f26a3e6bb4e9b263c))

## 1.0.0 (2025-11-25)


### Features

* add CLAUDE.md for project documentation and guidance ([bae153f](https://github.com/Benedict-Carling/eyeryhthm/commit/bae153f71afa0d3526f09ac0604400ad91e557ca))
* Add comprehensive calibration system for blink detection ([0b7b241](https://github.com/Benedict-Carling/eyeryhthm/commit/0b7b241a5a3897d82ca2b34a6180368b3010a26c))
* add dedicated title bar for macOS Electron traffic lights ([7852f32](https://github.com/Benedict-Carling/eyeryhthm/commit/7852f32fb03c7264f5d238521b9edce2b2a4bbda))
* add Electron desktop app with GitHub CI/CD releases ([4b2f3b8](https://github.com/Benedict-Carling/eyeryhthm/commit/4b2f3b89543922aa8386a75732f89743594442f9))
* add Link wrapper and hover effects to session cards ([531cc97](https://github.com/Benedict-Carling/eyeryhthm/commit/531cc97f9744afecc3c5d3559aed4572622cf011))
* add padding to Flex components in account, calibration, home, and session detail pages for improved layout ([c6abf82](https://github.com/Benedict-Carling/eyeryhthm/commit/c6abf823851fd7f42590be575fd1fa59d6cabff2))
* add total blink count tracking and display (EYE-38) ([a170d97](https://github.com/Benedict-Carling/eyeryhthm/commit/a170d97e6c00c9153db2baeb7d57a021b0c07635))
* add total blink count tracking and display (EYE-38) ([4dea4ec](https://github.com/Benedict-Carling/eyeryhthm/commit/4dea4ec364d9b499b8a0502867e8cbb2763a3bec))
* add visible video display to sessions tab for face detection ([e298e6e](https://github.com/Benedict-Carling/eyeryhthm/commit/e298e6e7555e7338f3ac0bbeb6a80fbb583b5386))
* create session detail page with D3 graph (EYE-32) ([5adb04c](https://github.com/Benedict-Carling/eyeryhthm/commit/5adb04ceea8ba1d8de90a25a20174056c7fdcb82))
* enhance account settings with fatigue alert threshold input and notification options ([76c4231](https://github.com/Benedict-Carling/eyeryhthm/commit/76c4231b436bca0551600767de59be0544088792))
* Implement blink detection feature with MediaPipe integration ([24f653d](https://github.com/Benedict-Carling/eyeryhthm/commit/24f653dba241ff0ed35e6f084df0153cc428ef4c))
* Implement fatigue alerts and user settings (EYE-29, EYE-30) ([c0957c9](https://github.com/Benedict-Carling/eyeryhthm/commit/c0957c9548531b0e1fad33dc0ff1f9ab384a0a7c))
* implement manual blink calibration with visual feedback ([9d0aa53](https://github.com/Benedict-Carling/eyeryhthm/commit/9d0aa53bd01cc359bc2be237535ed5cba80b3ee7))
* implement navbar navigation with dark/light/system theme toggle (EYE-36) ([4d5598b](https://github.com/Benedict-Carling/eyeryhthm/commit/4d5598ba26c3ce2a22b33835cd0244357a131f73))
* implement navbar navigation with dark/light/system theme toggle (EYE-36) ([b391dfa](https://github.com/Benedict-Carling/eyeryhthm/commit/b391dfa253a591cc16c4ae66ec86455e0a55c56b))
* integrate Sentry for error monitoring and reporting ([800db1d](https://github.com/Benedict-Carling/eyeryhthm/commit/800db1d4eef53d6d6895a4235f06f25aaefb1b58))
* remove recharts dependency and replace with D3 (EYE-39) ([e4d06bc](https://github.com/Benedict-Carling/eyeryhthm/commit/e4d06bce6d07ad224b1f21706270964e361d8ec2))
* remove recharts dependency and replace with D3 (EYE-39) ([fc0c822](https://github.com/Benedict-Carling/eyeryhthm/commit/fc0c822c78c6a91dfebbb3e2c9c93ea9d46c8ba2))
* remove unused video file from tests directory ([e6ba00a](https://github.com/Benedict-Carling/eyeryhthm/commit/e6ba00a07ab6816d1a6b879dbec3972a2baf9e8b))
* simplify home page by removing unused components and enhancing session display ([26223f2](https://github.com/Benedict-Carling/eyeryhthm/commit/26223f2075d3db8e17f07ed2d197a9d711e15c3a))
* simplify session requirements display in SessionsView component ([df765d2](https://github.com/Benedict-Carling/eyeryhthm/commit/df765d2ffa71d9117eff16c7312b993d809e7191))
* standardize container width across all pages and navbar ([c748c5f](https://github.com/Benedict-Carling/eyeryhthm/commit/c748c5f194b1f64b9a0e6e7505d93b2ea05b7293))
* update session cards with D3 charts, animations, and improvements (EYE-34, EYE-35, EYE-37) ([0290ef1](https://github.com/Benedict-Carling/eyeryhthm/commit/0290ef1b1d1f0bfd609fbd670af660aaa067db81))
* update session cards with D3 charts, animations, and improvements (EYE-34, EYE-35, EYE-37) ([2457a47](https://github.com/Benedict-Carling/eyeryhthm/commit/2457a477f583183678406d6fa93b5e4527d55b6f))


### Bug Fixes

* add @types/d3 to devDependencies for TypeScript support ([3828a42](https://github.com/Benedict-Carling/eyeryhthm/commit/3828a42eea82d240fe4c1f37e3bcafa8df9f678b))
* Add comprehensive ESLint coverage including tests directory ([990462b](https://github.com/Benedict-Carling/eyeryhthm/commit/990462b2a3d6989212b99b92fa8f658cd6b66fa6))
* Add vitest types to tsconfig for improved type checking ([695ba32](https://github.com/Benedict-Carling/eyeryhthm/commit/695ba32f9b30eeb0b88c1c4a60ea68297d1c10da))
* Complete test suite fixes and enhance pre-commit hooks ([f652842](https://github.com/Benedict-Carling/eyeryhthm/commit/f65284214cc63f9fb59b2de6c1a80e1613b32366))
* Correct MediaPipe face mesh landmark indices for accurate EAR calculation ([87dffd8](https://github.com/Benedict-Carling/eyeryhthm/commit/87dffd82446995e2835e33927912dada032cbfab))
* Ensure all tests pass and enhance pre-commit hooks ([1cbc9a7](https://github.com/Benedict-Carling/eyeryhthm/commit/1cbc9a7582fe8b6cd7c6b80be7a12020fd6c4c55))
* ensure only one calibration is active at a time ([2382038](https://github.com/Benedict-Carling/eyeryhthm/commit/23820389f6ff7bcc71786e94e742fb9b2338527f))
* resolve CI/CD failures for unit tests, E2E tests, and Electron build ([30e1745](https://github.com/Benedict-Carling/eyeryhthm/commit/30e17453a7d3618efc2156bd77987b325cd85d1d))
* resolve lint errors in fatigue alerts implementation ([6448f61](https://github.com/Benedict-Carling/eyeryhthm/commit/6448f61ac68349693161dcc9b577782299cdc4c5))
* resolve video flicker during camera initialization ([aa643d4](https://github.com/Benedict-Carling/eyeryhthm/commit/aa643d45b29942690a6054c79b85b9bde3bbe46b))
* unify camera initialization between calibration and blink detection ([7d166c8](https://github.com/Benedict-Carling/eyeryhthm/commit/7d166c888c23792864e8af96b7ff13a12fddcf34))
* update unit tests to match current implementations ([4018e39](https://github.com/Benedict-Carling/eyeryhthm/commit/4018e392d14a5205326265b7d70511658e370931))
