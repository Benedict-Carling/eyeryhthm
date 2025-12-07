# Changelog

## [1.11.2](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.11.1...v1.11.2) (2025-12-07)


### Bug Fixes

* update copyright year to 2025 ([13fc02a](https://github.com/Benedict-Carling/eyeryhthm/commit/13fc02aa6a597f3d93e73810bf7d3c88effce0a0))

## [1.11.1](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.11.0...v1.11.1) (2025-12-07)


### Bug Fixes

* simplify macOS signing - let electron-builder handle certificate ([93c9696](https://github.com/Benedict-Carling/eyeryhthm/commit/93c9696e0dd958d418bd55accfaa2f28ac592ab7))
* use CSC_NAME instead of CSC_LINK for macOS code signing ([08526ec](https://github.com/Benedict-Carling/eyeryhthm/commit/08526ec932ff7d144e770c116de76baf02f380d8))

## [1.11.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.10.1...v1.11.0) (2025-12-07)


### Features

* add macOS code signing and notarization for releases ([#66](https://github.com/Benedict-Carling/eyeryhthm/issues/66)) ([8584626](https://github.com/Benedict-Carling/eyeryhthm/commit/8584626ed240e9b23f4d928819c344dbc0e447e5))


### Bug Fixes

* **docs:** fix download button navigation in mintlify ([8246f30](https://github.com/Benedict-Carling/eyeryhthm/commit/8246f309c1295166811da629c5590d119a1018ba))

## [1.10.1](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.10.0...v1.10.1) (2025-12-06)


### Bug Fixes

* **camera:** properly release camera resources on Windows ([#65](https://github.com/Benedict-Carling/eyeryhthm/issues/65)) ([e339ece](https://github.com/Benedict-Carling/eyeryhthm/commit/e339ecef7c51d6db5ddfcc233ece70caf78d0c8a))
* **electron:** improve tray cleanup to prevent orphaned icons on quit ([#63](https://github.com/Benedict-Carling/eyeryhthm/issues/63)) ([aff84d2](https://github.com/Benedict-Carling/eyeryhthm/commit/aff84d21886d867987df4f1184f5da206de78ab8))

## [1.10.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.9.3...v1.10.0) (2025-12-05)


### Features

* **ui:** add floating feedback button ([c69f0ba](https://github.com/Benedict-Carling/eyeryhthm/commit/c69f0bad5b5dbbfe85d75887ce7d4ad8150897f6))
* **ui:** add premium animations and micro-interactions ([7327d8e](https://github.com/Benedict-Carling/eyeryhthm/commit/7327d8ea9fa397f8417aef1973d98b3bf8709d84))


### Bug Fixes

* **calibration:** lower default threshold and widen calibration range ([972bdfb](https://github.com/Benedict-Carling/eyeryhthm/commit/972bdfba0a3466a59500659052c162e30a9ff787))

## [1.9.3](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.9.2...v1.9.3) (2025-12-05)


### Bug Fixes

* correct path resolution after tsconfig rootDir change ([3d5fa43](https://github.com/Benedict-Carling/eyeryhthm/commit/3d5fa43c7073e46d4a47d957f9276b321c13d91c))
* correct path resolution after tsconfig rootDir change ([2ac50f2](https://github.com/Benedict-Carling/eyeryhthm/commit/2ac50f270f40c881c0e54f1167319a37d719728e))

## [1.9.2](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.9.1...v1.9.2) (2025-12-05)


### Bug Fixes

* include electron runtime dependencies in packaged app ([41faf09](https://github.com/Benedict-Carling/eyeryhthm/commit/41faf09451025bcaf896dc0a709d3c04d731138e))

## [1.9.1](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.9.0...v1.9.1) (2025-12-05)


### Bug Fixes

* add author email for Linux deb package build ([5993568](https://github.com/Benedict-Carling/eyeryhthm/commit/5993568fd48546087bbd6d1e843bc13de387e3c7))

## [1.9.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.8.1...v1.9.0) (2025-12-05)


### Features

* persist sessions to localStorage ([347469e](https://github.com/Benedict-Carling/eyeryhthm/commit/347469e6556ad01606b175c1220f068d6961866a))
* persist sessions to localStorage ([3d9f9ad](https://github.com/Benedict-Carling/eyeryhthm/commit/3d9f9adeba943c6fc5b5a0f27e4bd846a7d98a81))


### Bug Fixes

* update electron entry point path to match tsc output ([8de8afc](https://github.com/Benedict-Carling/eyeryhthm/commit/8de8afccb2bdd26b0106d73f5366b0d43e9c3c23))

## [1.8.1](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.8.0...v1.8.1) (2025-12-05)


### Bug Fixes

* address codebase audit issues and improve robustness ([075859e](https://github.com/Benedict-Carling/eyeryhthm/commit/075859ee03d29ea6ea729cb76be5b48f896c312e))
* address codebase audit issues and improve robustness ([60fc13b](https://github.com/Benedict-Carling/eyeryhthm/commit/60fc13b040ea53788d384e2f3e62d5bffc8c1c8a))
* use electron-builder.config.js for production builds ([#52](https://github.com/Benedict-Carling/eyeryhthm/issues/52)) ([3aeb41c](https://github.com/Benedict-Carling/eyeryhthm/commit/3aeb41cb3484fb87438851da881a666265c7d607))

## [1.8.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.7.1...v1.8.0) (2025-12-05)


### Features

* add cross-platform support for Windows and Linux releases ([#50](https://github.com/Benedict-Carling/eyeryhthm/issues/50)) ([632a10b](https://github.com/Benedict-Carling/eyeryhthm/commit/632a10b174a35dff4708584fe30dbcfc87eb1c00))

## [1.7.1](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.7.0...v1.7.1) (2025-12-05)


### Bug Fixes

* request camera permission from main process on macOS ([#48](https://github.com/Benedict-Carling/eyeryhthm/issues/48)) ([308e7c2](https://github.com/Benedict-Carling/eyeryhthm/commit/308e7c2164ec029b41b17baa866a9d4d9786ac32))

## [1.7.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.6.0...v1.7.0) (2025-12-04)


### Features

* integrate React Compiler and fix camera stop bug ([283d493](https://github.com/Benedict-Carling/eyeryhthm/commit/283d4936db21db419989583eb38396a2b62a0baa))


### Bug Fixes

* resolve React Compiler purity errors and tray toggle issues ([#47](https://github.com/Benedict-Carling/eyeryhthm/issues/47)) ([8d1b67c](https://github.com/Benedict-Carling/eyeryhthm/commit/8d1b67c030800e1c5d042682ec95d92c4b497e1a))

## [1.6.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.5.0...v1.6.0) (2025-12-04)


### Features

* **navbar:** add beta badge next to version indicator ([46fefe6](https://github.com/Benedict-Carling/eyeryhthm/commit/46fefe62bc18abbc6d791b21d23a24e7bd390225))
* **sessions:** add initializing camera callout state ([47586e0](https://github.com/Benedict-Carling/eyeryhthm/commit/47586e0784bea9ba1f5b6c1b7cebc7ece1dffd17))


### Bug Fixes

* **analytics:** initialize Aptabase SDK before app ready ([2ff094f](https://github.com/Benedict-Carling/eyeryhthm/commit/2ff094fc336e004eca36e654b135725caf26045e))
* **electron:** prevent duplicate tray icons on hot reload and quit ([1da296a](https://github.com/Benedict-Carling/eyeryhthm/commit/1da296a165e53251cf2c31f563aee3c10cefe60c))
* **electron:** prevent EPIPE crashes from console logging in packaged apps ([8231ef6](https://github.com/Benedict-Carling/eyeryhthm/commit/8231ef604728bf7df61a4cc92b1e135467304417))
* **session-card:** update duration display periodically for active sessions ([a1bbd00](https://github.com/Benedict-Carling/eyeryhthm/commit/a1bbd00fb11e7d36ac8c71843692abc41d85dae8))

## [1.5.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.4.2...v1.5.0) (2025-12-04)


### Features

* **notifications:** add fatigue alert notification system ([6fa904d](https://github.com/Benedict-Carling/eyeryhthm/commit/6fa904d252d435a778869a49308ceb78c7ddfe2e))
* **notifications:** add fatigue alert notification system ([a078e82](https://github.com/Benedict-Carling/eyeryhthm/commit/a078e82df54e8f830a36957e28088b17d3fd09d0))


### Bug Fixes

* **tracking:** prevent state desync after sleep/wake cycle ([b34f6df](https://github.com/Benedict-Carling/eyeryhthm/commit/b34f6dfe7842d79671a1c95bc7e8ec283584cfbc))
* **tracking:** prevent state desync after sleep/wake cycle ([980874b](https://github.com/Benedict-Carling/eyeryhthm/commit/980874b88e4239ea3ab0f00b6f9a5476d9561b70))

## [1.4.2](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.4.1...v1.4.2) (2025-12-03)


### Bug Fixes

* **tray:** redesign tray icon for better visibility ([b48e492](https://github.com/Benedict-Carling/eyeryhthm/commit/b48e492bd99ca2f6c08f964441f88ba6a3d58c95))

## [1.4.1](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.4.0...v1.4.1) (2025-12-03)


### Bug Fixes

* **build:** use static manifest for Next.js static export ([5aecfaf](https://github.com/Benedict-Carling/eyeryhthm/commit/5aecfaf56b5539fba5cd422714ef3e98516b44e9))

## [1.4.0](https://github.com/Benedict-Carling/eyeryhthm/compare/v1.3.0...v1.4.0) (2025-12-03)


### Features

* **analytics:** add Aptabase for privacy-first usage tracking ([5fdc381](https://github.com/Benedict-Carling/eyeryhthm/commit/5fdc381582ea74d51183e91484b79f005e8926d1))
* **branding:** replace default icons with custom BlinkTrack logo ([ef3a026](https://github.com/Benedict-Carling/eyeryhthm/commit/ef3a0263f6f70781a6378ce7a8d2ebc464457f04))
* **calibration:** add notification dot and warning for factory default ([1a858f7](https://github.com/Benedict-Carling/eyeryhthm/commit/1a858f728fc7496d2c2676412f9169633676c882))
* **electron:** add macOS menu bar tray with tracking controls ([4da9bbd](https://github.com/Benedict-Carling/eyeryhthm/commit/4da9bbd2c4fa066780ec5b78480d9adfd9ae151e))
* enforce default calibration to always exist ([f78e498](https://github.com/Benedict-Carling/eyeryhthm/commit/f78e4989a1bada099b2af6e1f5f83f9bf7f3d170))
* implement ImageCapture API for UI-independent session tracking ([bd961b3](https://github.com/Benedict-Carling/eyeryhthm/commit/bd961b3f861ceb582c8812526bde865abb74af5f))
* implement robust background processing with MediaStreamTrackProcessor ([ce0d2c5](https://github.com/Benedict-Carling/eyeryhthm/commit/ce0d2c5d8d88b031b2ce6bde096e7f779a748e00))
* remove video element dependency and optimize frame processing ([30cad18](https://github.com/Benedict-Carling/eyeryhthm/commit/30cad1821cb05d54533b5fbc1d5e8af2cfb51ce6))
* **session:** add live duration and improved chart styling ([057c932](https://github.com/Benedict-Carling/eyeryhthm/commit/057c932b9cb5013eeca066e034d3f5bf6e035646))
* **sessions:** add example badge to demo sessions ([9f28167](https://github.com/Benedict-Carling/eyeryhthm/commit/9f28167c5bbb324ac3e08649e2856ca49d920e71))
* **sessions:** improve face detection UX with countdown and face lost tracking ([9a7b7b2](https://github.com/Benedict-Carling/eyeryhthm/commit/9a7b7b2ba4d6189e75fadc84b214be11703d8564))
* **sessions:** instant blink count updates with debounced chart rendering ([39f5606](https://github.com/Benedict-Carling/eyeryhthm/commit/39f56064367635b132f71a62ca1a8e7d2931531e))
* **settings:** disable notifications (in development) and extend face timeout ([f8a8f82](https://github.com/Benedict-Carling/eyeryhthm/commit/f8a8f82c9926875ee324907194dd2146428cf092))
* track face lost periods and fix VideoFrame detection ([491fedf](https://github.com/Benedict-Carling/eyeryhthm/commit/491fedf4174ecce92cd1f6617316e1bba7123be4))
* **updater:** add auto-update UI and enable background downloads ([9628aa1](https://github.com/Benedict-Carling/eyeryhthm/commit/9628aa12ad0daf5396a6b83d09597f64bc0fd2f5))


### Bug Fixes

* improve type safety and event listener cleanup in ImageCapture implementation ([194f7dc](https://github.com/Benedict-Carling/eyeryhthm/commit/194f7dc0f3c4d2a66ee0544ebf8260db4811abcb))
* prevent ImageCapture processing loop from restarting on every render ([1b8b593](https://github.com/Benedict-Carling/eyeryhthm/commit/1b8b593807b658cee7a3b2b985f79da1020e2edd))
* resolve cascading re-renders and negative blink counts in session tracking ([9aee9ec](https://github.com/Benedict-Carling/eyeryhthm/commit/9aee9ec9e7d059dc121187f3c0a03df4e420e3c9))
* **theme:** resolve dark edges in light mode on Electron ([ce803a9](https://github.com/Benedict-Carling/eyeryhthm/commit/ce803a99cd1c90eed836a8efd415b3585877d8bb))
* **tray:** use transparent background for macOS menu bar icons ([69384e7](https://github.com/Benedict-Carling/eyeryhthm/commit/69384e75a6dd1e9ec51e3da9218bb2521a8d9225))


### Performance Improvements

* **mediapipe:** add permission-aware background preloading ([d94270b](https://github.com/Benedict-Carling/eyeryhthm/commit/d94270bbf9235cd7ec3c8b6fb2b9cd8165a8598c))

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
