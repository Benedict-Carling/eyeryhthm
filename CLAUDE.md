# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EyeRhythm (branded as "BlinkTrack" in the UI) is a privacy-focused real-time eye movement tracking desktop application that monitors blink patterns to detect fatigue and improve screen time awareness. Built as both a Next.js web app and an Electron desktop application, with all video processing happening client-side for maximum privacy.

**Current Version:** 1.3.0

## Key Commands

```bash
# Development - Web Mode
npm run dev              # Start Next.js dev server (http://localhost:3000)

# Development - Electron Mode
npm run electron:dev     # Run full Electron dev environment (Next.js + Electron concurrently)

# Building
npm run build            # Next.js production build (static export for Electron)
npm run typecheck        # TypeScript validation (Next.js + Electron)
npm run verify           # Run typecheck + lint + unit tests

# Electron Packaging
npm run electron:build       # Full build: verify + package for all platforms
npm run electron:build:mac   # Build for macOS (universal: x64 + arm64)
npm run electron:build:win   # Build for Windows (x64)
npm run electron:build:linux # Build for Linux (x64)

# Code Quality
npm run lint             # Run ESLint

# Testing
npm test                 # Run Playwright e2e tests (requires dev server)
npm run test:unit        # Run Vitest unit tests (watch mode)
npm run test:unit:ui     # Run Vitest with UI interface
npm run test:unit -- --run  # Unit tests in CI mode (single run)

# Run a specific unit test
npm run test:unit -- path/to/test.test.tsx
```

## Electron Setup

### Architecture

The Electron application lives in `/electron/` with three main files:

- **`main.ts`** - Main process handling window creation, custom `app://` protocol, permissions, power save blocker, and system tray
- **`preload.ts`** - Context bridge exposing safe APIs (version, platform, window controls, auto-updates)
- **`updater.ts`** - Auto-update mechanism using `electron-updater` with GitHub releases

### How Electron Dev Mode Works

When you run `npm run electron:dev`:
1. Starts Next.js dev server on port 3000
2. Waits for server to be ready (`wait-on`)
3. Compiles Electron TypeScript to `/dist-electron`
4. Launches Electron pointing to localhost:3000
5. Opens DevTools automatically

**Hot Reloading:**
- Frontend: Automatic via Next.js HMR
- Electron main process: Manual restart required

### Production Build Process

When you run `npm run electron:build:mac` (or win/linux):
1. Runs verification (typecheck + lint + unit tests)
2. Sets `ELECTRON_BUILD=true` environment variable
3. Builds Next.js static export to `/out`
4. Compiles Electron TypeScript to `/dist-electron`
5. Runs `electron-builder` (outputs to `/release`)

**Build Outputs:**
- macOS: `BlinkTrack-{version}-universal.dmg` and `.zip`
- Windows: `BlinkTrack Setup {version}.exe` (NSIS installer)
- Linux: `BlinkTrack-{version}.AppImage` and `.deb`

### Key Electron Configuration

**Build Config:** `/electron-builder.config.js`
- Platform-specific configurations
- Code signing setup (macOS notarization, Windows signing)
- GitHub release publishing

**macOS Entitlements:** `/build-resources/entitlements.mac.plist`
- Camera and microphone access
- Network access for MediaPipe models
- Hardened runtime permissions

### Custom Protocol

Electron serves the Next.js static export via custom `app://` protocol:
- Handles directory paths with index.html resolution
- Prevents path traversal attacks
- Supports localStorage, cookies, and web APIs

## Project Structure

```
eyeryhthm/
├── electron/                  # Electron main process
│   ├── main.ts               # Window management, protocol, permissions
│   ├── preload.ts            # Context bridge for renderer
│   ├── updater.ts            # Auto-update logic
│   └── tsconfig.json         # Electron TypeScript config
│
├── src/                       # Next.js application
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   ├── contexts/             # React Context providers
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and services
│   └── types/                # TypeScript definitions
│
├── tests/                     # Playwright e2e tests
├── build-resources/           # Electron build assets (icons, entitlements)
├── public/mediapipe/          # Bundled MediaPipe models (offline support)
│
├── dist-electron/             # Compiled Electron code (gitignored)
├── out/                       # Next.js static export (gitignored)
└── release/                   # Packaged Electron apps (gitignored)
```

## Core Technology Stack

- **Next.js 15.5.6** with App Router
- **React 19.1.0** with TypeScript
- **Electron 39.2.3** for desktop packaging
- **MediaPipe** for face landmark detection
- **Radix UI** for accessible component primitives
- **D3.js** for custom data visualizations

## Application Flow

1. **Camera Access**: `useCamera` hook manages webcam permissions and stream
2. **Face Detection**: `useFaceLandmarker` integrates MediaPipe to detect facial landmarks
3. **Blink Detection**: `useBlinkDetection` calculates Eye Aspect Ratio (EAR) to detect blinks
4. **Session Tracking**: `SessionContext` manages recording sessions and stores data locally
5. **Calibration**: `CalibrationContext` personalizes detection thresholds per user

### Provider Hierarchy (in `app/layout.tsx`)

```
ThemeProvider
└── CalibrationProvider
    └── SessionProvider
        └── Application
```

### Hook Dependencies

- `useBlinkDetection` depends on `useFaceLandmarker`
- `Camera` component orchestrates `useCamera`, `useFaceLandmarker`, and `useBlinkDetection`
- Sessions consume blink data from `useBlinkDetection`

## Critical Implementation Details

**Blink Detection Algorithm** (`lib/blink-detection/ear-calculator.ts`):
- Calculates Eye Aspect Ratio (EAR) using 6 eye landmarks per eye
- Default threshold: 0.21 (customizable via calibration)
- Blink registered when EAR drops below threshold then rises above

**Calibration Process** (`lib/calibration/calibration-service.ts`):
- Records baseline EAR values
- Captures intentional blinks
- Calculates personalized threshold as: `baselineEAR * 0.7`

**Session Recording**:
- Automatically starts when face detected
- Pauses when face lost for >3 seconds
- Stores in browser localStorage
- Tracks: duration, blink count, average blink rate

**Privacy Safeguards**:
- No video recording capabilities
- MediaPipe runs entirely in-browser/in-app
- No network requests for video data
- Camera stream never leaves the application context

## Testing

### Unit Tests (Vitest)

- **Config:** `/vitest.config.ts`
- **Location:** Co-located with source (`*.test.ts`, `*.test.tsx`)
- **Setup:** `/src/test-setup.ts`
- Mock MediaPipe and camera APIs

```bash
npm run test:unit          # Watch mode
npm run test:unit:ui       # Visual UI
npm run test:unit -- --run # CI mode
```

### E2E Tests (Playwright)

- **Config:** `/playwright.config.ts`
- **Location:** `/tests/*.spec.ts`
- Uses fake media devices for consistent testing
- Tests full user flows (camera access, calibration, sessions)

```bash
npm test  # Requires dev server running
```

## Development Workflow

### Pre-commit Hooks (Husky)

Automatically runs before each commit:
1. TypeScript type checking (Next.js + Electron)
2. ESLint validation
3. Unit tests (all must pass)

### CI/CD

- **CI:** Runs on all PRs (lint, unit tests, e2e tests, build verification)
- **Releases:** Automated via Release Please on push to main
  - Analyzes conventional commits
  - Updates CHANGELOG.md and version
  - Builds and uploads Electron packages to GitHub releases

## Development Notes

1. **Camera Testing in Browser**: Use Chrome with `--use-fake-device-for-media-stream` flag
2. **Performance**: MediaPipe processing runs at ~30 FPS
3. **Mobile Support**: Currently optimized for desktop, mobile has limited testing
4. **Browser Support**: Requires modern browsers with WebRTC support
5. **Node Version**: Requires Node.js 20+
