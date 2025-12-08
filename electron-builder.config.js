/**
 * Electron Builder Configuration
 *
 * @type {import('electron-builder').Configuration}
 *
 * CODE SIGNING FOR AUTO-UPDATES:
 * ==============================
 * Code signing is CRITICAL for secure auto-updates. Without proper code signing,
 * auto-update mechanisms can be vulnerable to man-in-the-middle attacks where
 * malicious actors could inject compromised updates.
 *
 * How Code Signing Protects Auto-Updates:
 * - Ensures updates are from the verified publisher (authenticity)
 * - Prevents tampering during download/transmission (integrity)
 * - Required by OS security features (macOS Gatekeeper, Windows SmartScreen)
 *
 * Platform-Specific Requirements:
 *
 * macOS:
 * - Requires Apple Developer ID Application certificate
 * - Enables notarization for Gatekeeper approval
 * - See mac.identity configuration below
 *
 * Windows:
 * - Requires code signing certificate (EV recommended for immediate SmartScreen trust)
 * - Prevents "Unknown Publisher" warnings
 * - See win.certificateFile configuration below
 *
 * Linux:
 * - Code signing less common but GPG signatures can be used
 *
 * For more information: https://www.electron.build/code-signing
 */
const config = {
  appId: "com.eyerhythm.app",
  productName: "EyeRhythm",
  copyright: "Copyright © 2025 EyeRhythm",

  // Directory configuration
  directories: {
    output: "release",
    buildResources: "build-resources",
  },

  // Files to include in the app
  // electron-builder automatically includes only production dependencies (not devDependencies)
  files: ["dist-electron/**/*", "out/**/*"],

  // Extra resources bundled with the app
  // These are copied to the resources directory and can be accessed at runtime
  extraResources: [
    // Main app icon for notifications (all platforms)
    {
      from: "build-resources/icon.png",
      to: "icon.png",
    },
    // macOS tray icons (template images for automatic dark/light mode)
    {
      from: "build-resources/trayIconTemplate.png",
      to: "trayIconTemplate.png",
    },
    {
      from: "build-resources/trayIconTemplate@2x.png",
      to: "trayIconTemplate@2x.png",
    },
  ],

  // macOS configuration
  mac: {
    artifactName: "${productName}-mac.${ext}", // Used for zip (dmg has its own artifactName)
    category: "public.app-category.healthcare-fitness",
    target: [
      {
        target: "dmg",
        arch: ["universal"],
      },
      {
        target: "zip",
        arch: ["universal"],
      },
    ],
    icon: "build-resources/icon.icns",
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build-resources/entitlements.mac.plist",
    entitlementsInherit: "build-resources/entitlements.mac.plist",

    // TODO: Re-enable signing and notarization once certificate issues are resolved
    // Requires APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID env vars
    identity: null, // Temporarily disable code signing
    notarize: false,

    // Skip signing non-executable files to dramatically speed up builds
    // Locale .pak files and other data files don't need to be signed
    signIgnore: [
      // Skip all locale .pak files (hundreds of them)
      ".*\\.lproj/.*",
      ".*\\.pak$",
      // Skip other data files that don't need signing
      ".*\\.dat$",
      ".*\\.bin$",
      ".*\\.nib$",
    ],

    // Camera permission
    extendInfo: {
      NSCameraUsageDescription:
        "EyeRhythm needs camera access to detect eye movements and blinks for fatigue monitoring.",
      NSMicrophoneUsageDescription:
        "EyeRhythm may use the microphone for future audio-based features.",
    },
  },

  // DMG configuration
  dmg: {
    artifactName: "${productName}.${ext}",
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

    /**
     * Windows Code Signing Configuration
     *
     * CRITICAL FOR AUTO-UPDATES: Without code signing, Windows SmartScreen will
     * block downloads and warn users about "unrecognized app" risks.
     *
     * Setup Steps:
     * 1. Obtain a code signing certificate:
     *    - EV (Extended Validation) certificate: Immediate SmartScreen trust (recommended)
     *    - Standard certificate: Requires reputation building with Microsoft
     *    - Providers: DigiCert, Sectigo, GlobalSign, etc.
     *
     * 2. Configure signing using one of these methods:
     *
     * Method 1 - Environment variables (Recommended for CI/CD):
     *   - Set CSC_LINK to base64-encoded .pfx/.p12 file
     *     Example: export CSC_LINK=$(base64 -i certificate.pfx)
     *   - Set CSC_KEY_PASSWORD to certificate password
     *     Example: export CSC_KEY_PASSWORD="your-password"
     *
     * Method 2 - Certificate file path (Recommended for local builds):
     *   - Uncomment certificateFile and set path to .pfx or .p12 file
     *   - Uncomment certificatePassword or use CSC_KEY_PASSWORD env var
     *   - DO NOT commit certificate files to version control!
     *
     * Method 3 - Windows Certificate Store:
     *   - Install certificate in Windows Certificate Store
     *   - Set certificateSubjectName to certificate subject
     *   - Example: certificateSubjectName: "CN=Your Company Name"
     *
     * Timestamp Server (Recommended):
     * - Ensures signatures remain valid after certificate expiration
     * - Set rfc3161TimeStampServer to trusted timestamp authority
     * - Example: rfc3161TimeStampServer: "http://timestamp.digicert.com"
     *
     * Security Notes:
     * - Store certificate password in secure environment variables, never in code
     * - Use different certificates for development and production
     * - Consider using Azure Key Vault or similar for certificate management in CI/CD
     *
     * Verify signing: signtool verify /pa /v path\to\EyeRhythm-Setup.exe
     */
    // certificateFile: undefined, // Path to .pfx or .p12 certificate file
    // certificatePassword: undefined, // Certificate password (use CSC_KEY_PASSWORD env var)
    // certificateSubjectName: undefined, // Alternative: certificate subject from Windows store
    // certificateSha1: undefined, // Alternative: certificate SHA1 thumbprint
    // rfc3161TimeStampServer: "http://timestamp.digicert.com", // Recommended: timestamp server
    // timeStampServer: undefined, // Legacy Authenticode timestamp server (use rfc3161 instead)
  },

  // NSIS installer configuration
  nsis: {
    artifactName: "${productName}-Setup.${ext}",
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "EyeRhythm",
  },

  // Windows portable configuration
  portable: {
    artifactName: "${productName}-Portable.${ext}",
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

  // Linux AppImage configuration
  appImage: {
    artifactName: "${productName}.${ext}",
  },

  // Linux deb configuration
  deb: {
    artifactName: "${productName}.${ext}",
  },

  // Publish configuration for GitHub releases
  publish: {
    provider: "github",
    owner: "Benedict-Carling",
    repo: "eyeryhthm",
    releaseType: "release",
  },
};

module.exports = config;
