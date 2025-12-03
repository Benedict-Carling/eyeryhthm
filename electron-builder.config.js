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
  // Include tray icons for macOS menu bar
  extraResources: [
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

    /**
     * macOS Code Signing Configuration
     *
     * CRITICAL FOR AUTO-UPDATES: Without code signing, macOS will reject auto-updates
     * and users will see "unidentified developer" warnings.
     *
     * Setup Steps:
     * 1. Obtain a "Developer ID Application" certificate from Apple Developer Program
     *    (requires paid membership: https://developer.apple.com/programs/)
     * 2. Install the certificate in your macOS Keychain
     * 3. Configure signing identity using one of these methods:
     *
     * Method 1 - Auto-detection (Recommended for local builds):
     *   - Leave identity commented out or set to null
     *   - electron-builder will auto-detect the certificate from Keychain
     *   - Works when only one valid certificate is installed
     *
     * Method 2 - Environment variable (Recommended for CI/CD):
     *   - Set CSC_NAME environment variable to certificate name
     *   - Example: export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
     *   - Also set CSC_LINK (base64 .p12) and CSC_KEY_PASSWORD for CI/CD
     *
     * Method 3 - Explicit identity configuration:
     *   - Uncomment and set identity to certificate name
     *   - Example: identity: "Developer ID Application: Your Name (TEAM_ID)"
     *   - Find exact name: security find-identity -v -p codesigning
     *
     * Additional Security:
     * - hardenedRuntime: Enables macOS security features
     * - entitlements: Required permissions (camera access for this app)
     * - Notarization: For macOS 10.15+, also notarize the app after signing
     *   Set APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD environment variables
     *
     * Verify signing: codesign -dv --verbose=4 path/to/BlinkTrack.app
     */
    // identity: null, // Auto-detect from Keychain (or set to certificate name)
    // certificateFile: undefined, // Alternative: path to .p12 certificate file
    // certificatePassword: undefined, // Password for .p12 file (use CSC_KEY_PASSWORD env var)

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
     * Verify signing: signtool verify /pa /v path\to\BlinkTrack-Setup.exe
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
    owner: "Benedict-Carling",
    repo: "eyeryhthm",
    releaseType: "release",
  },
};

module.exports = config;
