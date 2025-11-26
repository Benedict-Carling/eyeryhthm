# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EyeRhythm (branded as "BlinkTrack" in the UI) is a privacy-focused real-time eye movement tracking application that monitors blink patterns to detect fatigue and improve screen time awareness. All video processing happens client-side with no data transmission.

## Key Commands

```bash
# Development
npm run dev          # Start Next.js dev server with TurboRack (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint

# Testing
npm test             # Run Playwright e2e tests
npm run test:unit    # Run Vitest unit tests
npm run test:unit:ui # Run Vitest with UI interface

# Run a specific unit test
npm run test:unit -- path/to/test.test.tsx

# Electron Desktop App
npm run electron:dev          # Start Electron in dev mode
npm run electron:build        # Build for current platform
npm run electron:build:mac    # Build for macOS
npm run electron:build:win    # Build for Windows
npm run electron:build:linux  # Build for Linux
```

## Architecture Overview

### Core Technology Stack
- **Next.js 15.4.2** with App Router
- **React 19.1.0** with TypeScript
- **MediaPipe** for face landmark detection
- **Radix UI** for accessible component primitives
- **D3.js** for custom data visualizations

### Application Flow

1. **Camera Access**: `useCamera` hook manages webcam permissions and stream
2. **Face Detection**: `useFaceLandmarker` integrates MediaPipe to detect facial landmarks
3. **Blink Detection**: `useBlinkDetection` calculates Eye Aspect Ratio (EAR) to detect blinks
4. **Session Tracking**: `SessionContext` manages recording sessions and stores data locally
5. **Calibration**: `CalibrationContext` personalizes detection thresholds per user

### Key Architectural Patterns

**Provider Hierarchy** (in `app/layout.tsx`):
```
ThemeProvider
└── CalibrationProvider
    └── SessionProvider
        └── Application
```

**Hook Dependencies**:
- `useBlinkDetection` depends on `useFaceLandmarker`
- `Camera` component orchestrates `useCamera`, `useFaceLandmarker`, and `useBlinkDetection`
- Sessions consume blink data from `useBlinkDetection`

**State Management**:
- Global state via React Context (Theme, Calibration, Session)
- Local component state for UI interactions
- No external state management libraries

### Critical Implementation Details

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
- MediaPipe runs entirely in-browser
- No network requests for video data
- Camera stream never leaves the browser context

### Testing Approach

**Unit Tests** (Vitest):
- Test files co-located with source (*.test.tsx)
- Focus on hooks and utility functions
- Mock MediaPipe and camera APIs

**E2E Tests** (Playwright):
- Use fake media devices for consistent testing
- Test full user flows (calibration → session recording)
- Located in `/tests` directory

### Component Structure

**Smart Components** (with business logic):
- `Camera.tsx` - Orchestrates video capture and processing
- `CalibrationFlow.tsx` - Manages calibration workflow
- `SessionsView.tsx` - Displays session history

**Presentational Components**:
- `VideoCanvas.tsx` - Renders video with overlay
- `SessionCard.tsx` - Displays session summary
- `BlinkRateChart.tsx` - D3-based visualization

**Shared UI Components**:
- `Navbar.tsx` - Navigation with theme toggle
- `LoadingSpinner.tsx` - Loading states
- Use Radix UI primitives throughout

### Auto-Update System

**Overview**:
The Electron app includes automatic update detection using `electron-updater` with GitHub Releases.

**Configuration** (`package.json:12-20`):
- Public repository: No authentication required
- GitHub provider configured for `Benedict-Carling/eyeryhthm`
- Updates fetched from public GitHub Releases API
- Rate limit: 60 requests/hour per IP (sufficient for update checks)

**How it works**:
1. App checks for updates on startup (after 3-second delay)
2. Queries GitHub Releases API: `https://api.github.com/repos/Benedict-Carling/eyeryhthm/releases/latest`
3. Compares latest release version with current app version
4. Notifies user if update available via `VersionInfo` component
5. User chooses when to download and install

**Update Flow** (`electron/updater.ts`):
- `checking` → `available` → `downloading` → `downloaded` → Install & restart
- Auto-download disabled - user controls when to update
- Auto-install on quit enabled for convenience

**UI Component** (`src/components/VersionInfo.tsx`):
- Displays current version and update status
- Shows download progress with percentage and speed
- Provides action buttons: Check, Download, Install
- Only visible in Electron environment

**Releasing New Versions**:
1. Update version in `package.json`
2. Commit and tag: `git tag v1.2.5 && git push --tags`
3. Build release: `npm run electron:build`
4. Create GitHub release with assets from `/release` folder
5. Users automatically notified of update on next app launch

**Best Practices**:
- Use semantic versioning (e.g., 1.2.4)
- Include release notes in GitHub releases
- Test builds before publishing
- GitHub Releases must be public for auto-update to work

### Development Notes

1. **Camera Testing**: Use Chrome with `--use-fake-device-for-media-stream` flag
2. **Performance**: MediaPipe processing runs at ~30 FPS, adjust `VIDEO_FPS` if needed
3. **Mobile Support**: Currently optimized for desktop, mobile has limited testing
4. **Browser Support**: Requires modern browsers with WebRTC support
5. **Electron Development**: Auto-update only works in production builds, not dev mode