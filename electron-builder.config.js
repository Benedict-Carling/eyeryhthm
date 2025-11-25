/**
 * @type {import('electron-builder').Configuration}
 */
const config = {
  appId: "com.blinktrack.app",
  productName: "BlinkTrack",
  copyright: "Copyright © 2024 BlinkTrack",

  // Directory configuration
  directories: {
    output: "release",
    buildResources: "build-resources",
  },

  // Files to include in the app
  files: [
    "dist-electron/**/*",
    "out/**/*",
    "!node_modules/**/*",
    "node_modules/electron-squirrel-startup/**/*",
  ],

  // Extra resources (MediaPipe models if needed offline)
  extraResources: [],

  // macOS configuration
  mac: {
    category: "public.app-category.healthcare-fitness",
    target: [
      {
        target: "dmg",
        arch: ["x64", "arm64"],
      },
      {
        target: "zip",
        arch: ["x64", "arm64"],
      },
    ],
    icon: "build-resources/icon.icns",
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build-resources/entitlements.mac.plist",
    entitlementsInherit: "build-resources/entitlements.mac.plist",
    // Camera permission
    extendInfo: {
      NSCameraUsageDescription:
        "BlinkTrack needs camera access to detect eye movements and blinks for fatigue monitoring.",
      NSMicrophoneUsageDescription:
        "BlinkTrack may use the microphone for future audio-based features.",
    },
  },

  // DMG configuration
  dmg: {
    contents: [
      {
        x: 130,
        y: 220,
      },
      {
        x: 410,
        y: 220,
        type: "link",
        path: "/Applications",
      },
    ],
    window: {
      width: 540,
      height: 380,
    },
  },

  // Windows configuration
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
      {
        target: "portable",
        arch: ["x64"],
      },
    ],
    icon: "build-resources/icon.ico",
    requestedExecutionLevel: "asInvoker",
  },

  // NSIS installer configuration
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "BlinkTrack",
  },

  // Linux configuration
  linux: {
    target: [
      {
        target: "AppImage",
        arch: ["x64"],
      },
      {
        target: "deb",
        arch: ["x64"],
      },
    ],
    icon: "build-resources/icon.png",
    category: "Utility",
    synopsis: "Eye movement tracking for fatigue detection",
    description:
      "Privacy-focused real-time eye movement tracking application that monitors blink patterns to detect fatigue and improve screen time awareness.",
  },

  // Publish configuration for GitHub releases
  publish: {
    provider: "github",
    owner: "benedictcarling",
    repo: "eyeryhthm",
    releaseType: "release",
  },
};

module.exports = config;
