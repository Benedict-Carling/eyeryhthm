import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist-electron/**",
    "release/**",
    "public/**",
    "next-env.d.ts",
  ]),
  {
    // Configure React Compiler ESLint rules
    // These rules help identify code the compiler can't optimize, but violations
    // don't break the build - the compiler safely skips those components.
    // Downgrade errors to warnings for patterns that are valid but not optimizable.
    rules: {
      // setState in effects is sometimes necessary for external system sync
      "react-hooks/set-state-in-effect": "warn",
      // Animation frame patterns and canvas manipulation are valid but not optimizable
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
