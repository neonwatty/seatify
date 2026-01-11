import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test artifacts
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
  ]),
  // Relax rules for migrated components (to be cleaned up over time)
  {
    rules: {
      // Allow unescaped entities in JSX (common in migrated content)
      "react/no-unescaped-entities": "warn",
      // Allow any in specific cases during migration
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
    },
  },
]);

export default eslintConfig;
